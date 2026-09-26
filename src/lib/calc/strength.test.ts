import { describe, expect, it } from 'vitest'
import {
  bestsOf,
  detectPRs,
  emptyBests,
  epley1RM,
  heaviestForAtLeast,
  matchPrevious,
  planSets,
  volume,
} from './strength'

const set = (kg: number | null, reps: number | null, extra: Partial<{ isWarmup: boolean; done: boolean }> = {}) => ({
  kg,
  reps,
  isWarmup: false,
  done: true,
  ...extra,
})

describe('epley1RM', () => {
  it('computes w × (1 + reps/30)', () => {
    expect(epley1RM(100, 5)).toBeCloseTo(116.667, 3)
    expect(epley1RM(60, 10)).toBeCloseTo(80)
    expect(epley1RM(100, 1)).toBeCloseTo(103.333, 3)
  })

  it('is 0 for unloaded or zero-rep sets', () => {
    expect(epley1RM(0, 10)).toBe(0)
    expect(epley1RM(50, 0)).toBe(0)
  })
})

describe('volume', () => {
  it('sums kg × reps over ticked working sets only', () => {
    const sets = [
      set(40, 10, { isWarmup: true }), // warm-up: ignored
      set(100, 5),
      set(100, 5),
      set(90, 8),
      set(100, 5, { done: false }), // not ticked: ignored
      set(null, 8), // no weight entered: ignored
    ]
    expect(volume(sets)).toBe(100 * 5 * 2 + 90 * 8)
  })

  it('is 0 for an empty session', () => {
    expect(volume([])).toBe(0)
  })
})

describe('bestsOf', () => {
  it('tracks best e1RM and heaviest kg per rep count, ignoring warm-ups', () => {
    const b = bestsOf([set(200, 1, { isWarmup: true }), set(100, 5), set(90, 8), set(95, 5)])
    expect(b.e1rm).toBeCloseTo(epley1RM(100, 5)) // 116.67 beats 90×8 (114) and 95×5 (110.8)
    expect(b.kgByReps).toEqual({ 5: 100, 8: 90 })
    expect(b.count).toBe(3)
  })

  it('reports heaviest for at least N reps', () => {
    const b = bestsOf([set(100, 5), set(90, 8), set(80, 12)])
    expect(heaviestForAtLeast(b, 5)).toBe(100)
    expect(heaviestForAtLeast(b, 6)).toBe(90)
    expect(heaviestForAtLeast(b, 12)).toBe(80)
    expect(heaviestForAtLeast(b, 13)).toBeUndefined()
  })
})

describe('detectPRs', () => {
  const history = bestsOf([set(100, 5), set(90, 8)]) // best e1RM = 100×5 → 116.67

  it('flags a set that beats the best estimated 1RM', () => {
    const prs = detectPRs(history, [{ id: 'a', order: 0, ...set(105, 5) }])
    expect(prs.get('a')).toEqual(['e1rm', 'weight'])
  })

  it('flags heaviest-for-reps even when e1RM is not a record', () => {
    // 91 × 8 → e1RM 115.27 (< 116.67) but heavier than the previous 90 kg for 8 reps
    const prs = detectPRs(history, [{ id: 'a', order: 0, ...set(91, 8) }])
    expect(prs.get('a')).toEqual(['weight'])
  })

  it('does not flag a rep count never done before', () => {
    // 50 × 20: nobody has done ≥ 20 reps before; e1RM 83 < 116.67
    expect(detectPRs(history, [{ id: 'a', order: 0, ...set(50, 20) }]).size).toBe(0)
  })

  it('does not flag lighter weight at more reps than a heavier previous set', () => {
    // 85 × 8: already lifted 90 for 8
    expect(detectPRs(history, [{ id: 'a', order: 0, ...set(85, 8) }]).size).toBe(0)
  })

  it('does not double-count repeating a PR within the same session', () => {
    const prs = detectPRs(history, [
      { id: 'a', order: 0, ...set(105, 5) },
      { id: 'b', order: 1, ...set(105, 5) },
      { id: 'c', order: 2, ...set(107.5, 5) },
    ])
    expect([...prs.keys()]).toEqual(['a', 'c'])
  })

  it('ignores warm-ups, unticked sets and exercises without history', () => {
    expect(detectPRs(history, [{ id: 'w', order: 0, ...set(200, 5, { isWarmup: true }) }]).size).toBe(0)
    expect(detectPRs(history, [{ id: 'u', order: 0, ...set(200, 5, { done: false }) }]).size).toBe(0)
    expect(detectPRs(emptyBests(), [{ id: 'x', order: 0, ...set(200, 5) }]).size).toBe(0)
  })
})

describe('planSets', () => {
  const prev = [
    { order: 0, ...set(40, 10, { isWarmup: true }) },
    { order: 1, ...set(100, 5) },
    { order: 2, ...set(100, 5) },
    { order: 3, ...set(95, 6) },
  ]

  it('repeats warm-ups and prefills working sets from the last session', () => {
    expect(planSets(prev, 3)).toEqual([
      { isWarmup: true, kg: 40, reps: 10 },
      { isWarmup: false, kg: 100, reps: 5 },
      { isWarmup: false, kg: 100, reps: 5 },
      { isWarmup: false, kg: 95, reps: 6 },
    ])
  })

  it('copies the last working set when more sets are planned than last time', () => {
    const planned = planSets(prev, 4)
    expect(planned[4]).toEqual({ isWarmup: false, kg: 95, reps: 6 })
  })

  it('leaves values empty with no history', () => {
    expect(planSets([], 2)).toEqual([
      { isWarmup: false, kg: null, reps: null },
      { isWarmup: false, kg: null, reps: null },
    ])
  })
})

describe('matchPrevious', () => {
  it('pairs warm-ups with warm-ups and working sets with working sets by position', () => {
    const previous = [
      { order: 0, ...set(40, 10, { isWarmup: true }) },
      { order: 1, ...set(100, 5) },
      { order: 2, ...set(97.5, 5) },
    ]
    const current = [
      { id: 'w1', order: 0, isWarmup: true },
      { id: 's1', order: 1, isWarmup: false },
      { id: 's2', order: 2, isWarmup: false },
      { id: 's3', order: 3, isWarmup: false },
    ]
    const m = matchPrevious(current, previous)
    expect(m.get('w1')?.kg).toBe(40)
    expect(m.get('s1')?.kg).toBe(100)
    expect(m.get('s2')?.kg).toBe(97.5)
    expect(m.has('s3')).toBe(false)
  })
})
