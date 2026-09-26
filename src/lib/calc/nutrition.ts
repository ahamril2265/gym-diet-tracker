import type { Macros, Meal } from '../../db/types'

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

const r1 = (n: number) => Math.round(n * 10) / 10

/** Macros for `grams` of a food given per 100 g. kcal to whole numbers, macros to 0.1 g. */
export function scaleMacros(per100: Macros, grams: number): Macros {
  const f = Math.max(0, grams) / 100
  return {
    kcal: Math.round(per100.kcal * f),
    protein: r1(per100.protein * f),
    carbs: r1(per100.carbs * f),
    fat: r1(per100.fat * f),
  }
}

/** Per-100 g values implied by a logged portion (used when an entry has no food record). */
export function per100FromPortion(m: Macros, grams: number): Macros {
  if (grams <= 0) return { ...ZERO_MACROS }
  const f = 100 / grams
  return { kcal: m.kcal * f, protein: m.protein * f, carbs: m.carbs * f, fat: m.fat * f }
}

export function sumMacros(list: Macros[]): Macros {
  const s = list.reduce(
    (a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }),
    { ...ZERO_MACROS },
  )
  return { kcal: Math.round(s.kcal), protein: r1(s.protein), carbs: r1(s.carbs), fat: r1(s.fat) }
}

/** 1 → "1", 1.5 → "1.5", 0.25 → "0.25". */
export function formatQty(q: number): string {
  return String(Math.round(q * 100) / 100)
}

/** "2 roti", "1.5 katori", "150 g". */
export function portionLabel(qty: number, servingLabel: string): string {
  return servingLabel === 'g' ? `${formatQty(qty)} g` : `${formatQty(qty)} ${servingLabel}`
}

/** Relative change in %, or null when there's nothing to compare against. */
export function percentChange(previous: number, current: number): number | null {
  if (!(previous > 0)) return null
  return ((current - previous) / previous) * 100
}

export const MEALS: Meal[] = ['breakfast', 'lunch', 'snacks', 'dinner']

export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
}

/** Which meal you're most likely logging right now. */
export function mealForTime(d: Date = new Date()): Meal {
  const h = d.getHours()
  if (h < 11) return 'breakfast'
  if (h < 16) return 'lunch'
  if (h < 19) return 'snacks'
  return 'dinner'
}
