import type { WeightUnit } from '../db/types'
import { WEEKDAY_SHORT } from './date'
import { round, weightFromKg } from './units'

const pad = (n: number) => String(n).padStart(2, '0')

/** Stopwatch style: "0:45", "12:03", "1:05:09". Negative values clamp to 0. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Human duration: "8 min", "1 h 5 min". */
export function formatDuration(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/** Weight number in the display unit, trimmed: 62.5, 100, 137.8. */
export function formatWeightValue(kg: number, unit: WeightUnit): string {
  const v = round(weightFromKg(kg, unit), unit === 'kg' ? 2 : 1)
  return String(v)
}

/** "62.5 × 8" (or "— " when missing). */
export function formatSet(kg: number | null, reps: number | null, unit: WeightUnit): string {
  if (reps === null) return '—'
  if (kg === null || kg === 0) return `${reps} reps`
  return `${formatWeightValue(kg, unit)} × ${reps}`
}

/** Total volume, e.g. "12,340 kg". */
export function formatVolume(kg: number, unit: WeightUnit): string {
  return `${Math.round(weightFromKg(kg, unit)).toLocaleString('en-IN')} ${unit}`
}

/** "3 × 8–12" or "4 × 5". */
export function formatTarget(t: { sets: number; repMin: number; repMax: number }): string {
  const reps = t.repMin === t.repMax ? `${t.repMin}` : `${t.repMin}–${t.repMax}`
  return `${t.sets} × ${reps}`
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

/** "Sat 26 Sep" (fixed format; some locales print "Sept"). */
export function formatShortDate(d: Date): string {
  return `${WEEKDAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

/** "26 Sep" (for chart axes). */
export function formatDayMonth(d: Date): string {
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}
