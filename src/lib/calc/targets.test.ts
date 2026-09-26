import { describe, expect, it } from 'vitest'
import {
  ACTIVITY_FACTORS,
  bmrMifflinStJeor,
  calcTargets,
  GOAL_KCAL_ADJUSTMENT,
  kcalFromMacros,
  tdee,
} from './targets'

const male = { sex: 'male' as const, age: 25, heightCm: 175, weightKg: 70 }
const female = { sex: 'female' as const, age: 30, heightCm: 160, weightKg: 55 }

describe('bmrMifflinStJeor', () => {
  it('matches the published formula for a man', () => {
    // 10·70 + 6.25·175 − 5·25 + 5 = 700 + 1093.75 − 125 + 5
    expect(bmrMifflinStJeor(male)).toBeCloseTo(1673.75)
  })

  it('matches the published formula for a woman', () => {
    // 10·55 + 6.25·160 − 5·30 − 161 = 550 + 1000 − 150 − 161
    expect(bmrMifflinStJeor(female)).toBeCloseTo(1239)
  })

  it('differs by exactly 166 kcal between sexes with identical stats', () => {
    const f = bmrMifflinStJeor({ ...male, sex: 'female' })
    expect(bmrMifflinStJeor(male) - f).toBeCloseTo(166)
  })
})

describe('tdee', () => {
  it('uses the five activity factors', () => {
    expect(ACTIVITY_FACTORS).toEqual({
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    })
    expect(tdee(1000, 'sedentary')).toBeCloseTo(1200)
    expect(tdee(1000, 'light')).toBeCloseTo(1375)
    expect(tdee(1000, 'moderate')).toBeCloseTo(1550)
    expect(tdee(1000, 'active')).toBeCloseTo(1725)
    expect(tdee(1000, 'very_active')).toBeCloseTo(1900)
  })
})

describe('calcTargets', () => {
  it('applies goal adjustments of +300 / −500 / 0', () => {
    expect(GOAL_KCAL_ADJUSTMENT).toEqual({ bulk: 300, cut: -500, recomp: 0 })
    const base = { ...male, activity: 'moderate' as const }
    const recomp = calcTargets({ ...base, goal: 'recomp' })
    const bulk = calcTargets({ ...base, goal: 'bulk' })
    const cut = calcTargets({ ...base, goal: 'cut' })
    // TDEE = 1673.75 × 1.55 = 2594.3 → 2590
    expect(recomp.kcal).toBe(2590)
    expect(bulk.kcal).toBe(2890)
    expect(cut.kcal).toBe(2090)
  })

  it('sets protein 2.0 g/kg, fat 0.9 g/kg and carbs as the remainder', () => {
    const t = calcTargets({ ...male, activity: 'moderate', goal: 'recomp' })
    expect(t.protein).toBe(140) // 70 × 2.0
    expect(t.fat).toBe(63) // 70 × 0.9
    // (2590 − 140·4 − 63·9) / 4 = (2590 − 560 − 567) / 4 = 365.75 → 366
    expect(t.carbs).toBe(366)
  })

  it('raises protein to 2.2 g/kg on a cut', () => {
    const t = calcTargets({ ...male, activity: 'moderate', goal: 'cut' })
    expect(t.protein).toBe(154) // 70 × 2.2
    expect(t.fat).toBe(63)
    // (2090 − 616 − 567) / 4 = 226.75 → 227
    expect(t.carbs).toBe(227)
  })

  it('keeps macro calories within rounding of the kcal target', () => {
    for (const goal of ['bulk', 'cut', 'recomp'] as const) {
      const t = calcTargets({ ...female, activity: 'light', goal })
      expect(Math.abs(kcalFromMacros(t) - t.kcal)).toBeLessThanOrEqual(2)
    }
  })

  it('never returns negative carbs', () => {
    const t = calcTargets({ sex: 'female', age: 70, heightCm: 145, weightKg: 120, activity: 'sedentary', goal: 'cut' })
    expect(t.carbs).toBe(0)
  })
})

describe('kcalFromMacros', () => {
  it('uses 4/4/9 kcal per gram', () => {
    expect(kcalFromMacros({ protein: 10, carbs: 10, fat: 10 })).toBe(170)
  })
})
