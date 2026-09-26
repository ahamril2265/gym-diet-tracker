import { describe, expect, it } from 'vitest'
import { estimateSessionMinutes } from './workoutTime'

const rest = { compoundSec: 150, accessorySec: 90 }

describe('estimateSessionMinutes', () => {
  it('estimates the default push day at ~55 min', () => {
    const push = [
      { sets: 4, isCompound: true },
      { sets: 3, isCompound: true },
      { sets: 3, isCompound: true },
      { sets: 3, isCompound: false },
      { sets: 3, isCompound: false },
      { sets: 3, isCompound: false },
    ]
    // 10 × 195 s + 9 × 135 s = 3165 s ≈ 52.75 min → 55
    expect(estimateSessionMinutes(push, rest)).toBe(55)
  })

  it('returns 0 for an empty day and at least 5 otherwise', () => {
    expect(estimateSessionMinutes([], rest)).toBe(0)
    expect(estimateSessionMinutes([{ sets: 1, isCompound: false }], rest)).toBe(5)
  })
})
