import { describe, expect, it } from 'vitest'
import { convertDraftUnits, draftFromProfile, EMPTY_DRAFT, validateDraft } from './profileDraft'

const metric = { weightUnit: 'kg', lengthUnit: 'cm' } as const
const imperial = { weightUnit: 'lb', lengthUnit: 'in' } as const

describe('validateDraft', () => {
  it('accepts a complete metric draft and returns metric values', () => {
    const r = validateDraft({ ...EMPTY_DRAFT, name: ' Asha ', age: '28', heightCm: '165', weight: '60.5' }, metric)
    expect(r).toEqual({
      ok: true,
      value: { name: 'Asha', sex: 'male', age: 28, heightCm: 165, weightKg: 60.5, activity: 'moderate' },
    })
  })

  it('converts imperial input to kg and cm', () => {
    const r = validateDraft({ ...EMPTY_DRAFT, name: 'R', age: '30', heightFt: '5', heightIn: '10', weight: '176' }, imperial)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.heightCm).toBeCloseTo(177.8, 1)
      expect(r.value.weightKg).toBeCloseTo(79.83, 2)
    }
  })

  it('reports every invalid field', () => {
    const r = validateDraft({ ...EMPTY_DRAFT, age: '7', heightCm: '90', weight: '' }, metric)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['age', 'height', 'name', 'weight'])
  })

  it('rejects non-integer ages', () => {
    const r = validateDraft({ ...EMPTY_DRAFT, name: 'A', age: '25.5', heightCm: '170', weight: '70' }, metric)
    expect(r.ok).toBe(false)
  })
})

describe('unit conversion of drafts', () => {
  it('round-trips profile → draft in either unit system', () => {
    const p = { name: 'A', sex: 'female' as const, age: 30, heightCm: 160, weightKg: 55, activity: 'light' as const }
    expect(draftFromProfile(p, metric)).toMatchObject({ heightCm: '160', weight: '55' })
    expect(draftFromProfile(p, imperial)).toMatchObject({ heightFt: '5', heightIn: '3', weight: '121.3' })
  })

  it('converts entered values when the unit toggle flips', () => {
    const d = { ...EMPTY_DRAFT, heightCm: '180', weight: '80' }
    const next = convertDraftUnits(d, metric, imperial)
    expect(next).toMatchObject({ heightFt: '5', heightIn: '11', weight: '176.4' })
  })
})
