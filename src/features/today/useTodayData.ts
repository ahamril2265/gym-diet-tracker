import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { Workout } from '../../db/types'
import { historyBestsFor } from '../../db/workouts'
import { percentChange } from '../../lib/calc/nutrition'
import { summarizeSession, type SessionSummary } from '../../lib/calc/session'
import { computeStreak } from '../../lib/calc/streak'
import type { Bests } from '../../lib/calc/strength'
import { volume } from '../../lib/calc/strength'
import { toISODate } from '../../lib/date'

/** Current streak (see computeStreak). */
export function useStreak(): number | undefined {
  return useLiveQuery(async () => {
    const [workouts, settings] = await Promise.all([db.workouts.filter((w) => w.endedAt !== null).toArray(), db.settings.get('app')])
    const split = settings?.activeSplitId ? await db.splits.get(settings.activeSplitId) : undefined
    return computeStreak(
      toISODate(),
      workouts.map((w) => w.date),
      split?.schedule ?? null,
    )
  })
}

export interface LastSession {
  workout: Workout
  summary: SessionSummary
  /** % change in volume vs the previous session of the same day (or same name), if any. */
  volumeChange: number | null
}

export function useLastSession(): LastSession | null | undefined {
  return useLiveQuery(async () => {
    const finished = await db.workouts
      .orderBy('startedAt')
      .reverse()
      .filter((w) => w.endedAt !== null)
      .limit(30)
      .toArray()
    const last = finished[0]
    if (!last) return null
    const sets = await db.sets.where('workoutId').equals(last.id).toArray()
    const bests: Record<string, Bests> = {}
    await Promise.all(last.exerciseOrder.map(async (id) => (bests[id] = await historyBestsFor(id, last))))
    const summary = summarizeSession(last, sets, bests)
    const previous = finished
      .slice(1)
      .find((w) => (last.splitDayId ? w.splitDayId === last.splitDayId : w.name === last.name))
    let volumeChange: number | null = null
    if (previous) {
      const prevSets = await db.sets.where('workoutId').equals(previous.id).toArray()
      volumeChange = percentChange(volume(prevSets), summary.volumeKg)
    }
    return { workout: last, summary, volumeChange }
  })
}
