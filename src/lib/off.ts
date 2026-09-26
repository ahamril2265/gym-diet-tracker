import type { Food, Macros, Serving } from '../db/types'

/**
 * Open Food Facts product lookup (free, no key). Only the barcode is sent. Browsers can't set User-Agent,
 * so the app identifies itself with the X-User-Agent header, which OFF's CORS policy allows.
 */
export const OFF_APP_ID = 'GymDietTracker/0.1 (personal PWA)'
const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product'
const FIELDS = 'code,product_name,product_name_en,brands,quantity,serving_size,serving_quantity,nutriments,image_front_small_url,image_front_url'

export type OffErrorKind = 'not-found' | 'offline' | 'network' | 'timeout'

export class OffError extends Error {
  readonly kind: OffErrorKind

  constructor(kind: OffErrorKind, message: string) {
    super(message)
    this.name = 'OffError'
    this.kind = kind
  }
}

export interface OffRaw {
  status?: number
  product?: {
    code?: string
    product_name?: string
    product_name_en?: string
    brands?: string
    quantity?: string
    serving_size?: string
    serving_quantity?: number | string
    image_front_small_url?: string
    image_front_url?: string
    nutriments?: Record<string, number | string | undefined>
  }
}

export interface OffProduct {
  barcode: string
  name: string
  brand?: string
  packQuantity?: string
  imageUrl?: string
  /** `null` when the product exists but has no usable nutrition table. */
  per100g: Macros | null
  serving: Serving | null
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : Number.NaN
  return Number.isFinite(n) && n >= 0 ? n : null
}

const r1 = (n: number) => Math.round(n * 10) / 10

/** Maps an OFF API response to the fields we use. Returns null when the product doesn't exist. */
export function mapOffProduct(barcode: string, raw: OffRaw): OffProduct | null {
  const p = raw.product
  if (raw.status !== 1 || !p) return null
  const n = p.nutriments ?? {}
  // Prefer kcal; some products only list energy in kJ.
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) !== null ? num(n['energy_100g'])! / 4.184 : null)
  const protein = num(n['proteins_100g'])
  const carbs = num(n['carbohydrates_100g'])
  const fat = num(n['fat_100g'])
  const per100g =
    kcal !== null && protein !== null && carbs !== null && fat !== null
      ? { kcal: Math.round(kcal), protein: r1(protein), carbs: r1(carbs), fat: r1(fat) }
      : null
  const servingGrams = num(p.serving_quantity)
  const serving =
    servingGrams && servingGrams > 0 && servingGrams <= 2000
      ? { label: shortServingLabel(p.serving_size), grams: r1(servingGrams) }
      : null
  const name = (p.product_name || p.product_name_en || '').trim()
  return {
    barcode,
    name: name || `Product ${barcode}`,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    packQuantity: p.quantity?.trim() || undefined,
    imageUrl: p.image_front_small_url || p.image_front_url || undefined,
    per100g,
    serving,
  }
}

/** "1 portion (30 g)" → "portion"; "2 biscuits (20 g)" → "2 biscuits"; missing → "serving". */
export function shortServingLabel(size?: string): string {
  const s = (size ?? '').replace(/\(.*?\)/g, '').trim()
  if (!s || /^\d+([.,]\d+)?\s*(g|ml|gm|grams?)$/i.test(s)) return 'serving'
  return s.replace(/^1\s+/, '').slice(0, 24)
}

/** Builds a Food record (source "off") for the local cache, or null if there's no nutrition data. */
export function offProductToFood(p: OffProduct): Omit<Food, 'id' | 'updatedAt'> | null {
  if (!p.per100g) return null
  return {
    name: p.name,
    brand: p.brand,
    per100g: p.per100g,
    servings: p.serving ? [p.serving] : [],
    source: 'off',
    barcode: p.barcode,
    imageUrl: p.imageUrl,
    packQuantity: p.packQuantity,
  }
}

export async function lookupBarcode(barcode: string, timeoutMs = 10_000): Promise<OffProduct> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new OffError('offline', 'You’re offline. Barcode lookups need internet.')
  }
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(`${OFF_BASE}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
      headers: { 'X-User-Agent': OFF_APP_ID },
      signal: ctrl.signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new OffError('timeout', 'Open Food Facts took too long to answer. Try again.')
    throw new OffError('network', 'Couldn’t reach Open Food Facts. Check your connection.')
  } finally {
    clearTimeout(t)
  }
  if (res.status === 404) throw new OffError('not-found', 'Product not found.')
  if (!res.ok) throw new OffError('network', `Open Food Facts error (${res.status}). Try again later.`)
  const product = mapOffProduct(barcode, (await res.json()) as OffRaw)
  if (!product) throw new OffError('not-found', 'Product not found.')
  return product
}
