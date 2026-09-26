import { describe, expect, it } from 'vitest'
import { mapOffProduct, offProductToFood, shortServingLabel } from './off'

// Trimmed from a real response for Maggi 2-minute noodles (8901058851298).
const maggi = {
  status: 1,
  product: {
    product_name: 'Maggi 2-minutes Noodles',
    brands: 'Maggi, Nestlé',
    quantity: '70 g',
    serving_size: '70 g',
    serving_quantity: 70,
    image_front_small_url: 'https://images.openfoodfacts.org/x.jpg',
    nutriments: { 'energy-kcal_100g': 437, energy_100g: 1828, proteins_100g: 10.4, carbohydrates_100g: 44.5, fat_100g: 15.7 },
  },
}

describe('Open Food Facts mapping', () => {
  it('maps name, brand, serving and per-100 g nutrition', () => {
    const p = mapOffProduct('8901058851298', maggi)!
    expect(p).toMatchObject({
      barcode: '8901058851298',
      name: 'Maggi 2-minutes Noodles',
      brand: 'Maggi',
      packQuantity: '70 g',
      per100g: { kcal: 437, protein: 10.4, carbs: 44.5, fat: 15.7 },
      serving: { label: 'serving', grams: 70 },
    })
    expect(offProductToFood(p)).toMatchObject({ source: 'off', barcode: '8901058851298', servings: [{ label: 'serving', grams: 70 }] })
  })

  it('converts kJ when kcal is missing', () => {
    const p = mapOffProduct('1', { status: 1, product: { product_name: 'X', nutriments: { energy_100g: 1828, proteins_100g: 1, carbohydrates_100g: 1, fat_100g: 1 } } })!
    expect(p.per100g?.kcal).toBe(437)
  })

  it('flags products without a nutrition table and missing products', () => {
    const p = mapOffProduct('2', { status: 1, product: { product_name: 'Mystery', nutriments: {} } })!
    expect(p.per100g).toBeNull()
    expect(offProductToFood(p)).toBeNull()
    expect(mapOffProduct('3', { status: 0 })).toBeNull()
  })

  it('shortens serving labels', () => {
    expect(shortServingLabel('1 portion (30 g)')).toBe('portion')
    expect(shortServingLabel('2 biscuits (20 g)')).toBe('2 biscuits')
    expect(shortServingLabel('70 g')).toBe('serving')
    expect(shortServingLabel(undefined)).toBe('serving')
  })
})
