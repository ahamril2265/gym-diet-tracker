import { describe, expect, it } from 'vitest'
import { kcalFromMacros } from '../../lib/calc/targets'
import { SEED_FOODS } from './indianFoods'

describe('Indian food seed', () => {
  it('has about 100+ foods with unique ids and names', () => {
    expect(SEED_FOODS.length).toBeGreaterThanOrEqual(100)
    expect(new Set(SEED_FOODS.map((f) => f.id)).size).toBe(SEED_FOODS.length)
    expect(new Set(SEED_FOODS.map((f) => f.name.toLowerCase())).size).toBe(SEED_FOODS.length)
  })

  it('gives every food at least one sensible serving', () => {
    for (const f of SEED_FOODS) {
      expect(f.servings.length, f.name).toBeGreaterThan(0)
      for (const s of f.servings) {
        expect(s.label.trim(), f.name).not.toBe('')
        expect(s.grams, `${f.name} ${s.label}`).toBeGreaterThan(0)
        expect(s.grams, `${f.name} ${s.label}`).toBeLessThanOrEqual(400)
      }
    }
  })

  it('has macros that add up to the stated calories (catches typos)', () => {
    for (const f of SEED_FOODS) {
      const { kcal, protein, carbs, fat } = f.per100g
      expect(kcal, f.name).toBeGreaterThan(0)
      expect(Math.min(protein, carbs, fat), f.name).toBeGreaterThanOrEqual(0)
      const fromMacros = kcalFromMacros({ protein, carbs, fat })
      // 4/4/9 is an approximation; allow 8% or 15 kcal, whichever is larger.
      expect(Math.abs(fromMacros - kcal), `${f.name}: ${fromMacros} vs ${kcal}`).toBeLessThanOrEqual(Math.max(15, kcal * 0.08))
    }
  })

  it('marks every seed value as approximate', () => {
    expect(SEED_FOODS.every((f) => f.approximate && f.source === 'local')).toBe(true)
  })
})
