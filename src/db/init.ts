import type { AppDB } from './db'
import { DEFAULT_SETTINGS } from './defaults'
import { EXERCISE_SEED_VERSION, SEED_EXERCISES } from './seed/exercises'
import { FOOD_SEED_VERSION, SEED_FOODS } from './seed/indianFoods'
import type { Settings } from './types'

/**
 * Runs once per launch before the UI renders: makes sure the settings row exists
 * and adds any built-in seed rows that are missing (never overwrites user edits).
 */
export async function initDb(db: AppDB): Promise<Settings> {
  return db.transaction('rw', db.settings, db.exercises, db.foods, async () => {
    const stored = await db.settings.get('app')
    // Fields added to Settings in later versions get their defaults.
    let settings: Settings = { ...DEFAULT_SETTINGS, ...stored }
    if (!stored) await db.settings.put(settings)

    if ((settings.seedVersions.exercises ?? 0) < EXERCISE_SEED_VERSION) {
      const existing = new Set(await db.exercises.toCollection().primaryKeys())
      await db.exercises.bulkAdd(SEED_EXERCISES.filter((e) => !existing.has(e.id)))
      settings = { ...settings, seedVersions: { ...settings.seedVersions, exercises: EXERCISE_SEED_VERSION } }
      await db.settings.put(settings)
    }

    if ((settings.seedVersions.foods ?? 0) < FOOD_SEED_VERSION) {
      const existing = new Set(await db.foods.toCollection().primaryKeys())
      await db.foods.bulkAdd(SEED_FOODS.filter((f) => !existing.has(f.id)))
      settings = { ...settings, seedVersions: { ...settings.seedVersions, foods: FOOD_SEED_VERSION } }
      await db.settings.put(settings)
    }
    return settings
  })
}
