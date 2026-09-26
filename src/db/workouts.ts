import Dexie from 'dexie'
import { bestsOf, planSets, type Bests } from '../lib/calc/strength'
import { toISODate } from '../lib/date'
import { uid } from '../lib/id'
import { db } from './db'
import type { Workout, WorkoutSet } from './types'

export const DEFAULT_TARGET = { sets: 3, repMin: 8, repMax: 12 } as const

function omit<V>(rec: Record<string, V>, key: string): Record<string, V> {
  const copy = { ...rec }
  delete copy[key]
  return copy
}

/** The unfinished workout, if one is in progress (there is at most one). */
export async function getActiveWorkout(): Promise<Workout | undefined> {
  return db.workouts
    .orderBy('startedAt')
    .reverse()
    .filter((w) => w.endedAt === null)
    .first()
}

/** All ticked sets ever logged for an exercise, newest first. */
async function doneSetsFor(exerciseId: string): Promise<WorkoutSet[]> {
  const sets = await db.sets
    .where('[exerciseId+date]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .reverse()
    .toArray()
  return sets.filter((s) => s.done)
}

/** Did `s` happen before `workout` started? (Earlier day, or earlier the same day.) */
function isBefore(s: WorkoutSet, workout: Pick<Workout, 'id' | 'date' | 'startedAt'>): boolean {
  if (s.workoutId === workout.id) return false
  if (s.date !== workout.date) return s.date < workout.date
  return (s.completedAt ?? 0) < workout.startedAt
}

/**
 * Sets from the most recent earlier session that included this exercise ("PREVIOUS").
 * With no `workout`, looks at every past session.
 */
export async function previousSetsFor(
  exerciseId: string,
  workout?: Pick<Workout, 'id' | 'date' | 'startedAt'>,
): Promise<WorkoutSet[]> {
  const sets = (await doneSetsFor(exerciseId)).filter((s) => !workout || isBefore(s, workout))
  // Pick the session whose latest ticked set is newest.
  let latestId: string | null = null
  let latestKey = ''
  for (const s of sets) {
    const key = `${s.date}|${String(s.completedAt ?? 0).padStart(15, '0')}`
    if (key > latestKey) {
      latestKey = key
      latestId = s.workoutId
    }
  }
  return latestId ? sets.filter((s) => s.workoutId === latestId).sort((a, b) => a.order - b.order) : []
}

/** Personal bests from everything logged before `workout`. */
export async function historyBestsFor(exerciseId: string, workout: Pick<Workout, 'id' | 'date' | 'startedAt'>): Promise<Bests> {
  const sets = (await doneSetsFor(exerciseId)).filter((s) => isBefore(s, workout))
  return bestsOf(sets)
}

/** PREVIOUS sets and personal bests for one exercise, relative to `workout`, in one read. */
export async function exerciseHistory(
  exerciseId: string,
  workout: Pick<Workout, 'id' | 'date' | 'startedAt'>,
): Promise<{ previous: WorkoutSet[]; bests: Bests }> {
  const [previous, bests] = await Promise.all([previousSetsFor(exerciseId, workout), historyBestsFor(exerciseId, workout)])
  return { previous, bests }
}

async function plannedSetRows(
  workout: Pick<Workout, 'id' | 'date' | 'startedAt'>,
  exerciseId: string,
  targetSets: number,
): Promise<WorkoutSet[]> {
  const previous = await previousSetsFor(exerciseId, workout)
  return planSets(previous, targetSets).map((p, order) => ({
    id: uid(),
    workoutId: workout.id,
    exerciseId,
    date: workout.date,
    order,
    kg: p.kg,
    reps: p.reps,
    isWarmup: p.isWarmup,
    done: false,
  }))
}

/**
 * Starts a workout for a split day (or an empty one) with sets prefilled from last time.
 * If a workout is already in progress, returns that one instead of starting a second.
 */
export async function startWorkout(splitDayId: string | null, now = new Date()): Promise<string> {
  return db.transaction('rw', [db.workouts, db.sets, db.splitDays], async () => {
    const active = await getActiveWorkout()
    if (active) return active.id

    const day = splitDayId ? await db.splitDays.get(splitDayId) : undefined
    const plan = (day?.exercises ?? []).filter(
      (e, i, all) => all.findIndex((x) => x.exerciseId === e.exerciseId) === i,
    )
    const workout: Workout = {
      id: uid(),
      date: toISODate(now),
      splitDayId: day?.id ?? null,
      name: day?.name ?? 'Workout',
      startedAt: now.getTime(),
      endedAt: null,
      notes: '',
      exerciseOrder: plan.map((e) => e.exerciseId),
      exerciseNotes: {},
      targets: Object.fromEntries(plan.map((e) => [e.exerciseId, { sets: e.sets, repMin: e.repMin, repMax: e.repMax }])),
    }
    const sets: WorkoutSet[] = []
    for (const e of plan) sets.push(...(await plannedSetRows(workout, e.exerciseId, e.sets)))
    await db.workouts.add(workout)
    await db.sets.bulkAdd(sets)
    return workout.id
  })
}

export async function addExercise(workoutId: string, exerciseId: string): Promise<void> {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    const w = await db.workouts.get(workoutId)
    if (!w || w.exerciseOrder.includes(exerciseId)) return
    const rows = await plannedSetRows(w, exerciseId, DEFAULT_TARGET.sets)
    await db.workouts.update(workoutId, {
      exerciseOrder: [...w.exerciseOrder, exerciseId],
      targets: { ...w.targets, [exerciseId]: { ...DEFAULT_TARGET } },
    })
    await db.sets.bulkAdd(rows)
  })
}

/** Swaps an exercise in place; its sets are replaced with the new exercise's prefilled sets. */
export async function replaceExercise(workoutId: string, oldId: string, newId: string): Promise<void> {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    const w = await db.workouts.get(workoutId)
    if (!w || !w.exerciseOrder.includes(oldId) || oldId === newId) return
    if (w.exerciseOrder.includes(newId)) {
      await removeExerciseInTx(w, oldId)
      return
    }
    const target = w.targets[oldId] ?? { ...DEFAULT_TARGET }
    await db.sets.where('workoutId').equals(workoutId).and((s) => s.exerciseId === oldId).delete()
    await db.sets.bulkAdd(await plannedSetRows(w, newId, target.sets))
    await db.workouts.update(workoutId, {
      exerciseOrder: w.exerciseOrder.map((id) => (id === oldId ? newId : id)),
      targets: { ...omit(w.targets, oldId), [newId]: target },
      exerciseNotes: omit(w.exerciseNotes, oldId),
    })
  })
}

async function removeExerciseInTx(w: Workout, exerciseId: string) {
  await db.sets.where('workoutId').equals(w.id).and((s) => s.exerciseId === exerciseId).delete()
  await db.workouts.update(w.id, {
    exerciseOrder: w.exerciseOrder.filter((id) => id !== exerciseId),
    targets: omit(w.targets, exerciseId),
    exerciseNotes: omit(w.exerciseNotes, exerciseId),
  })
}

export async function removeExercise(workoutId: string, exerciseId: string): Promise<void> {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    const w = await db.workouts.get(workoutId)
    if (w) await removeExerciseInTx(w, exerciseId)
  })
}

/** Adds a working set at the end, copying the last set's numbers. */
export async function addSet(workoutId: string, exerciseId: string): Promise<void> {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    const w = await db.workouts.get(workoutId)
    if (!w) return
    const sets = (await db.sets.where('workoutId').equals(workoutId).toArray())
      .filter((s) => s.exerciseId === exerciseId)
      .sort((a, b) => a.order - b.order)
    const last = sets[sets.length - 1]
    await db.sets.add({
      id: uid(),
      workoutId,
      exerciseId,
      date: w.date,
      order: (last?.order ?? -1) + 1,
      kg: last?.kg ?? null,
      reps: last?.reps ?? null,
      isWarmup: false,
      done: false,
    })
  })
}

export async function updateSet(id: string, patch: Partial<Pick<WorkoutSet, 'kg' | 'reps' | 'isWarmup' | 'done' | 'completedAt' | 'rpe'>>) {
  await db.sets.update(id, patch)
}

export async function deleteSet(id: string) {
  await db.sets.delete(id)
}

export async function setExerciseNote(workoutId: string, exerciseId: string, note: string) {
  await db.transaction('rw', db.workouts, async () => {
    const w = await db.workouts.get(workoutId)
    if (!w) return
    const exerciseNotes = { ...w.exerciseNotes }
    if (note.trim()) exerciseNotes[exerciseId] = note
    else delete exerciseNotes[exerciseId]
    await db.workouts.update(workoutId, { exerciseNotes })
  })
}

/** Saves the session: drops unticked sets and exercises with nothing logged, stamps the end time. */
export async function finishWorkout(workoutId: string, now = Date.now()): Promise<void> {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    const w = await db.workouts.get(workoutId)
    if (!w || w.endedAt !== null) return
    const sets = await db.sets.where('workoutId').equals(workoutId).toArray()
    await db.sets.bulkDelete(sets.filter((s) => !s.done || s.reps === null).map((s) => s.id))
    const logged = new Set(sets.filter((s) => s.done && s.reps !== null).map((s) => s.exerciseId))
    await db.workouts.update(workoutId, {
      endedAt: now,
      exerciseOrder: w.exerciseOrder.filter((id) => logged.has(id)),
    })
  })
}

/** Removes a workout and all its sets (discarding an in-progress one, or deleting from history). */
export async function deleteWorkout(workoutId: string): Promise<void> {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    await db.sets.where('workoutId').equals(workoutId).delete()
    await db.workouts.delete(workoutId)
  })
}
