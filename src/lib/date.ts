import type { ISODate } from '../db/types'

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar date as `YYYY-MM-DD` (never UTC, so late-night logs land on the right day). */
export function toISODate(d: Date = new Date()): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Parses `YYYY-MM-DD` as local midnight. */
export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Whole calendar days from `a` to `b` (positive when `b` is later). DST-safe. */
export function daysBetween(a: ISODate, b: ISODate): number {
  const ms = Date.UTC(...ymd(b)) - Date.UTC(...ymd(a))
  return Math.round(ms / 86_400_000)
}

function ymd(iso: ISODate): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number)
  return [y ?? 1970, (m ?? 1) - 1, d ?? 1]
}

const WEEKDAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const
const MONTH = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const

/** "SAT · 26 SEP" */
export function formatHeaderDate(d: Date = new Date()): string {
  return `${WEEKDAY[d.getDay()]} · ${d.getDate()} ${MONTH[d.getMonth()]}`
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
/** Display order for week pickers: Monday first. Values are `Date#getDay()` indexes. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const
