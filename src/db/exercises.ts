import { uid } from '../lib/id'
import { db } from './db'
import type { Exercise } from './types'

export type ExerciseInput = Pick<Exercise, 'name' | 'muscle' | 'equipment' | 'isCompound'>

export async function addCustomExercise(input: ExerciseInput): Promise<string> {
  const id = `custom-${uid()}`
  await db.exercises.add({ ...input, name: input.name.trim(), id, custom: true })
  return id
}

export async function updateCustomExercise(id: string, patch: Partial<ExerciseInput>): Promise<void> {
  const ex = await db.exercises.get(id)
  if (!ex?.custom) return
  await db.exercises.update(id, { ...patch, ...(patch.name !== undefined ? { name: patch.name.trim() } : {}) })
}

/**
 * Deletes a custom exercise and removes it from split days. Refuses (returns false) when it has
 * logged sets, so workout history never points at a missing exercise.
 */
export async function deleteCustomExercise(id: string): Promise<boolean> {
  return db.transaction('rw', db.exercises, db.sets, db.splitDays, async () => {
    const ex = await db.exercises.get(id)
    if (!ex?.custom) return false
    if ((await db.sets.where('exerciseId').equals(id).count()) > 0) return false
    const days = await db.splitDays.toArray()
    for (const d of days) {
      if (d.exercises.some((e) => e.exerciseId === id)) {
        await db.splitDays.update(d.id, { exercises: d.exercises.filter((e) => e.exerciseId !== id) })
      }
    }
    await db.exercises.delete(id)
    return true
  })
}
