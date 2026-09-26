import { describe, expect, it } from 'vitest'
import { SEED_FOODS } from '../../db/seed/indianFoods'
import { searchFoods } from '../foodSearch'
import { mealForTime, per100FromPortion, percentChange, portionLabel, scaleMacros, sumMacros } from './nutrition'
import { computeStreak } from './streak'

describe('scaleMacros', () => {
  it('scales per-100 g values to a portion', () => {
    const roti = { kcal: 264, protein: 9, carbs: 50, fat: 2.4 }
    expect(scaleMacros(roti, 80)).toEqual({ kcal: 211, protein: 7.2, carbs: 40, fat: 1.9 })
    expect(scaleMacros(roti, 0)).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
  })

  it('round-trips through per100FromPortion', () => {
    const m = scaleMacros({ kcal: 150, protein: 12.6, carbs: 1.1, fat: 10.6 }, 100)
    expect(per100FromPortion(m, 100)).toEqual(m)
    expect(per100FromPortion(m, 0)).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
  })

  it('sums a day of logs', () => {
    expect(
      sumMacros([
        { kcal: 211, protein: 7.2, carbs: 40, fat: 1.9 },
        { kcal: 163, protein: 9.8, carbs: 22.5, fat: 3.8 },
      ]),
    ).toEqual({ kcal: 374, protein: 17, carbs: 62.5, fat: 5.7 })
  })
})

describe('labels and meals', () => {
  it('builds portion labels', () => {
    expect(portionLabel(2, 'roti')).toBe('2 roti')
    expect(portionLabel(1.5, 'katori')).toBe('1.5 katori')
    expect(portionLabel(150, 'g')).toBe('150 g')
  })

  it('computes percent change', () => {
    expect(percentChange(1000, 1080)).toBeCloseTo(8)
    expect(percentChange(1000, 950)).toBeCloseTo(-5)
    expect(percentChange(0, 500)).toBeNull()
  })

  it('guesses the meal from the time of day', () => {
    expect(mealForTime(new Date(2026, 8, 26, 8))).toBe('breakfast')
    expect(mealForTime(new Date(2026, 8, 26, 13))).toBe('lunch')
    expect(mealForTime(new Date(2026, 8, 26, 17))).toBe('snacks')
    expect(mealForTime(new Date(2026, 8, 26, 21))).toBe('dinner')
  })
})

describe('searchFoods', () => {
  const names = (q: string) => searchFoods(SEED_FOODS, q).map((f) => f.name)

  it('finds foods by Hindi/regional aliases', () => {
    expect(names('chapati')[0]).toBe('Roti / Chapati')
    expect(names('dahi')).toContain('Curd / dahi')
    expect(names('anda')).toContain('Egg (boiled)')
    expect(names('chaas')[0]).toBe('Buttermilk / chaas')
  })

  it('ranks names that start with the query first', () => {
    expect(names('idli')[0]).toBe('Idli')
    expect(names('paneer')[0]).toBe('Paneer')
    expect(names('dosa').slice(0, 2)).toEqual(['Dosa (plain)', 'Masala dosa'])
  })

  it('requires every word to match, in any order', () => {
    expect(names('chicken biryani')).toEqual(['Chicken biryani'])
    expect(names('biryani chicken')).toEqual(['Chicken biryani'])
    expect(names('zzz')).toEqual([])
    expect(names('   ')).toEqual([])
  })

  it('puts your own foods first on ties', () => {
    const mine = { ...SEED_FOODS[0]!, id: 'custom-1', name: 'Roti (my recipe)', source: 'custom' as const }
    expect(searchFoods([...SEED_FOODS, mine], 'roti')[0]!.id).toBe('custom-1')
  })
})

describe('computeStreak', () => {
  // Sun rest, Mon–Sat training
  const sixDay = [null, 'a', 'b', 'c', 'a', 'b', 'c']
  // Sat 26 Sep 2026
  const today = '2026-09-26'

  it('is 0 with no workouts', () => {
    expect(computeStreak(today, [], sixDay)).toBe(0)
  })

  it('counts consecutive training days and scheduled rest days', () => {
    // Trained Thu 17 → Sat 19, rest Sun 20, trained Mon 21 → Sat 26
    const dates = ['2026-09-17', '2026-09-18', '2026-09-19', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26']
    expect(computeStreak(today, dates, sixDay)).toBe(10)
  })

  it('does not break the streak for today before you train', () => {
    const dates = ['2026-09-24', '2026-09-25']
    expect(computeStreak(today, dates, sixDay)).toBe(2)
  })

  it('breaks on a missed training day', () => {
    // Missed Thu 24
    const dates = ['2026-09-22', '2026-09-23', '2026-09-25', '2026-09-26']
    expect(computeStreak(today, dates, sixDay)).toBe(2)
  })

  it('counts a workout on a rest day, and a rest day today', () => {
    // Sun 27 is a rest day; trained Sat 26 and Fri 25
    expect(computeStreak('2026-09-27', ['2026-09-25', '2026-09-26'], sixDay)).toBe(3)
  })

  it('never counts rest days before your first workout', () => {
    // First ever workout Mon 21; Sun 20 (rest) must not count
    expect(computeStreak('2026-09-21', ['2026-09-21'], sixDay)).toBe(1)
  })

  it('without a split, only workout days count', () => {
    expect(computeStreak(today, ['2026-09-25', '2026-09-26'], null)).toBe(2)
  })
})
