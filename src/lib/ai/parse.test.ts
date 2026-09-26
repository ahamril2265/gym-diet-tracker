import { describe, expect, it } from 'vitest'
import { AiError, toAiError } from './errors'
import { BadResponseError, parseLabelResponse, parseMealResponse, scaleMealItem } from './parse'

const meal = JSON.stringify({
  items: [
    { name: 'roti', portionLabel: 'roti', quantity: 3, grams: 120, kcal: 317, protein: 10.8, carbs: 60, fat: 2.9, confidence: 0.92, box: [520, 80, 900, 420] },
    { name: 'Dal tadka', portionLabel: 'katori', quantity: 1, grams: 150, kcal: 197, protein: 9.8, carbs: 21, fat: 8.3, confidence: 0.45, box: [100, 500, 480, 950] },
    { name: 'Mystery', portionLabel: '', quantity: 0, grams: -5, kcal: 50, protein: 'x', carbs: 5, fat: 1, confidence: 7, box: [10, 10, 12, 12] },
    { name: '', kcal: 100 },
    { name: 'No calories', kcal: 'lots' },
  ],
})

describe('parseMealResponse', () => {
  it('keeps valid items, cleans odd values and drops junk', () => {
    const items = parseMealResponse(meal)
    expect(items.map((i) => i.name)).toEqual(['Roti', 'Dal tadka', 'Mystery'])
    expect(items[0]).toMatchObject({ portionLabel: 'roti', quantity: 3, grams: 120, kcal: 317, box: [520, 80, 900, 420] })
    expect(items[1]!.confidence).toBe(0.45)
    // Defaults and clamps for the messy one
    expect(items[2]).toMatchObject({ portionLabel: 'serving', quantity: 1, grams: 0, protein: 0, confidence: 1, box: null })
  })

  it('accepts code-fenced JSON and an empty list', () => {
    expect(parseMealResponse('```json\n{"items": []}\n```')).toEqual([])
  })

  it('rejects replies that are not the expected JSON', () => {
    expect(() => parseMealResponse('Sorry, I cannot help')).toThrow(BadResponseError)
    expect(() => parseMealResponse('{"foods": []}')).toThrow(BadResponseError)
  })

  it('scales an item per unit when the quantity changes', () => {
    const roti = parseMealResponse(meal)[0]!
    expect(scaleMealItem(roti, 2)).toEqual({ grams: 80, macros: { kcal: 211, protein: 7.2, carbs: 40, fat: 1.9 } })
    expect(scaleMealItem(roti, 0).macros.kcal).toBe(0)
  })
})

describe('parseLabelResponse', () => {
  it('reads per-100 g values and the serving size', () => {
    const r = parseLabelResponse(
      JSON.stringify({ productName: 'Marie Gold', per100g: { kcal: 444, protein: 7.5, carbs: 75.4, fat: 12.6 }, servingSize: { label: '5 biscuits', grams: 30 }, confidence: 0.9 }),
    )
    expect(r).toEqual({ productName: 'Marie Gold', per100g: { kcal: 444, protein: 7.5, carbs: 75.4, fat: 12.6 }, servingSize: { label: '5 biscuits', grams: 30 }, confidence: 0.9 })
  })

  it('allows a missing serving size', () => {
    const r = parseLabelResponse(JSON.stringify({ productName: '', per100g: { kcal: 60, protein: 3, carbs: 4.7, fat: 3 }, servingSize: null, confidence: 0.8 }))
    expect(r.servingSize).toBeNull()
  })

  it('rejects impossible numbers', () => {
    expect(() => parseLabelResponse(JSON.stringify({ per100g: { kcal: 2000, protein: 1, carbs: 1, fat: 1 } }))).toThrow(BadResponseError)
    expect(() => parseLabelResponse(JSON.stringify({ per100g: { kcal: 400, protein: 60, carbs: 60, fat: 10 } }))).toThrow(BadResponseError)
    expect(() => parseLabelResponse(JSON.stringify({ per100g: {} }))).toThrow(BadResponseError)
  })
})

describe('toAiError', () => {
  const kind = (e: unknown) => toAiError(e).kind

  it('maps API failures to friendly kinds', () => {
    expect(kind({ status: 429, message: 'RESOURCE_EXHAUSTED' })).toBe('quota')
    expect(kind({ status: 400, message: 'API key not valid. Please pass a valid API key.' })).toBe('invalid-key')
    expect(kind({ status: 403, message: 'PERMISSION_DENIED' })).toBe('invalid-key')
    expect(kind({ status: 404, message: 'models/x is not found for API version v1beta' })).toBe('model')
    expect(kind({ status: 503, message: 'overloaded' })).toBe('network')
    expect(kind(new TypeError('Failed to fetch'))).toBe('network')
    expect(kind({ name: 'AbortError' })).toBe('cancelled')
    expect(kind(new BadResponseError())).toBe('bad-response')
    expect(kind(new AiError('no-key'))).toBe('no-key')
  })

  it('gives every error a readable message', () => {
    expect(toAiError({ status: 429 }).message).toMatch(/limit/)
    expect(new AiError('no-key').message).toMatch(/API key/)
  })
})
