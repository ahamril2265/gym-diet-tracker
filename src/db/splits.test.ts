import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { addCustomExercise, deleteCustomExercise } from './exercises'
import { initDb } from './init'
import { SPLIT_TEMPLATES } from './seed/splitTemplates'
import { applyTemplate, createBlankSplit, deleteRoutine, saveRoutine, saveSplit } from './splits'
import { startWorkout, updateSet } from './workouts'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await initDb(db)
})

describe('splits', () => {
  it('switching template replaces the active split and its days', async () => {
    const first = await applyTemplate(SPLIT_TEMPLATES[0]!)
    const second = await applyTemplate(SPLIT_TEMPLATES[1]!)
    expect((await db.settings.get('app'))?.activeSplitId).toBe(second)
    expect(await db.splits.get(first)).toBeUndefined()
    expect(await db.splitDays.where('splitId').equals(first).count()).toBe(0)
    expect(await db.splitDays.where('splitId').equals(second).count()).toBe(2)
  })

  it('saving deletes removed days and clears schedule slots that pointed at them', async () => {
    const id = await createBlankSplit()
    const split = (await db.splits.get(id))!
    const [dayA] = await db.splitDays.where('splitId').equals(id).toArray()
    const dayB = { id: 'b', splitId: id, name: 'Day B', order: 1, exercises: [] }
    await saveSplit({ ...split, schedule: [null, dayA!.id, 'b', null, null, null, null] }, [dayA!, dayB])
    expect(await db.splitDays.where('splitId').equals(id).count()).toBe(2)

    await saveSplit({ ...split, schedule: [null, dayA!.id, 'b', null, null, null, null] }, [dayA!])
    expect(await db.splitDays.get('b')).toBeUndefined()
    expect((await db.splits.get(id))?.schedule).toEqual([null, dayA!.id, null, null, null, null, null])
  })
})

describe('custom exercises', () => {
  it('can be deleted when unused, and are removed from split days', async () => {
    const exId = await addCustomExercise({ name: '  Landmine Press ', muscle: 'shoulders', equipment: 'barbell', isCompound: true })
    expect((await db.exercises.get(exId))?.name).toBe('Landmine Press')
    await db.splitDays.put({ id: 'd', splitId: 's', name: 'X', order: 0, exercises: [{ exerciseId: exId, sets: 3, repMin: 8, repMax: 12 }] })
    expect(await deleteCustomExercise(exId)).toBe(true)
    expect((await db.splitDays.get('d'))?.exercises).toEqual([])
  })

  it('refuse deletion once they have logged sets, and built-ins are never deleted', async () => {
    const exId = await addCustomExercise({ name: 'Sled Push', muscle: 'quads', equipment: 'machine', isCompound: true })
    await db.splitDays.put({ id: 'd', splitId: 's', name: 'X', order: 0, exercises: [{ exerciseId: exId, sets: 1, repMin: 8, repMax: 8 }] })
    const w = await startWorkout('d')
    const [s] = await db.sets.where('workoutId').equals(w).toArray()
    await updateSet(s!.id, { kg: 50, reps: 8, done: true })
    expect(await deleteCustomExercise(exId)).toBe(false)
    expect(await deleteCustomExercise('bench-press')).toBe(false)
  })
})

describe('routines', () => {
  const bench = { exerciseId: 'bench-press', sets: 4, repMin: 6, repMax: 8 }
  const row = { exerciseId: 'barbell-row', sets: 3, repMin: 8, repMax: 10 }

  it('creates a "My routines" split for your first routine', async () => {
    const id = await saveRoutine({ name: ' Chest & Back ', exercises: [bench, row], weekdays: [1, 4] })
    const settings = await db.settings.get('app')
    const split = (await db.splits.get(settings!.activeSplitId!))!
    expect(split.name).toBe('My routines')
    expect(split.schedule).toEqual([null, id, null, null, id, null, null])
    const day = (await db.splitDays.get(id))!
    expect(day.name).toBe('Chest & Back')
    expect(day.exercises).toEqual([bench, row])
  })

  it('adds routines to your existing split and takes over the chosen weekdays', async () => {
    const splitId = await applyTemplate(SPLIT_TEMPLATES[0]!) // PPL: Mon push … Sat legs, Sun rest
    const before = (await db.splits.get(splitId))!
    const id = await saveRoutine({ name: 'Arms', exercises: [row], weekdays: [0, 3] }) // Sun + Wed
    const after = (await db.splits.get(splitId))!
    expect(after.schedule[0]).toBe(id)
    expect(after.schedule[3]).toBe(id)
    expect(after.schedule[1]).toBe(before.schedule[1]) // Monday untouched
    expect(await db.splitDays.where('splitId').equals(splitId).count()).toBe(4)
    const days = await db.splitDays.where('splitId').equals(splitId).sortBy('order')
    expect(days[days.length - 1]!.id).toBe(id) // appended last
  })

  it('updates in place, can unschedule, and deletes cleanly', async () => {
    const id = await saveRoutine({ name: 'Full body', exercises: [bench], weekdays: [2] })
    await saveRoutine({ id, name: 'Full body B', exercises: [bench, row], weekdays: [] })
    const split = (await db.splits.get((await db.settings.get('app'))!.activeSplitId!))!
    expect(split.schedule.every((d) => d === null)).toBe(true)
    expect((await db.splitDays.get(id))!.name).toBe('Full body B')
    expect(await db.splitDays.count()).toBe(1)

    await saveRoutine({ id, name: 'Full body B', exercises: [bench], weekdays: [5] })
    await deleteRoutine(id)
    expect(await db.splitDays.get(id)).toBeUndefined()
    const after = (await db.splits.get(split.id))!
    expect(after.schedule.every((d) => d === null)).toBe(true)
  })
})
