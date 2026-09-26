import { MUSCLE_LABEL } from '../../db/seed/exercises'
import type { Exercise, Muscle, SplitExercise } from '../../db/types'

/** "Chest & Triceps" from the two muscles with the most planned sets, or "My routine". */
export function suggestRoutineName(items: SplitExercise[], exercises: Map<string, Exercise>): string {
  const sets = new Map<Muscle, number>()
  for (const e of items) {
    const m = exercises.get(e.exerciseId)?.muscle
    if (m) sets.set(m, (sets.get(m) ?? 0) + e.sets)
  }
  const top = [...sets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)
  return top.length ? top.map(([m]) => MUSCLE_LABEL[m]).join(' & ') : 'My routine'
}
