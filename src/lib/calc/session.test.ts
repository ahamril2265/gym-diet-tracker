import { describe, expect, it } from 'vitest'
import type { WorkoutSet } from '../../db/types'
import { summarizeSession } from './session'
import { bestsOf, emptyBests } from './strength'

const mk = (id: string, exerciseId: string, order: number, kg: number, reps: number, extra: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id,
  workoutId: 'w',
  exerciseId,
  date: '2026-09-26',
  order,
  kg,
  reps,
  isWarmup: false,
  done: true,
  ...extra,
})

describe('summarizeSession', () => {
  const workout = { startedAt: 1_000_000, endedAt: 1_000_000 + 52 * 60_000, exerciseOrder: ['bench', 'curl'] }
  const sets = [
    mk('w1', 'bench', 0, 60, 10, { isWarmup: true }),
    mk('b1', 'bench', 1, 105, 5),
    mk('b2', 'bench', 2, 100, 5),
    mk('c1', 'curl', 0, 15, 12),
  ]

  it('reports duration, volume and working sets', () => {
    const s = summarizeSession(workout, sets, { bench: emptyBests(), curl: emptyBests() })
    expect(s.durationMs).toBe(52 * 60_000)
    expect(s.volumeKg).toBe(105 * 5 + 100 * 5 + 15 * 12)
    expect(s.workingSets).toBe(3)
    expect(s.prs).toEqual([]) // no history → no PRs
  })

  it('lists PR sets with their estimated 1RM', () => {
    const s = summarizeSession(workout, sets, {
      bench: bestsOf([{ kg: 100, reps: 5, isWarmup: false, done: true }]),
      curl: bestsOf([{ kg: 15, reps: 12, isWarmup: false, done: true }]),
    })
    expect(s.prs).toHaveLength(1)
    expect(s.prs[0]).toMatchObject({ exerciseId: 'bench', setId: 'b1', kg: 105, reps: 5, kinds: ['e1rm', 'weight'] })
    expect(s.prs[0]!.e1rm).toBeCloseTo(122.5)
  })

  it('measures an in-progress workout up to now', () => {
    const s = summarizeSession({ ...workout, endedAt: null }, [], {}, 1_000_000 + 60_000)
    expect(s.durationMs).toBe(60_000)
  })
})
