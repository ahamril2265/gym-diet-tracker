import { beforeEach, describe, expect, it } from 'vitest'
import { logWeight } from './actions'
import { addPhoto, deletePhoto, deleteWeight, saveMeasurements, summarizeMeasurements } from './body'
import { db } from './db'
import { initDb } from './init'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await initDb(db)
  await db.profile.put({
    id: 'me',
    name: 'T',
    sex: 'male',
    age: 30,
    heightCm: 175,
    weightKg: 80,
    activity: 'moderate',
    goal: 'recomp',
    createdAt: 0,
    updatedAt: 0,
  })
})

describe('measurements', () => {
  it('keeps one reading per site per day and reports change vs the previous reading', async () => {
    await saveMeasurements('2026-09-01', [
      { site: 'waist', cm: 86 },
      { site: 'arm', cm: 36 },
    ])
    await saveMeasurements('2026-09-20', [{ site: 'waist', cm: 85 }])
    await saveMeasurements('2026-09-20', [{ site: 'waist', cm: 84.46 }]) // correction, same day
    expect(await db.measurements.count()).toBe(3)
    const summary = summarizeMeasurements(await db.measurements.toArray())
    const waist = summary.find((s) => s.site === 'waist')!
    expect(waist.latest?.cm).toBe(84.5)
    expect(waist.change).toBe(-1.5)
    expect(summary.find((s) => s.site === 'arm')).toMatchObject({ change: null })
    expect(summary.find((s) => s.site === 'neck')).toMatchObject({ latest: null, change: null })
  })
})

describe('weigh-ins', () => {
  it('deleting the newest weigh-in falls back to the previous one for targets', async () => {
    await logWeight(80, '2026-09-20')
    await logWeight(78, '2026-09-26')
    expect((await db.profile.get('me'))?.weightKg).toBe(78)
    await deleteWeight('2026-09-26')
    expect((await db.profile.get('me'))?.weightKg).toBe(80)
    expect(await db.bodyWeights.count()).toBe(1)
  })
})

describe('photos', () => {
  it('stores photos as blobs on the device and deletes them', async () => {
    const id = await addPhoto('front', new Blob(['x'], { type: 'image/jpeg' }), '2026-09-26')
    const p = await db.photos.get(id)
    expect(p).toMatchObject({ pose: 'front', date: '2026-09-26' })
    await deletePhoto(id)
    expect(await db.photos.count()).toBe(0)
  })
})
