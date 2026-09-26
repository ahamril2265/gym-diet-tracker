import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { initDb } from './init'
import type { SplitDay } from './types'
import {
  addExercise,
  addSet,
  deleteWorkout,
  finishWorkout,
  getActiveWorkout,
  historyBestsFor,
  previousSetsFor,
  removeExercise,
  replaceExercise,
  startWorkout,
  updateSet,
} from './workouts'

const day: SplitDay = {
  id: 'day-push',
  splitId: 'split',
  name: 'Push',
  order: 0,
  exercises: [
    { exerciseId: 'bench-press', sets: 3, repMin: 6, repMax: 8 },
    { exerciseId: 'lateral-raise', sets: 2, repMin: 12, repMax: 15 },
  ],
}

const setsOf = async (workoutId: string, exerciseId: string) =>
  (await db.sets.where('workoutId').equals(workoutId).toArray())
    .filter((s) => s.exerciseId === exerciseId)
    .sort((a, b) => a.order - b.order)

/** Logs every set of an exercise with the given numbers and ticks it. */
async function logAll(workoutId: string, exerciseId: string, kg: number, reps: number, at: number) {
  for (const [i, s] of (await setsOf(workoutId, exerciseId)).entries()) {
    await updateSet(s.id, { kg, reps, done: true, completedAt: at + i })
  }
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await initDb(db)
  await db.splitDays.put(day)
})

describe('workout lifecycle', () => {
  it('starts from a split day with the planned exercises, targets and empty sets', async () => {
    const id = await startWorkout('day-push', new Date(2026, 8, 21, 18, 0))
    const w = (await db.workouts.get(id))!
    expect(w.name).toBe('Push')
    expect(w.date).toBe('2026-09-21')
    expect(w.exerciseOrder).toEqual(['bench-press', 'lateral-raise'])
    expect(w.targets['bench-press']).toEqual({ sets: 3, repMin: 6, repMax: 8 })
    const bench = await setsOf(id, 'bench-press')
    expect(bench).toHaveLength(3)
    expect(bench.every((s) => s.kg === null && s.reps === null && !s.done)).toBe(true)
  })

  it('returns the in-progress workout instead of starting a second one', async () => {
    const a = await startWorkout('day-push')
    const b = await startWorkout(null)
    expect(b).toBe(a)
    expect((await getActiveWorkout())?.id).toBe(a)
  })

  it('finishing drops unticked sets and exercises with nothing logged', async () => {
    const id = await startWorkout('day-push', new Date(2026, 8, 21, 18, 0))
    const [first] = await setsOf(id, 'bench-press')
    await updateSet(first!.id, { kg: 100, reps: 5, done: true, completedAt: Date.now() })
    await finishWorkout(id, new Date(2026, 8, 21, 19, 0).getTime())
    const w = (await db.workouts.get(id))!
    expect(w.endedAt).not.toBeNull()
    expect(w.exerciseOrder).toEqual(['bench-press'])
    expect(await db.sets.where('workoutId').equals(id).count()).toBe(1)
    expect(await getActiveWorkout()).toBeUndefined()
  })

  it('prefills the next session from the last one and exposes it as PREVIOUS', async () => {
    const monday = new Date(2026, 8, 21, 18, 0)
    const first = await startWorkout('day-push', monday)
    await logAll(first, 'bench-press', 100, 5, monday.getTime() + 60_000)
    await finishWorkout(first, monday.getTime() + 3_600_000)

    const thursday = new Date(2026, 8, 24, 18, 0)
    const second = await startWorkout('day-push', thursday)
    const bench = await setsOf(second, 'bench-press')
    expect(bench.map((s) => [s.kg, s.reps])).toEqual([
      [100, 5],
      [100, 5],
      [100, 5],
    ])
    // Lateral raise was never logged: still empty.
    expect((await setsOf(second, 'lateral-raise')).every((s) => s.kg === null)).toBe(true)

    const w = (await db.workouts.get(second))!
    const prev = await previousSetsFor('bench-press', w)
    expect(prev).toHaveLength(3)
    expect(prev.every((s) => s.workoutId === first)).toBe(true)
  })

  it('builds history bests only from sessions before the one being viewed', async () => {
    const d1 = new Date(2026, 8, 21, 18, 0)
    const w1 = await startWorkout('day-push', d1)
    await logAll(w1, 'bench-press', 100, 5, d1.getTime() + 1000)
    await finishWorkout(w1, d1.getTime() + 3_600_000)

    const d2 = new Date(2026, 8, 24, 18, 0)
    const w2 = await startWorkout('day-push', d2)
    await logAll(w2, 'bench-press', 110, 5, d2.getTime() + 1000)
    await finishWorkout(w2, d2.getTime() + 3_600_000)

    const bests1 = await historyBestsFor('bench-press', (await db.workouts.get(w1))!)
    const bests2 = await historyBestsFor('bench-press', (await db.workouts.get(w2))!)
    expect(bests1.count).toBe(0)
    expect(bests2.kgByReps[5]).toBe(100)
  })

  it('adds, replaces and removes exercises and sets', async () => {
    const id = await startWorkout('day-push')
    await addExercise(id, 'dips')
    let w = (await db.workouts.get(id))!
    expect(w.exerciseOrder).toEqual(['bench-press', 'lateral-raise', 'dips'])
    expect(await setsOf(id, 'dips')).toHaveLength(3)

    await replaceExercise(id, 'lateral-raise', 'cable-lateral-raise')
    w = (await db.workouts.get(id))!
    expect(w.exerciseOrder).toEqual(['bench-press', 'cable-lateral-raise', 'dips'])
    expect(await setsOf(id, 'lateral-raise')).toHaveLength(0)
    expect(await setsOf(id, 'cable-lateral-raise')).toHaveLength(2) // keeps the planned set count

    await addSet(id, 'dips')
    expect(await setsOf(id, 'dips')).toHaveLength(4)

    await removeExercise(id, 'dips')
    w = (await db.workouts.get(id))!
    expect(w.exerciseOrder).toEqual(['bench-press', 'cable-lateral-raise'])
    expect(w.targets.dips).toBeUndefined()
    expect(await setsOf(id, 'dips')).toHaveLength(0)
  })

  it('deleting a workout removes its sets', async () => {
    const id = await startWorkout('day-push')
    await deleteWorkout(id)
    expect(await db.workouts.count()).toBe(0)
    expect(await db.sets.count()).toBe(0)
  })
})
