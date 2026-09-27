import { toISODate } from '../lib/date'
import { uid } from '../lib/id'
import { db } from './db'
import type { ISODate, Measurement, MeasurementSite, PhotoPose } from './types'

export const MEASUREMENT_SITES: { site: MeasurementSite; label: string }[] = [
  { site: 'chest', label: 'Chest' },
  { site: 'waist', label: 'Waist' },
  { site: 'hips', label: 'Hips' },
  { site: 'arm', label: 'Arm' },
  { site: 'thigh', label: 'Thigh' },
  { site: 'calf', label: 'Calf' },
  { site: 'shoulders', label: 'Shoulders' },
  { site: 'neck', label: 'Neck' },
  { site: 'forearm', label: 'Forearm' },
]

/** Saves one reading per site for a day (re-logging a site the same day replaces it). */
export async function saveMeasurements(date: ISODate, entries: { site: MeasurementSite; cm: number }[]): Promise<void> {
  await db.transaction('rw', db.measurements, async () => {
    for (const e of entries) {
      await db.measurements.where('[site+date]').equals([e.site, date]).delete()
      await db.measurements.add({ id: uid(), date, site: e.site, cm: Math.round(e.cm * 10) / 10 })
    }
  })
}

export async function deleteMeasurement(id: string): Promise<void> {
  await db.measurements.delete(id)
}

export interface SiteSummary {
  site: MeasurementSite
  latest: Measurement | null
  /** Change vs the previous reading for this site. */
  change: number | null
}

/** Latest reading per site and its change vs the reading before it. */
export function summarizeMeasurements(list: Measurement[]): SiteSummary[] {
  return MEASUREMENT_SITES.map(({ site }) => {
    const own = list.filter((m) => m.site === site).sort((a, b) => b.date.localeCompare(a.date))
    const [latest, previous] = own
    return {
      site,
      latest: latest ?? null,
      change: latest && previous ? Math.round((latest.cm - previous.cm) * 10) / 10 : null,
    }
  })
}

/** Removes a weigh-in; the profile weight (used for targets) falls back to the newest one left. */
export async function deleteWeight(date: ISODate): Promise<void> {
  await db.transaction('rw', db.bodyWeights, db.profile, async () => {
    await db.bodyWeights.delete(date)
    const latest = await db.bodyWeights.orderBy('date').last()
    if (latest) await db.profile.update('me', { weightKg: latest.kg, updatedAt: Date.now() })
  })
}

/**
 * Stores a progress photo on this device only. Also asks the browser to keep this site's storage
 * persistent, so photos aren't evicted when the phone is low on space.
 */
export async function addPhoto(pose: PhotoPose, blob: Blob, date: ISODate = toISODate()): Promise<string> {
  const id = uid()
  await db.photos.add({ id, date, pose, blob, createdAt: Date.now() })
  try {
    await navigator.storage?.persist?.()
  } catch {
    // Not supported — photos are still saved.
  }
  return id
}

export async function deletePhoto(id: string): Promise<void> {
  await db.photos.delete(id)
}
