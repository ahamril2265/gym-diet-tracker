import type { Split, SplitDay } from '../../db/types'

export interface DayPlan {
  /** The split day scheduled for the date, or `null` on a rest day. */
  day: SplitDay | null
  /** The next training day after the date (within a week), if any. */
  next: { day: SplitDay; inDays: number } | null
}

/** What the weekly schedule says for a given date. */
export function planForDate(split: Split, days: SplitDay[], date: Date): DayPlan {
  const byId = new Map(days.map((d) => [d.id, d]))
  const dow = date.getDay()
  const todayId = split.schedule[dow] ?? null
  let next: DayPlan['next'] = null
  for (let i = 1; i <= 7; i++) {
    const id = split.schedule[(dow + i) % 7] ?? null
    const d = id ? byId.get(id) : undefined
    if (d) {
      next = { day: d, inDays: i }
      break
    }
  }
  return { day: todayId ? (byId.get(todayId) ?? null) : null, next }
}
