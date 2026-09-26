import { uid } from '../lib/id'
import { db } from './db'
import type { Food, FoodLog, ISODate, Meal } from './types'

export type NewLog = Omit<FoodLog, 'id' | 'createdAt'>

export async function addLog(log: NewLog): Promise<string> {
  const id = uid()
  await db.foodLogs.add({ ...log, id, createdAt: Date.now() })
  return id
}

export async function updateLog(id: string, patch: Partial<NewLog>): Promise<void> {
  await db.foodLogs.update(id, patch)
}

/** Deletes an entry and returns it, so the UI can offer Undo. */
export async function deleteLog(id: string): Promise<FoodLog | undefined> {
  return db.transaction('rw', db.foodLogs, async () => {
    const log = await db.foodLogs.get(id)
    if (log) await db.foodLogs.delete(id)
    return log
  })
}

export async function restoreLog(log: FoodLog): Promise<void> {
  await db.foodLogs.put(log)
}

/** Copies every entry of one meal on `from` into the same meal on `to`. Returns how many were copied. */
export async function copyMeal(from: ISODate, to: ISODate, meal: Meal): Promise<number> {
  return db.transaction('rw', db.foodLogs, async () => {
    const source = await db.foodLogs.where('[date+meal]').equals([from, meal]).sortBy('createdAt')
    const now = Date.now()
    await db.foodLogs.bulkAdd(source.map((l, i) => ({ ...l, id: uid(), date: to, createdAt: now + i })))
    return source.length
  })
}

export type FoodInput = Omit<Food, 'id' | 'updatedAt' | 'source'> & { id?: string; source?: Food['source'] }

/**
 * Creates a food (source "custom") or updates an existing one. Editing a built-in food keeps its source
 * but drops the "approximate" flag, since you've entered your own numbers. Past log entries keep the
 * values they were logged with.
 */
export async function saveFood(input: FoodInput): Promise<string> {
  const now = Date.now()
  if (input.id) {
    const existing = await db.foods.get(input.id)
    if (existing) {
      await db.foods.put({ ...existing, ...input, id: existing.id, source: existing.source, approximate: false, updatedAt: now })
      return existing.id
    }
  }
  const id = input.id ?? `custom-${uid()}`
  await db.foods.put({ ...input, id, source: input.source ?? 'custom', updatedAt: now })
  return id
}

/** Distinct foods from your most recent entries, newest first. */
export async function recentFoods(limit = 12): Promise<Food[]> {
  const logs = await db.foodLogs.orderBy('date').reverse().limit(300).toArray()
  logs.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  const ids: string[] = []
  for (const l of logs) {
    if (l.foodId && !ids.includes(l.foodId)) ids.push(l.foodId)
    if (ids.length >= limit) break
  }
  const foods = await db.foods.bulkGet(ids)
  return foods.filter((f): f is Food => f !== undefined)
}

export const MAX_GLASSES = 30

export async function addWater(date: ISODate, delta: number): Promise<number> {
  return db.transaction('rw', db.water, async () => {
    const current = (await db.water.get(date))?.glasses ?? 0
    const glasses = Math.min(MAX_GLASSES, Math.max(0, current + delta))
    await db.water.put({ date, glasses })
    return glasses
  })
}
