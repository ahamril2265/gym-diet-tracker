import { beforeEach, describe, expect, it } from 'vitest'
import { toCsv } from '../lib/csv'
import { logWeight, updateSettings } from './actions'
import { createBackup, dataUrlToBlob, blobToDataUrl, exportCsv, parseBackup, restoreBackup } from './backup'
import { addPhoto, saveMeasurements } from './body'
import { db } from './db'
import { addLog } from './food'
import { initDb } from './init'
import { startWorkout, finishWorkout, updateSet } from './workouts'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await initDb(db)
  await db.profile.put({ id: 'me', name: 'Asha', sex: 'female', age: 29, heightCm: 162, weightKg: 58, activity: 'light', goal: 'cut', createdAt: 0, updatedAt: 0 })
  await db.settings.update('app', { onboarded: true, geminiApiKey: 'AIza-secret' })
})

async function seed() {
  await logWeight(58.2, '2026-09-20')
  await saveMeasurements('2026-09-20', [{ site: 'waist', cm: 70 }])
  await addLog({ date: '2026-09-20', meal: 'lunch', foodId: 'in-roti', name: 'Roti, "fresh"', portionLabel: '2 roti', grams: 80, macros: { kcal: 211, protein: 7.2, carbs: 40, fat: 1.9 } })
  await addPhoto('front', new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/jpeg' }), '2026-09-20')
  await db.splitDays.put({ id: 'd', splitId: 's', name: 'Push', order: 0, exercises: [{ exerciseId: 'bench-press', sets: 1, repMin: 5, repMax: 5 }] })
  const w = await startWorkout('d', new Date(2026, 8, 20, 18))
  const [s] = await db.sets.where('workoutId').equals(w).toArray()
  await updateSet(s!.id, { kg: 60, reps: 5, done: true, completedAt: Date.now() })
  await finishWorkout(w)
}

describe('CSV', () => {
  it('escapes commas, quotes and newlines', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'say "hi"'], [1, null], ['line\nbreak', true]])).toBe('a,b\r\n"x,y","say ""hi"""\r\n1,\r\n"line\nbreak",true\r\n')
  })

  it('exports each dataset', async () => {
    await seed()
    expect(await exportCsv(db, 'weight')).toBe('date,kg\r\n2026-09-20,58.2\r\n')
    expect(await exportCsv(db, 'measurements')).toBe('date,site,cm\r\n2026-09-20,waist,70\r\n')
    expect(await exportCsv(db, 'food')).toContain('2026-09-20,lunch,"Roti, ""fresh""",2 roti,80,211,7.2,40,1.9,no')
    expect(await exportCsv(db, 'workouts')).toContain('2026-09-20,Push,Bench Press,1,no,60,5,')
  })
})

describe('JSON backup', () => {
  it('round-trips blobs through data URLs', async () => {
    const blob = new Blob([new Uint8Array([0, 128, 255])], { type: 'image/jpeg' })
    const back = dataUrlToBlob(await blobToDataUrl(blob))
    expect(back.type).toBe('image/jpeg')
    expect([...new Uint8Array(await back.arrayBuffer())]).toEqual([0, 128, 255])
  })

  it('never includes the Gemini key', async () => {
    const b = await createBackup(db, { includePhotos: false })
    expect(JSON.stringify(b)).not.toContain('AIza-secret')
    expect(b.tables.photos).toBeUndefined()
  })

  it('restores everything into an empty database (replace), keeping the local key', async () => {
    await seed()
    const json = JSON.stringify(await createBackup(db, { includePhotos: true }))
    const counts = Object.fromEntries(await Promise.all(db.tables.map(async (t) => [t.name, await t.count()])))

    await Promise.all(db.tables.map((t) => t.clear()))
    await initDb(db)
    await updateSettings({ geminiApiKey: 'AIza-new-device' })

    const parsed = parseBackup(json)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    await restoreBackup(db, parsed.backup, 'replace')

    for (const t of db.tables) expect(await t.count(), t.name).toBe(counts[t.name])
    expect((await db.settings.get('app'))?.geminiApiKey).toBe('AIza-new-device')
    expect((await db.settings.get('app'))?.onboarded).toBe(true)
    const photo = (await db.photos.toArray())[0]!
    expect([...new Uint8Array(await photo.blob.arrayBuffer())]).toEqual([1, 2, 3, 250])
  })

  it('merges without wiping other data', async () => {
    await seed()
    const parsed = parseBackup(JSON.stringify(await createBackup(db, { includePhotos: false })))
    await logWeight(57.9, '2026-09-26') // added after the backup
    if (!parsed.ok) throw new Error('parse')
    await restoreBackup(db, parsed.backup, 'merge')
    expect(await db.bodyWeights.count()).toBe(2)
    expect(await db.photos.count()).toBe(1) // photo not in backup, kept
  })

  it('rejects files that are not our backups', () => {
    expect(parseBackup('nope')).toEqual({ ok: false, error: 'This file isn’t valid JSON.' })
    expect(parseBackup('{"app":"other"}')).toMatchObject({ ok: false })
    expect(parseBackup(JSON.stringify({ app: 'gym-diet-tracker', version: 99, tables: {} }))).toMatchObject({ ok: false })
    expect(parseBackup(JSON.stringify({ app: 'gym-diet-tracker', version: 1, tables: { profile: [] } }))).toMatchObject({ ok: false })
    expect(parseBackup(JSON.stringify({ app: 'gym-diet-tracker', version: 1, tables: { profile: [{}], sets: 'x' } }))).toMatchObject({ ok: false })
  })
})
