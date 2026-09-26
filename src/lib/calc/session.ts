import type { Workout, WorkoutSet } from '../../db/types'
import { detectPRs, epley1RM, isCountedSet, volume, type Bests, type PRKind } from './strength'

export interface SessionPR {
  exerciseId: string
  setId: string
  kg: number
  reps: number
  e1rm: number
  kinds: PRKind[]
}

export interface SessionSummary {
  durationMs: number
  volumeKg: number
  workingSets: number
  prs: SessionPR[]
}

/** Duration, volume, working-set count and PRs for one workout. `bests` = history before it. */
export function summarizeSession(
  workout: Pick<Workout, 'startedAt' | 'endedAt' | 'exerciseOrder'>,
  sets: WorkoutSet[],
  bests: Record<string, Bests>,
  now = Date.now(),
): SessionSummary {
  const prs: SessionPR[] = []
  for (const exerciseId of workout.exerciseOrder) {
    const own = sets.filter((s) => s.exerciseId === exerciseId).sort((a, b) => a.order - b.order)
    const history = bests[exerciseId]
    if (!history) continue
    for (const [setId, kinds] of detectPRs(history, own)) {
      const s = own.find((x) => x.id === setId)!
      prs.push({ exerciseId, setId, kg: s.kg!, reps: s.reps!, e1rm: epley1RM(s.kg!, s.reps!), kinds })
    }
  }
  return {
    durationMs: (workout.endedAt ?? now) - workout.startedAt,
    volumeKg: volume(sets),
    workingSets: sets.filter(isCountedSet).length,
    prs,
  }
}
