import { describe, expect, it } from 'vitest'
import type { Exercise, FoodLog, Workout, WorkoutSet } from '../../db/types'
import {
  e1rmSeries,
  exercisesByFrequency,
  heatLevel,
  heatmap,
  movingAverage,
  niceTicks,
  nutritionStats,
  prHistory,
  seriesGain,
  setsPerMuscle,
  volumeChange,
  weekStart,
  weightSummary,
  zoneStatus,
} from './progress'

const w = (id: string, date: string, startedAt = Date.parse(`${date}T18:00:00`)): Workout => ({
  id,
  date,
  splitDayId: null,
  name: 'W',
  startedAt,
  endedAt: startedAt + 3_600_000,
  notes: '',
  exerciseOrder: [],
  exerciseNotes: {},
  targets: {},
})

let n = 0
const s = (workoutId: string, exerciseId: string, kg: number, reps: number, extra: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: `s${n++}`,
  workoutId,
  exerciseId,
  date: '',
  order: n,
  kg,
  reps,
  isWarmup: false,
  done: true,
  ...extra,
})

describe('weight trend', () => {
  it('averages weigh-ins in the 7 calendar days ending on each date', () => {
    const t = movingAverage([
      { date: '2026-09-20', kg: 72 },
      { date: '2026-09-21', kg: 71 },
      { date: '2026-09-23', kg: 70 },
      { date: '2026-09-27', kg: 69 },
      { date: '2026-09-28', kg: 68 },
    ])
    expect(t.map((p) => p.trend)).toEqual([72, 71.5, 71, 70, 69])
    // 27th window = 21st–27th → 71, 70, 69; 28th window = 22nd–28th → 70, 69, 68
  })

  it('reports the latest trend and the change since the month began', () => {
    const series = movingAverage([
      { date: '2026-08-30', kg: 74 },
      { date: '2026-09-10', kg: 73 },
      { date: '2026-09-26', kg: 72 },
    ])
    const sum = weightSummary(series, '2026-09-26')
    expect(sum.latest?.trend).toBe(72)
    expect(sum.monthChange).toBe(-2) // 72 now vs 74 (last trend before 1 Sep)
    expect(weightSummary(movingAverage([{ date: '2026-09-26', kg: 70 }]), '2026-09-26').monthChange).toBeNull()
  })
})

describe('weeks', () => {
  it('finds the Monday of the week', () => {
    expect(weekStart('2026-09-26')).toBe('2026-09-21') // Sat → Mon
    expect(weekStart('2026-09-27')).toBe('2026-09-21') // Sun → previous Mon
    expect(weekStart('2026-09-21')).toBe('2026-09-21')
  })
})

describe('strength stats', () => {
  const workouts = [w('a', '2026-09-01'), w('b', '2026-09-08'), w('c', '2026-09-22'), w('d', '2026-09-25')]
  const sets = [
    s('a', 'bench', 100, 5),
    s('a', 'bench', 40, 10, { isWarmup: true }),
    s('b', 'bench', 105, 5), // PR
    s('b', 'bench', 105, 5), // same again: not a second PR
    s('c', 'bench', 100, 8), // e1RM 126.7 > 122.5: PR
    s('c', 'squat', 140, 5), // first squat: baseline only
    s('d', 'squat', 150, 5), // PR
    s('d', 'squat', 150, 5, { done: false }), // unticked: ignored
  ]

  it('replays history to find every PR in order', () => {
    const prs = prHistory(workouts, sets)
    expect(prs.map((p) => `${p.date} ${p.exerciseId} ${p.kg}x${p.reps}`)).toEqual([
      '2026-09-08 bench 105x5',
      '2026-09-22 bench 100x8',
      '2026-09-25 squat 150x5',
    ])
  })

  it('compares volume in the last 7 days with the 7 before', () => {
    const v = volumeChange(workouts, sets, '2026-09-26')
    expect(v.last7).toBe(100 * 8 + 140 * 5 + 150 * 5) // c + d
    expect(v.prev7).toBe(0)
    expect(v.pct).toBeNull()
    const v2 = volumeChange(workouts, sets, '2026-09-14')
    expect(v2.last7).toBe(105 * 5 * 2)
    expect(v2.prev7).toBe(500)
    expect(v2.pct).toBeCloseTo(110)
  })

  it('builds a best-e1RM-per-day series and its gain', () => {
    const series = e1rmSeries('bench', workouts, sets, '2026-09-01')
    expect(series.map((p) => p.e1rm)).toEqual([116.7, 122.5, 126.7])
    // Best of the first 2 weeks (1 & 8 Sep: 122.5) vs best of the last 2 weeks (22 Sep: 126.7)
    expect(seriesGain(series)).toEqual({ kg: 4.2, pct: 3.4 })
    expect(seriesGain(series.slice(0, 1))).toBeNull()
    expect(exercisesByFrequency(workouts, sets)).toEqual([
      { exerciseId: 'bench', sessions: 3 },
      { exerciseId: 'squat', sessions: 2 },
    ])
  })

  it('counts working sets per muscle in a date range and classifies the 10–20 zone', () => {
    const ex = new Map<string, Exercise>([
      ['bench', { id: 'bench', name: 'Bench', muscle: 'chest', equipment: 'barbell', isCompound: true, custom: false }],
      ['squat', { id: 'squat', name: 'Squat', muscle: 'quads', equipment: 'barbell', isCompound: true, custom: false }],
    ])
    expect(setsPerMuscle(workouts, sets, ex, '2026-09-21', '2026-09-27')).toEqual({ chest: 1, quads: 2 })
    expect([zoneStatus(9), zoneStatus(10), zoneStatus(20), zoneStatus(21)]).toEqual(['below', 'in', 'in', 'above'])
  })

  it('lays out a 7 × 12 heatmap ending with the current week', () => {
    const grid = heatmap(workouts, sets, '2026-09-26')
    expect(grid).toHaveLength(12)
    expect(grid.every((col) => col.length === 7)).toBe(true)
    const last = grid[11]!
    expect(last[0]!.date).toBe('2026-09-21') // Monday of this week
    expect(last[1]!).toMatchObject({ date: '2026-09-22', trained: true, sets: 2 })
    expect(last[6]!.future).toBe(true) // Sunday 27 hasn't happened
    expect(grid[0]![0]!.date).toBe('2026-07-06')
    expect(heatLevel(last[1]!)).toBe(1)
    expect(heatLevel(last[2]!)).toBe(0)
  })
})

describe('seriesGain and niceTicks', () => {
  it('is not flipped by one light session at the end', () => {
    const pts = [
      { date: '2026-07-01', e1rm: 100 },
      { date: '2026-08-01', e1rm: 110 },
      { date: '2026-09-20', e1rm: 118 },
      { date: '2026-09-26', e1rm: 80 }, // deload / light day
    ]
    expect(seriesGain(pts)).toEqual({ kg: 18, pct: 18 })
  })

  it('produces clean axis ticks', () => {
    expect(niceTicks(72, 112)).toEqual([70, 80, 90, 100, 110, 120])
    expect(niceTicks(71.3, 74.9)).toEqual([71, 72, 73, 74, 75])
    expect(niceTicks(0, 1)).toEqual([0, 0.25, 0.5, 0.75, 1])
  })
})

describe('nutritionStats', () => {
  const log = (date: string, kcal: number, protein: number): FoodLog => ({
    id: date + kcal,
    date,
    meal: 'lunch',
    foodId: null,
    name: 'x',
    portionLabel: '',
    grams: 0,
    macros: { kcal, protein, carbs: 0, fat: 0 },
    createdAt: 0,
  })
  const targets = { kcal: 2000, protein: 140, carbs: 250, fat: 60 }

  it('averages complete logged days and counts days on target', () => {
    const logs = [
      log('2026-09-25', 1200, 80),
      log('2026-09-25', 800, 60), // 25th: 2000 kcal, 140 g → on target
      log('2026-09-24', 2500, 150), // over by 25 % → off
      log('2026-09-20', 1900, 120), // protein 86 % → off
      log('2026-09-26', 500, 20), // today: not counted
      log('2026-08-01', 3000, 200), // outside 30 days
    ]
    expect(nutritionStats(logs, targets, '2026-09-26', 7)).toEqual({ loggedDays: 3, avgKcal: 2133, avgProtein: 137, onTargetDays: 1 })
    expect(nutritionStats([], targets, '2026-09-26', 30)).toEqual({ loggedDays: 0, avgKcal: null, avgProtein: null, onTargetDays: 0 })
  })
})
