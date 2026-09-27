import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { Exercise, Workout, WorkoutSet } from '../../db/types'

export interface ProgressData {
  /** Finished workouts only. */
  workouts: Workout[]
  sets: WorkoutSet[]
  exercises: Map<string, Exercise>
}

/** All finished workouts, their sets and the exercise library, live. */
export function useProgressData(): ProgressData | undefined {
  return useLiveQuery(async () => {
    const workouts = await db.workouts.filter((w) => w.endedAt !== null).toArray()
    const [sets, exercises] = await Promise.all([
      db.sets.where('workoutId').anyOf(workouts.map((w) => w.id)).toArray(),
      db.exercises.toArray(),
    ])
    return { workouts, sets, exercises: new Map(exercises.map((e) => [e.id, e])) }
  })
}
