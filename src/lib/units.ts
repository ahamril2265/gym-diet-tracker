import type { LengthUnit, WeightUnit } from '../db/types'

export const KG_PER_LB = 0.45359237
export const CM_PER_IN = 2.54

export const kgToLb = (kg: number) => kg / KG_PER_LB
export const lbToKg = (lb: number) => lb * KG_PER_LB
export const cmToIn = (cm: number) => cm / CM_PER_IN
export const inToCm = (inches: number) => inches * CM_PER_IN

export function round(n: number, decimals = 0): number {
  const f = 10 ** decimals
  return Math.round(n * f) / f
}

/** kg → value in the display unit. */
export function weightFromKg(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kgToLb(kg)
}

/** Display-unit value → kg. */
export function weightToKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : lbToKg(value)
}

export function lengthFromCm(cm: number, unit: LengthUnit): number {
  return unit === 'cm' ? cm : cmToIn(cm)
}

export function lengthToCm(value: number, unit: LengthUnit): number {
  return unit === 'cm' ? value : inToCm(value)
}

/** 173 cm → { feet: 5, inches: 8 } */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const total = Math.round(cmToIn(cm))
  return { feet: Math.floor(total / 12), inches: total % 12 }
}

export function feetInchesToCm(feet: number, inches: number): number {
  return inToCm(feet * 12 + inches)
}

export function formatWeight(kg: number, unit: WeightUnit, decimals = 1): string {
  return `${round(weightFromKg(kg, unit), decimals)} ${unit}`
}
