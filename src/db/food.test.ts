import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { addLog, addWater, cacheOffFood, copyMeal, customFoodByBarcode, deleteLog, foodByBarcode, recentFoods, restoreLog, saveFood } from './food'
import { initDb } from './init'
import type { NewLog } from './food'

const log = (date: string, meal: NewLog['meal'], foodId: string | null, name: string, kcal = 100): NewLog => ({
  date,
  meal,
  foodId,
  name,
  portionLabel: '1 serving',
  grams: 100,
  macros: { kcal, protein: 1, carbs: 1, fat: 1 },
})

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await initDb(db)
})

describe('food logs', () => {
  it('seeds the Indian food list on first launch', async () => {
    expect(await db.foods.count()).toBeGreaterThanOrEqual(100)
    expect((await db.foods.get('in-idli'))?.servings[0]).toEqual({ label: 'idli', grams: 40 })
  })

  it('copies yesterday’s meal into today with new ids', async () => {
    await addLog(log('2026-09-25', 'breakfast', 'in-poha', 'Poha'))
    await addLog(log('2026-09-25', 'breakfast', 'in-chai', 'Masala chai'))
    await addLog(log('2026-09-25', 'lunch', 'in-rice', 'Rice'))
    expect(await copyMeal('2026-09-25', '2026-09-26', 'breakfast')).toBe(2)
    const today = await db.foodLogs.where('[date+meal]').equals(['2026-09-26', 'breakfast']).toArray()
    expect(today.map((l) => l.name).sort()).toEqual(['Masala chai', 'Poha'])
    expect(await db.foodLogs.where('date').equals('2026-09-26').count()).toBe(2) // lunch not copied
    expect(await db.foodLogs.count()).toBe(5)
  })

  it('supports delete with undo', async () => {
    const id = await addLog(log('2026-09-26', 'dinner', 'in-dosa', 'Dosa'))
    const removed = await deleteLog(id)
    expect(await db.foodLogs.count()).toBe(0)
    await restoreLog(removed!)
    expect((await db.foodLogs.get(id))?.name).toBe('Dosa')
  })

  it('lists recent distinct foods, newest first', async () => {
    await addLog(log('2026-09-24', 'lunch', 'in-rice', 'Rice'))
    await addLog(log('2026-09-26', 'breakfast', 'in-idli', 'Idli'))
    await addLog(log('2026-09-26', 'lunch', 'in-rice', 'Rice'))
    await addLog(log('2026-09-26', 'snacks', null, 'Quick add'))
    const names = (await recentFoods()).map((f) => f.name)
    expect(names).toEqual(['Rice (white, cooked)', 'Idli'])
  })
})

describe('foods', () => {
  it('creates custom foods and edits built-in ones without touching past logs', async () => {
    const id = await saveFood({ name: 'Protein bar', per100g: { kcal: 380, protein: 30, carbs: 40, fat: 10 }, servings: [{ label: 'bar', grams: 60 }] })
    expect(id.startsWith('custom-')).toBe(true)
    expect((await db.foods.get(id))?.source).toBe('custom')

    await addLog({ ...log('2026-09-26', 'lunch', 'in-roti', 'Roti', 106) })
    const roti = (await db.foods.get('in-roti'))!
    await saveFood({ ...roti, per100g: { ...roti.per100g, kcal: 300 } })
    const edited = (await db.foods.get('in-roti'))!
    expect(edited.per100g.kcal).toBe(300)
    expect(edited.source).toBe('local')
    expect(edited.approximate).toBe(false)
    expect((await db.foodLogs.toArray())[0]!.macros.kcal).toBe(106)
  })
})

describe('water', () => {
  it('adds and removes glasses within 0..30', async () => {
    expect(await addWater('2026-09-26', 1)).toBe(1)
    expect(await addWater('2026-09-26', 1)).toBe(2)
    expect(await addWater('2026-09-26', -5)).toBe(0)
    expect(await addWater('2026-09-26', 100)).toBe(30)
  })
})

describe('barcode cache', () => {
  const off = {
    name: 'Maggi 2-minutes Noodles',
    brand: 'Maggi',
    per100g: { kcal: 437, protein: 10.4, carbs: 44.5, fat: 15.7 },
    servings: [{ label: 'serving', grams: 70 }],
    source: 'off' as const,
    barcode: '8901058851298',
  }

  it('caches one Open Food Facts row per barcode', async () => {
    await cacheOffFood(off)
    await cacheOffFood({ ...off, name: 'Maggi Masala' })
    const rows = await db.foods.where('barcode').equals(off.barcode).toArray()
    expect(rows).toHaveLength(1)
    expect((await foodByBarcode(off.barcode))?.name).toBe('Maggi Masala')
  })

  it('prefers your own label-scanned product over the Open Food Facts copy', async () => {
    await cacheOffFood(off)
    await saveFood({ name: 'Maggi (my label)', per100g: { kcal: 440, protein: 10, carbs: 45, fat: 16 }, servings: [], barcode: off.barcode })
    expect((await foodByBarcode(off.barcode))?.name).toBe('Maggi (my label)')
    expect((await customFoodByBarcode(off.barcode))?.source).toBe('custom')
    expect(await foodByBarcode('0000000000000')).toBeUndefined()
  })
})
