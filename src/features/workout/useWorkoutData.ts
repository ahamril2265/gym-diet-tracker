import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { Exercise, Workout, WorkoutSet } from '../../db/types'
import { exerciseHistory } from '../../db/workouts'
import type { Bests } from '../../lib/calc/strength'

export interface WorkoutData {
  workout: Workout
  sets: WorkoutSet[]
  exercises: Map<string, Exercise>
  /** Last session's sets per exercise ("PREVIOUS"). */
  previous: Record<string, WorkoutSet[]>
  /** Personal bests per exercise from before this workout (for PR badges). */
  bests: Record<string, Bests>
}

/** Everything the workout screen needs, live. `undefined` while loading, `null` if not found. */
export function useWorkoutData(id: string | undefined): WorkoutData | null | undefined {
  return useLiveQuery(async () => {
    if (!id) return null
    const workout = await db.workouts.get(id)
    if (!workout) return null
    const [sets, exList] = await Promise.all([
      db.sets.where('workoutId').equals(id).toArray(),
      db.exercises.bulkGet(workout.exerciseOrder),
    ])
    const exercises = new Map(exList.flatMap((e) => (e ? [[e.id, e] as const] : [])))
    const previous: Record<string, WorkoutSet[]> = {}
    const bests: Record<string, Bests> = {}
    await Promise.all(
      workout.exerciseOrder.map(async (exId) => {
        const h = await exerciseHistory(exId, workout)
        previous[exId] = h.previous
        bests[exId] = h.bests
      }),
    )
    return { workout, sets, exercises, previous, bests }
  }, [id])
}
