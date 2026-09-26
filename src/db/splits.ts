import { uid } from '../lib/id'
import { db } from './db'
import { instantiateTemplate, type SplitTemplate } from './seed/splitTemplates'
import type { Split, SplitDay } from './types'

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
