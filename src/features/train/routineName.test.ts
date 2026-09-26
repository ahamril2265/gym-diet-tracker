import { describe, expect, it } from 'vitest'
import { SEED_EXERCISES } from '../../db/seed/exercises'
import { suggestRoutineName } from './routineName'

const map = new Map(SEED_EXERCISES.map((e) => [e.id, e]))
const plan = (exerciseId: string, sets: number) => ({ exerciseId, sets, repMin: 8, repMax: 12 })

describe('suggestRoutineName', () => {
  it('names a routine after its two most-trained muscles', () => {
    expect(suggestRoutineName([plan('bench-press', 4), plan('incline-db-press', 3), plan('tricep-pushdown', 3), plan('lateral-raise', 2)], map)).toBe(
      'Chest & Triceps',
    )
  })

  it('handles a single muscle and an empty routine', () => {
    expect(suggestRoutineName([plan('barbell-curl', 3)], map)).toBe('Biceps')
    expect(suggestRoutineName([], map)).toBe('My routine')
  })
})
