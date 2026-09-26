/** Seconds of work assumed per set, on top of the rest period. */
export const SECONDS_PER_SET = 45

export interface PlannedExercise {
  sets: number
  isCompound: boolean
}

/** Rough session length in minutes, rounded to the nearest 5 (e.g. "~55 min"). */
export function estimateSessionMinutes(
  exercises: PlannedExercise[],
  rest: { compoundSec: number; accessorySec: number },
): number {
  const seconds = exercises.reduce((sum, ex) => {
    const restSec = ex.isCompound ? rest.compoundSec : rest.accessorySec
    return sum + ex.sets * (SECONDS_PER_SET + restSec)
  }, 0)
  if (seconds === 0) return 0
  return Math.max(5, Math.round(seconds / 60 / 5) * 5)
}
