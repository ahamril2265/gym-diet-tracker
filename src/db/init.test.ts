import { afterEach, describe, expect, it } from 'vitest'
import { createDb, type AppDB } from './db'
import { initDb } from './init'
import { SEED_EXERCISES } from './seed/exercises'
import { instantiateTemplate, SPLIT_TEMPLATES } from './seed/splitTemplates'

let db: AppDB | undefined

afterEach(async () => {
  await db?.delete()
})

describe('initDb', () => {
  it('creates default settings and seeds the exercise library once', async () => {
    db = createDb('test-init')
    const settings = await initDb(db)
    expect(settings.onboarded).toBe(false)
    expect(settings.weightUnit).toBe('kg')
    expect(await db.exercises.count()).toBe(SEED_EXERCISES.length)
    expect(SEED_EXERCISES.length).toBeGreaterThanOrEqual(60)

    // A user edit to a seeded exercise survives the next launch.
    await db.exercises.update('bench-press', { name: 'Flat Bench' })
    await initDb(db)
    expect((await db.exercises.get('bench-press'))?.name).toBe('Flat Bench')
    expect(await db.exercises.count()).toBe(SEED_EXERCISES.length)
  })
})

describe('split templates', () => {
  it('only reference exercises that exist in the library', () => {
    const ids = new Set(SEED_EXERCISES.map((e) => e.id))
    for (const t of SPLIT_TEMPLATES) {
      for (const d of t.days) {
        for (const [id] of d.exercises) expect(ids.has(id), `${t.id} → ${id}`).toBe(true)
      }
    }
  })

  it('instantiate into a 7-day schedule pointing at real day ids', () => {
    for (const t of SPLIT_TEMPLATES) {
      const { split, days } = instantiateTemplate(t)
      expect(split.schedule).toHaveLength(7)
      const dayIds = new Set(days.map((d) => d.id))
      for (const id of split.schedule) if (id !== null) expect(dayIds.has(id)).toBe(true)
      expect(days.every((d) => d.splitId === split.id)).toBe(true)
    }
  })
})
