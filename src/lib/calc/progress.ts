import type { BodyWeight, Exercise, FoodLog, ISODate, MacroTargets, Muscle, Workout, WorkoutSet } from '../../db/types'
import { addDays, fromISODate } from '../date'
import { detectPRs, emptyBests, epley1RM, isCountedSet, volume, withSets, type Bests, type PRKind } from './strength'

const r1 = (n: number) => Math.round(n * 10) / 10

// ---------------------------------------------------------------- Body weight

export interface TrendPoint {
  date: ISODate
  kg: number
  /** Mean of all weigh-ins in the 7 calendar days ending on this date. */
  trend: number
}

/** 7-day moving average over calendar days (gaps are fine: it averages whatever weigh-ins fall in the window). */
export function movingAverage(points: BodyWeight[], windowDays = 7): TrendPoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  return sorted.map((p) => {
    const from = addDays(p.date, -(windowDays - 1))
    const inWindow = sorted.filter((q) => q.date >= from && q.date <= p.date)
    const trend = inWindow.reduce((s, q) => s + q.kg, 0) / inWindow.length
    return { date: p.date, kg: p.kg, trend: Math.round(trend * 100) / 100 }
  })
}

export interface WeightSummary {
  latest: TrendPoint | null
  /** Trend change since the start of this month (vs the last trend before the 1st, or the month's first weigh-in). */
  monthChange: number | null
}

export function weightSummary(series: TrendPoint[], today: ISODate): WeightSummary {
  const latest = series[series.length - 1] ?? null
  if (!latest || series.length < 2) return { latest, monthChange: null }
  const monthStart = `${today.slice(0, 7)}-01`
  const before = [...series].reverse().find((p) => p.date < monthStart)
  const baseline = before ?? series.find((p) => p.date >= monthStart)
  if (!baseline || baseline === latest) return { latest, monthChange: null }
  return { latest, monthChange: Math.round((latest.trend - baseline.trend) * 100) / 100 }
}

// ---------------------------------------------------------------- Weeks

/** Monday of the week containing `iso`. */
export function weekStart(iso: ISODate): ISODate {
  const dow = fromISODate(iso).getDay() // 0 = Sun
  return addDays(iso, dow === 0 ? -6 : 1 - dow)
}

// ---------------------------------------------------------------- Strength

export interface PrEvent {
  workoutId: string
  date: ISODate
  exerciseId: string
  kg: number
  reps: number
  e1rm: number
  kinds: PRKind[]
}

const byStart = (a: Workout, b: Workout) => a.startedAt - b.startedAt

/** Every PR ever set, oldest first, replaying workouts in order with running personal bests. */
export function prHistory(workouts: Workout[], sets: WorkoutSet[]): PrEvent[] {
  const setsByWorkout = groupBy(sets, (s) => s.workoutId)
  const bests = new Map<string, Bests>()
  const events: PrEvent[] = []
  for (const w of [...workouts].filter((x) => x.endedAt !== null).sort(byStart)) {
    const own = setsByWorkout.get(w.id) ?? []
    for (const [exerciseId, exSets] of groupBy(own, (s) => s.exerciseId)) {
      const ordered = exSets.sort((a, b) => a.order - b.order)
      const history = bests.get(exerciseId) ?? emptyBests()
      for (const [setId, kinds] of detectPRs(history, ordered)) {
        const s = ordered.find((x) => x.id === setId)!
        events.push({ workoutId: w.id, date: w.date, exerciseId, kg: s.kg!, reps: s.reps!, e1rm: epley1RM(s.kg!, s.reps!), kinds })
      }
      bests.set(exerciseId, withSets(history, ordered))
    }
  }
  return events
}

export function finishedSince(workouts: Workout[], from: ISODate): Workout[] {
  return workouts.filter((w) => w.endedAt !== null && w.date >= from)
}

export interface VolumeChange {
  last7: number
  prev7: number
  /** % change, or null when the previous 7 days had no volume. */
  pct: number | null
}

/** Volume in the last 7 days (incl. today) vs the 7 days before. */
export function volumeChange(workouts: Workout[], sets: WorkoutSet[], today: ISODate): VolumeChange {
  const ids = (from: ISODate, to: ISODate) =>
    new Set(workouts.filter((w) => w.endedAt !== null && w.date >= from && w.date <= to).map((w) => w.id))
  const recent = ids(addDays(today, -6), today)
  const previous = ids(addDays(today, -13), addDays(today, -7))
  const last7 = volume(sets.filter((s) => recent.has(s.workoutId)))
  const prev7 = volume(sets.filter((s) => previous.has(s.workoutId)))
  return { last7, prev7, pct: prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : null }
}

export interface E1rmPoint {
  date: ISODate
  e1rm: number
  kg: number
  reps: number
}

/** Best estimated 1RM per training day for one exercise, from `from` onwards. */
export function e1rmSeries(exerciseId: string, workouts: Workout[], sets: WorkoutSet[], from: ISODate): E1rmPoint[] {
  const dateOf = new Map(workouts.filter((w) => w.endedAt !== null).map((w) => [w.id, w.date]))
  const bestByDate = new Map<ISODate, E1rmPoint>()
  for (const s of sets) {
    const date = dateOf.get(s.workoutId)
    if (!date || date < from || s.exerciseId !== exerciseId || !isCountedSet(s) || s.kg <= 0) continue
    const e = epley1RM(s.kg, s.reps)
    const cur = bestByDate.get(date)
    if (!cur || e > cur.e1rm) bestByDate.set(date, { date, e1rm: r1(e), kg: s.kg, reps: s.reps })
  }
  return [...bestByDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Gain over the window: best e1RM in its last 2 weeks vs best in its first 2 weeks, so one light or deload
 * session at either end doesn't flip the trend.
 */
export function seriesGain(points: { date: ISODate; e1rm: number }[], edgeDays = 14): { kg: number; pct: number } | null {
  if (points.length < 2) return null
  const firstDate = points[0]!.date
  const lastDate = points[points.length - 1]!.date
  if (firstDate === lastDate) return null
  const startBest = Math.max(...points.filter((p) => p.date <= addDays(firstDate, edgeDays - 1)).map((p) => p.e1rm))
  const endBest = Math.max(...points.filter((p) => p.date >= addDays(lastDate, -(edgeDays - 1))).map((p) => p.e1rm))
  return { kg: r1(endBest - startBest), pct: startBest > 0 ? r1(((endBest - startBest) / startBest) * 100) : 0 }
}

/** Clean axis ticks (steps of 1, 2, 2.5 or 5 × 10ⁿ) covering [min, max] in about `count` intervals. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  if (max <= min) max = min + 1
  const raw = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 1e6; v += step) ticks.push(Math.round(v * 1000) / 1000)
  return ticks
}

/** Exercises with logged history, most sessions first (for the 1RM chart picker). */
export function exercisesByFrequency(workouts: Workout[], sets: WorkoutSet[]): { exerciseId: string; sessions: number }[] {
  const finished = new Set(workouts.filter((w) => w.endedAt !== null).map((w) => w.id))
  const sessions = new Map<string, Set<string>>()
  for (const s of sets) {
    if (!finished.has(s.workoutId) || !isCountedSet(s) || s.kg <= 0) continue
    if (!sessions.has(s.exerciseId)) sessions.set(s.exerciseId, new Set())
    sessions.get(s.exerciseId)!.add(s.workoutId)
  }
  return [...sessions.entries()].map(([exerciseId, w]) => ({ exerciseId, sessions: w.size })).sort((a, b) => b.sessions - a.sessions)
}

export const SET_TARGET = { min: 10, max: 20 } as const

/** Ticked working sets per primary muscle, between two dates (inclusive). */
export function setsPerMuscle(
  workouts: Workout[],
  sets: WorkoutSet[],
  exercises: Map<string, Exercise>,
  from: ISODate,
  to: ISODate,
): Partial<Record<Muscle, number>> {
  const ids = new Set(workouts.filter((w) => w.endedAt !== null && w.date >= from && w.date <= to).map((w) => w.id))
  const out: Partial<Record<Muscle, number>> = {}
  for (const s of sets) {
    if (!ids.has(s.workoutId) || !isCountedSet(s)) continue
    const m = exercises.get(s.exerciseId)?.muscle
    if (m) out[m] = (out[m] ?? 0) + 1
  }
  return out
}

export type ZoneStatus = 'below' | 'in' | 'above'

export function zoneStatus(n: number, zone: { min: number; max: number } = SET_TARGET): ZoneStatus {
  return n < zone.min ? 'below' : n > zone.max ? 'above' : 'in'
}

export interface HeatCell {
  date: ISODate
  /** Ticked working sets that day (0 = rest). */
  sets: number
  trained: boolean
  future: boolean
}

/** `weeks` columns of Mon–Sun cells, oldest first, ending with the current week. */
export function heatmap(workouts: Workout[], sets: WorkoutSet[], today: ISODate, weeks = 12): HeatCell[][] {
  const finished = workouts.filter((w) => w.endedAt !== null)
  const trainedDays = new Set(finished.map((w) => w.date))
  const dateOf = new Map(finished.map((w) => [w.id, w.date]))
  const setsByDate = new Map<ISODate, number>()
  for (const s of sets) {
    const d = dateOf.get(s.workoutId)
    if (d && isCountedSet(s)) setsByDate.set(d, (setsByDate.get(d) ?? 0) + 1)
  }
  const firstMonday = addDays(weekStart(today), -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(firstMonday, w * 7 + d)
      return { date, sets: setsByDate.get(date) ?? 0, trained: trainedDays.has(date), future: date > today }
    }),
  )
}

/** Intensity level 0–4 for a heat cell (0 = no workout). */
export function heatLevel(cell: HeatCell): 0 | 1 | 2 | 3 | 4 {
  if (!cell.trained) return 0
  if (cell.sets >= 20) return 4
  if (cell.sets >= 14) return 3
  if (cell.sets >= 8) return 2
  return 1
}

// ---------------------------------------------------------------- Nutrition

export interface NutritionStats {
  /** Complete days (before today) with at least one entry, within the window. */
  loggedDays: number
  avgKcal: number | null
  avgProtein: number | null
  /** kcal within ±10 % of target and protein ≥ 90 % of target. */
  onTargetDays: number
}

export const ON_TARGET = { kcalTolerance: 0.1, proteinMin: 0.9 } as const

/** Averages over logged days in the `days` complete days before today (today isn't over yet). */
export function nutritionStats(logs: FoodLog[], targets: MacroTargets, today: ISODate, days: number): NutritionStats {
  const from = addDays(today, -days)
  const perDay = new Map<ISODate, { kcal: number; protein: number }>()
  for (const l of logs) {
    if (l.date < from || l.date >= today) continue
    const d = perDay.get(l.date) ?? { kcal: 0, protein: 0 }
    d.kcal += l.macros.kcal
    d.protein += l.macros.protein
    perDay.set(l.date, d)
  }
  const list = [...perDay.values()]
  if (list.length === 0) return { loggedDays: 0, avgKcal: null, avgProtein: null, onTargetDays: 0 }
  const onTarget = list.filter(
    (d) => Math.abs(d.kcal - targets.kcal) <= targets.kcal * ON_TARGET.kcalTolerance && d.protein >= targets.protein * ON_TARGET.proteinMin,
  ).length
  return {
    loggedDays: list.length,
    avgKcal: Math.round(list.reduce((s, d) => s + d.kcal, 0) / list.length),
    avgProtein: Math.round(list.reduce((s, d) => s + d.protein, 0) / list.length),
    onTargetDays: onTarget,
  }
}

// ---------------------------------------------------------------- helpers

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const it of items) {
    const k = key(it)
    const list = m.get(k)
    if (list) list.push(it)
    else m.set(k, [it])
  }
  return m
}

