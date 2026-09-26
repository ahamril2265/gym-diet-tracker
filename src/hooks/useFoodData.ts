import { useLiveQuery } from 'dexie-react-hooks'
import { useSearchParams } from 'react-router'
import { db } from '../db/db'
import type { BodyWeight, FoodLog, ISODate, Meal } from '../db/types'
import { MEALS } from '../lib/calc/nutrition'
import { toISODate } from '../lib/date'

/** Entries for one day, oldest first. */
export function useDayLogs(date: ISODate): FoodLog[] | undefined {
  return useLiveQuery(() => db.foodLogs.where('date').equals(date).sortBy('createdAt'), [date])
}

/** kcal per day for a set of dates (for the date strip). */
export function useKcalByDate(dates: ISODate[]): Record<ISODate, number> | undefined {
  const key = dates.join(',')
  return useLiveQuery(async () => {
    const logs = await db.foodLogs.where('date').anyOf(dates).toArray()
    const out: Record<ISODate, number> = {}
    for (const l of logs) out[l.date] = (out[l.date] ?? 0) + l.macros.kcal
    return out
  }, [key])
}

export function useWater(date: ISODate): number | undefined {
  return useLiveQuery(async () => (await db.water.get(date))?.glasses ?? 0, [date])
}

export function useLatestWeight(): BodyWeight | null | undefined {
  return useLiveQuery(async () => (await db.bodyWeights.orderBy('date').last()) ?? null)
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

/** The `?d=` date on the Eat screens (defaults to today), with a setter that keeps history tidy. */
export function useSelectedDate(): [ISODate, (d: ISODate) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('d')
  const today = toISODate()
  const date = raw && ISO_RE.test(raw) && raw <= today ? raw : today
  const set = (d: ISODate) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        if (d === today) next.delete('d')
        else next.set('d', d)
        return next
      },
      { replace: true },
    )
  return [date, set]
}

export function parseMeal(v: string | null): Meal | null {
  return v && (MEALS as string[]).includes(v) ? (v as Meal) : null
}
