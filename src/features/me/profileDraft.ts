import type { ActivityLevel, GoalMode, LengthUnit, Profile, Sex, WeightUnit } from '../../db/types'
import { cmToFeetInches, feetInchesToCm, round, weightFromKg, weightToKg } from '../../lib/units'

export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, little or no exercise' },
  { value: 'light', label: 'Light', desc: 'Exercise 1–3 days a week' },
  { value: 'moderate', label: 'Moderate', desc: 'Exercise 3–5 days a week' },
  { value: 'active', label: 'Active', desc: 'Hard exercise 6–7 days a week' },
  { value: 'very_active', label: 'Very active', desc: 'Physical job plus hard training' },
]

export const GOAL_OPTIONS: { value: GoalMode; label: string; adjustment: string; desc: string }[] = [
  { value: 'bulk', label: 'Bulk', adjustment: '+300 kcal', desc: 'Build muscle with a small surplus' },
  { value: 'cut', label: 'Cut', adjustment: '−500 kcal', desc: 'Lose fat while keeping muscle' },
  { value: 'recomp', label: 'Recomp', adjustment: 'Maintenance', desc: 'Lose fat and build muscle slowly' },
]

export const GOAL_LABEL: Record<GoalMode, string> = { bulk: 'Bulk', cut: 'Cut', recomp: 'Recomp' }

/** Form state: raw strings in the user's display units. */
export interface ProfileDraft {
  name: string
  sex: Sex
  age: string
  heightCm: string
  heightFt: string
  heightIn: string
  weight: string
  activity: ActivityLevel
}

export interface Units {
  weightUnit: WeightUnit
  lengthUnit: LengthUnit
}

export type DraftErrors = Partial<Record<'name' | 'age' | 'height' | 'weight', string>>

export type ProfileValues = Pick<Profile, 'name' | 'sex' | 'age' | 'heightCm' | 'weightKg' | 'activity'>

export const EMPTY_DRAFT: ProfileDraft = {
  name: '',
  sex: 'male',
  age: '',
  heightCm: '',
  heightFt: '',
  heightIn: '',
  weight: '',
  activity: 'moderate',
}

export function draftFromProfile(p: ProfileValues, units: Units): ProfileDraft {
  const { feet, inches } = cmToFeetInches(p.heightCm)
  return {
    name: p.name,
    sex: p.sex,
    age: String(p.age),
    heightCm: String(round(p.heightCm, 1)),
    heightFt: String(feet),
    heightIn: String(inches),
    weight: String(round(weightFromKg(p.weightKg, units.weightUnit), 1)),
    activity: p.activity,
  }
}

const num = (s: string) => (s.trim() === '' ? Number.NaN : Number(s.replace(',', '.')))

export function draftHeightCm(d: ProfileDraft, unit: LengthUnit): number {
  if (unit === 'cm') return num(d.heightCm)
  const ft = num(d.heightFt)
  const inches = d.heightIn.trim() === '' ? 0 : num(d.heightIn)
  return Number.isFinite(ft) ? feetInchesToCm(ft, inches) : Number.NaN
}

export function draftWeightKg(d: ProfileDraft, unit: WeightUnit): number {
  return weightToKg(num(d.weight), unit)
}

/** Re-expresses the height/weight strings when the user flips units mid-form. */
export function convertDraftUnits(d: ProfileDraft, from: Units, to: Units): ProfileDraft {
  const next = { ...d }
  const cm = draftHeightCm(d, from.lengthUnit)
  if (Number.isFinite(cm) && from.lengthUnit !== to.lengthUnit) {
    const { feet, inches } = cmToFeetInches(cm)
    Object.assign(next, { heightCm: String(round(cm, 0)), heightFt: String(feet), heightIn: String(inches) })
  }
  const kg = draftWeightKg(d, from.weightUnit)
  if (Number.isFinite(kg) && from.weightUnit !== to.weightUnit) {
    next.weight = String(round(weightFromKg(kg, to.weightUnit), 1))
  }
  return next
}

export const LIMITS = {
  age: [13, 100],
  heightCm: [120, 230],
  weightKg: [30, 300],
} as const

export function validateDraft(
  d: ProfileDraft,
  units: Units,
): { ok: true; value: ProfileValues } | { ok: false; errors: DraftErrors } {
  const errors: DraftErrors = {}
  const name = d.name.trim()
  if (!name) errors.name = 'Enter your name'
  else if (name.length > 30) errors.name = 'Keep it under 30 characters'

  const age = num(d.age)
  if (!Number.isInteger(age) || age < LIMITS.age[0] || age > LIMITS.age[1]) {
    errors.age = `Age between ${LIMITS.age[0]} and ${LIMITS.age[1]}`
  }

  const heightCm = draftHeightCm(d, units.lengthUnit)
  if (!Number.isFinite(heightCm) || heightCm < LIMITS.heightCm[0] || heightCm > LIMITS.heightCm[1]) {
    errors.height = units.lengthUnit === 'cm' ? 'Height between 120 and 230 cm' : 'Height between 4′0″ and 7′6″'
  }

  const weightKg = draftWeightKg(d, units.weightUnit)
  if (!Number.isFinite(weightKg) || weightKg < LIMITS.weightKg[0] || weightKg > LIMITS.weightKg[1]) {
    errors.weight = units.weightUnit === 'kg' ? 'Weight between 30 and 300 kg' : 'Weight between 66 and 660 lb'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      name,
      sex: d.sex,
      age,
      heightCm: round(heightCm, 1),
      weightKg: round(weightKg, 2),
      activity: d.activity,
    },
  }
}

