import { describe, expect, it } from 'vitest'
import { cmToFeetInches, feetInchesToCm, kgToLb, lbToKg, lengthFromCm, lengthToCm, round, weightFromKg, weightToKg } from './units'

describe('units', () => {
  it('converts kg ⇄ lb', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 3)
    expect(lbToKg(220.462)).toBeCloseTo(100, 3)
    expect(weightToKg(weightFromKg(82.5, 'lb'), 'lb')).toBeCloseTo(82.5, 9)
    expect(weightFromKg(82.5, 'kg')).toBe(82.5)
  })

  it('converts cm ⇄ in and feet/inches', () => {
    expect(lengthFromCm(2.54, 'in')).toBeCloseTo(1)
    expect(lengthToCm(10, 'in')).toBeCloseTo(25.4)
    expect(cmToFeetInches(173)).toEqual({ feet: 5, inches: 8 })
    expect(feetInchesToCm(6, 0)).toBeCloseTo(182.88)
  })

  it('rounds to decimals', () => {
    expect(round(1.2345, 2)).toBe(1.23)
    expect(round(72.46, 1)).toBe(72.5)
  })
})
