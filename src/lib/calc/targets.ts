import type { ActivityLevel, GoalMode, MacroTargets, Sex } from '../../db/types'

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export const GOAL_KCAL_ADJUSTMENT: Record<GoalMode, number> = {
  bulk: 300,
  cut: -500,
  recomp: 0,
}

/** Grams of protein per kg of body weight. */
export const PROTEIN_G_PER_KG: Record<GoalMode, number> = {
  bulk: 2.0,
  cut: 2.2,
  recomp: 2.0,
}

export const FAT_G_PER_KG = 0.9

export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const

export interface BodyStats {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
}

/** Mifflin-St Jeor: 10·kg + 6.25·cm − 5·age + (5 male | −161 female). */
export function bmrMifflinStJeor({ sex, age, heightCm, weightKg }: BodyStats): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return base + (sex === 'male' ? 5 : -161)
}

export function tdee(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_FACTORS[activity]
}

export interface TargetInput extends BodyStats {
  activity: ActivityLevel
  goal: GoalMode
}

/**
 * Daily targets: TDEE + goal adjustment; protein 2.0 g/kg (2.2 on a cut), fat 0.9 g/kg, carbs fill the rest.
 * kcal is rounded to the nearest 10, grams to whole numbers. Carbs never go below 0.
 */
export function calcTargets(input: TargetInput): MacroTargets {
  const maintenance = tdee(bmrMifflinStJeor(input), input.activity)
  const kcal = Math.round((maintenance + GOAL_KCAL_ADJUSTMENT[input.goal]) / 10) * 10
  const protein = Math.round(input.weightKg * PROTEIN_G_PER_KG[input.goal])
  const fat = Math.round(input.weightKg * FAT_G_PER_KG)
  const carbKcal = kcal - protein * KCAL_PER_G.protein - fat * KCAL_PER_G.fat
  const carbs = Math.max(0, Math.round(carbKcal / KCAL_PER_G.carbs))
  return { kcal, protein, carbs, fat }
}

/** kcal implied by a set of macro grams. */
export function kcalFromMacros(m: { protein: number; carbs: number; fat: number }): number {
  return m.protein * KCAL_PER_G.protein + m.carbs * KCAL_PER_G.carbs + m.fat * KCAL_PER_G.fat
}
