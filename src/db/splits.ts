import { uid } from '../lib/id'
import { db } from './db'
import { instantiateTemplate, type SplitTemplate } from './seed/splitTemplates'
import type { Split, SplitDay, SplitExercise } from './types'

/** Writes a split and exactly this list of days (days removed from the list are deleted). */
export async function saveSplit(split: Split, days: SplitDay[]): Promise<void> {
  await db.transaction('rw', db.splits, db.splitDays, async () => {
    // A late autosave must not resurrect a split that was just replaced by a template.
    if (!(await db.splits.get(split.id))) return
    const keep = new Set(days.map((d) => d.id))
    const existing = await db.splitDays.where('splitId').equals(split.id).primaryKeys()
    await db.splitDays.bulkDelete(existing.filter((id) => !keep.has(id)))
    await db.splitDays.bulkPut(days.map((d, order) => ({ ...d, splitId: split.id, order })))
    // Schedule entries can only point at days that still exist.
    await db.splits.put({ ...split, schedule: split.schedule.map((id) => (id && keep.has(id) ? id : null)) })
  })
}

async function replaceActive(split: Split, days: SplitDay[]): Promise<string> {
  await db.transaction('rw', db.splits, db.splitDays, db.settings, async () => {
    const settings = await db.settings.get('app')
    const oldId = settings?.activeSplitId
    if (oldId) {
      await db.splitDays.where('splitId').equals(oldId).delete()
      await db.splits.delete(oldId)
    }
    await db.splits.add(split)
    await db.splitDays.bulkAdd(days)
    await db.settings.update('app', { activeSplitId: split.id })
  })
  return split.id
}

/** Replaces the active split with a fresh copy of a template. Past workouts keep their own names. */
export async function applyTemplate(template: SplitTemplate): Promise<string> {
  const { split, days } = instantiateTemplate(template)
  return replaceActive(split, days)
}

/** Replaces the active split with an empty one: a single day and no schedule. */
export async function createBlankSplit(): Promise<string> {
  const splitId = uid()
  const day: SplitDay = { id: uid(), splitId, name: 'Day A', order: 0, exercises: [] }
  return replaceActive({ id: splitId, name: 'My split', schedule: Array(7).fill(null), createdAt: Date.now() }, [day])
}

export interface RoutineInput {
  /** Existing routine (split day) to update; omit to create a new one. */
  id?: string
  name: string
  exercises: SplitExercise[]
  /** `Date#getDay()` indexes this routine should be scheduled on. Other routines on those days are unscheduled. */
  weekdays: number[]
}

/**
 * Creates or updates a routine. Routines are the days of your weekly split, so a new routine is added to
 * the active split (a "My routines" split is created if you don't have one). Returns the routine id.
 */
export async function saveRoutine(input: RoutineInput): Promise<string> {
  return db.transaction('rw', db.splits, db.splitDays, db.settings, async () => {
    const settings = await db.settings.get('app')
    let split = settings?.activeSplitId ? await db.splits.get(settings.activeSplitId) : undefined
    if (!split) {
      split = { id: uid(), name: 'My routines', schedule: Array(7).fill(null), createdAt: Date.now() }
      await db.splits.add(split)
      await db.settings.update('app', { activeSplitId: split.id })
    }
    const existing = input.id ? await db.splitDays.get(input.id) : undefined
    const days = await db.splitDays.where('splitId').equals(split.id).toArray()
    const day: SplitDay = {
      id: existing?.id ?? uid(),
      splitId: split.id,
      name: input.name.trim(),
      order: existing?.order ?? days.reduce((max, d) => Math.max(max, d.order + 1), 0),
      exercises: input.exercises,
    }
    await db.splitDays.put(day)
    const schedule = split.schedule.map((current, dow) =>
      input.weekdays.includes(dow) ? day.id : current === day.id ? null : current,
    )
    await db.splits.update(split.id, { schedule })
    return day.id
  })
}

/** Deletes a routine and clears it from the weekly schedule. Past workouts keep their own copy of the name. */
export async function deleteRoutine(id: string): Promise<void> {
  await db.transaction('rw', db.splits, db.splitDays, async () => {
    const day = await db.splitDays.get(id)
    if (!day) return
    await db.splitDays.delete(id)
    const split = await db.splits.get(day.splitId)
    if (split) await db.splits.update(split.id, { schedule: split.schedule.map((d) => (d === id ? null : d)) })
  })
}
