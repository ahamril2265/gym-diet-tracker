import type { ISODate } from '../../db/types'
import { addDays, fromISODate } from '../date'

/**
 * Streak = consecutive days (ending today) where you either trained, or the split scheduled a rest day.
 *
 * - Today only counts once it's done: an untrained training day doesn't break the streak yet.
 * - Counting stops at your first ever workout, so scheduled rest days before you started don't count.
 * - The current split's weekly schedule is used for past days too.
 */
export function computeStreak(
  today: ISODate,
  workoutDates: Iterable<ISODate>,
  /** 7 entries indexed by `Date#getDay()`; `null` = rest. `null` schedule = no rest days. */
  schedule: (string | null)[] | null,
): number {
  const trained = new Set(workoutDates)
  if (trained.size === 0) return 0
  const first = [...trained].sort()[0]!
  const isRest = (d: ISODate) => schedule !== null && (schedule[fromISODate(d).getDay()] ?? null) === null
  const ok = (d: ISODate) => trained.has(d) || isRest(d)

  let day = ok(today) ? today : addDays(today, -1)
  let count = 0
  while (day >= first && ok(day)) {
    count++
    day = addDays(day, -1)
  }
  return count
}
