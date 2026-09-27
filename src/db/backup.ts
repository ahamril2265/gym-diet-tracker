import { toCsv } from '../lib/csv'
import type { AppDB } from './db'
import { DEFAULT_SETTINGS } from './defaults'
import type { ProgressPhoto, Settings } from './types'

/*
 * Full JSON backup / restore and CSV exports. A backup holds every table; photos are embedded as
 * data URLs (optional, they make the file large). The Gemini API key is never written to a backup.
 */

export const BACKUP_APP = 'gym-diet-tracker'
export const BACKUP_VERSION = 1

export const TABLES = [
  'profile',
  'settings',
  'exercises',
  'splits',
  'splitDays',
  'workouts',
  'sets',
  'foods',
  'foodLogs',
  'bodyWeights',
  'measurements',
  'photos',
  'water',
] as const
export type TableName = (typeof TABLES)[number]

interface EncodedBlob {
  type: string
  dataUrl: string
}
type PhotoRow = Omit<ProgressPhoto, 'blob'> & { blob: EncodedBlob }

export interface Backup {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  includesPhotos: boolean
  tables: Partial<Record<TableName, unknown[]>>
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(bin)}`
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const m = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl)
  if (!m) throw new Error('Bad data URL')
  const bin = m[2] ? atob(m[3]!) : decodeURIComponent(m[3]!)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: m[1] || 'application/octet-stream' })
}

export async function createBackup(db: AppDB, { includePhotos }: { includePhotos: boolean }): Promise<Backup> {
  const tables: Partial<Record<TableName, unknown[]>> = {}
  for (const name of TABLES) {
    if (name === 'photos') continue
    tables[name] = await db.table(name).toArray()
  }
  // Never export the API key.
  tables.settings = (tables.settings as Settings[]).map((s) => ({ ...s, geminiApiKey: null }))
  if (includePhotos) {
    const photos = await db.photos.toArray()
    tables.photos = await Promise.all(photos.map(async (p): Promise<PhotoRow> => ({ ...p, blob: { type: p.blob.type, dataUrl: await blobToDataUrl(p.blob) } })))
  }
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), includesPhotos: includePhotos, tables }
}

export type ParseResult = { ok: true; backup: Backup; counts: Partial<Record<TableName, number>> } | { ok: false; error: string }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Checks a file really is one of our backups before anything is written. */
export function parseBackup(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file isn’t valid JSON.' }
  }
  if (!isObj(data) || data.app !== BACKUP_APP) return { ok: false, error: 'This isn’t a Gym & Diet Tracker backup.' }
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of the app. Update the app first.' }
  }
  if (!isObj(data.tables)) return { ok: false, error: 'The backup has no data.' }
  const counts: Partial<Record<TableName, number>> = {}
  for (const [name, rows] of Object.entries(data.tables)) {
    if (!(TABLES as readonly string[]).includes(name)) continue
    if (!Array.isArray(rows) || !rows.every(isObj)) return { ok: false, error: `The “${name}” section is damaged.` }
    counts[name as TableName] = rows.length
  }
  const profile = (data.tables as Record<string, unknown[]>).profile
  if (!profile?.length) return { ok: false, error: 'The backup has no profile, so it can’t be restored.' }
  return { ok: true, backup: data as unknown as Backup, counts }
}

/**
 * Writes a parsed backup. "replace" wipes everything first (except your Gemini key, which is kept);
 * "merge" adds the backup's rows and overwrites rows with the same id.
 */
export async function restoreBackup(db: AppDB, backup: Backup, mode: 'replace' | 'merge'): Promise<void> {
  const keepKey = (await db.settings.get('app'))?.geminiApiKey ?? null
  await db.transaction('rw', db.tables, async () => {
    if (mode === 'replace') for (const t of db.tables) await t.clear()
    for (const name of TABLES) {
      const rows = backup.tables[name]
      if (!rows?.length) continue
      if (name === 'photos') {
        await db.photos.bulkPut((rows as PhotoRow[]).map((p) => ({ ...p, blob: dataUrlToBlob(p.blob.dataUrl) })))
      } else if (name === 'settings') {
        await db.settings.bulkPut((rows as Settings[]).map((s) => ({ ...DEFAULT_SETTINGS, ...s, geminiApiKey: keepKey })))
      } else {
        await db.table(name).bulkPut(rows)
      }
    }
  })
}

// ---------------------------------------------------------------- CSV exports

export type CsvKind = 'workouts' | 'food' | 'weight' | 'measurements'

export async function exportCsv(db: AppDB, kind: CsvKind): Promise<string> {
  if (kind === 'workouts') {
    const [workouts, sets, exercises] = await Promise.all([db.workouts.toArray(), db.sets.toArray(), db.exercises.toArray()])
    const w = new Map(workouts.map((x) => [x.id, x]))
    const ex = new Map(exercises.map((x) => [x.id, x.name]))
    const rows = sets
      .filter((s) => s.done && w.get(s.workoutId)?.endedAt)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.completedAt ?? 0) - (b.completedAt ?? 0))
      .map((s) => [s.date, w.get(s.workoutId)?.name, ex.get(s.exerciseId) ?? s.exerciseId, s.order + 1, s.isWarmup ? 'yes' : 'no', s.kg, s.reps, s.rpe])
    return toCsv(['date', 'workout', 'exercise', 'set', 'warmup', 'kg', 'reps', 'rpe'], rows)
  }
  if (kind === 'food') {
    const logs = (await db.foodLogs.toArray()).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    return toCsv(
      ['date', 'meal', 'food', 'portion', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'ai_scan'],
      logs.map((l) => [l.date, l.meal, l.name, l.portionLabel, l.grams, l.macros.kcal, l.macros.protein, l.macros.carbs, l.macros.fat, l.aiScan ? 'yes' : 'no']),
    )
  }
  if (kind === 'weight') {
    const rows = await db.bodyWeights.orderBy('date').toArray()
    return toCsv(['date', 'kg'], rows.map((r) => [r.date, r.kg]))
  }
  const rows = (await db.measurements.toArray()).sort((a, b) => a.date.localeCompare(b.date) || a.site.localeCompare(b.site))
  return toCsv(['date', 'site', 'cm'], rows.map((r) => [r.date, r.site, r.cm]))
}
