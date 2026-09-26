import type { Macros, Serving } from '../../db/types'
import { uid } from '../id'

export type Box = [ymin: number, xmin: number, ymax: number, xmax: number]

export interface MealItem {
  id: string
  name: string
  /** Unit for ONE of `quantity`, e.g. "roti", "katori". */
  portionLabel: string
  quantity: number
  /** Totals for the whole quantity. */
  grams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  confidence: number
  /** 0–1000 normalized, or null if the model gave no usable box. */
  box: Box | null
}

export interface LabelResult {
  productName: string
  per100g: Macros
  servingSize: Serving | null
  confidence: number
}

export class BadResponseError extends Error {
  constructor(message = 'The AI reply was not in the expected format.') {
    super(message)
    this.name = 'BadResponseError'
  }
}

const finite = (v: unknown, min = 0, max = Number.POSITIVE_INFINITY): number | null => {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null
}

const r1 = (n: number) => Math.round(n * 10) / 10

/** Models sometimes wrap JSON in ```json fences even with a JSON mime type. */
function parseJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new BadResponseError()
  }
}

function parseBox(v: unknown): Box | null {
  if (!Array.isArray(v) || v.length !== 4) return null
  const nums = v.map((x) => finite(x, 0, 1000))
  if (nums.some((x) => x === null)) return null
  const [ymin, xmin, ymax, xmax] = nums as number[]
  if (ymax! - ymin! < 5 || xmax! - xmin! < 5) return null
  return [ymin!, xmin!, ymax!, xmax!]
}

/** Validates and cleans the meal-scan reply. Invalid items are dropped rather than failing the scan. */
export function parseMealResponse(text: string): MealItem[] {
  const data = parseJson(text) as { items?: unknown }
  if (!data || typeof data !== 'object' || !Array.isArray(data.items)) throw new BadResponseError()
  const items: MealItem[] = []
  for (const raw of data.items as Record<string, unknown>[]) {
    if (!raw || typeof raw !== 'object') continue
    const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 60) : ''
    const kcal = finite(raw.kcal, 0, 5000)
    if (!name || kcal === null) continue
    const quantity = finite(raw.quantity, 0, 50)
    const unit = typeof raw.portionLabel === 'string' && raw.portionLabel.trim() ? raw.portionLabel.trim().slice(0, 24) : 'serving'
    items.push({
      id: uid(),
      name: name[0]!.toUpperCase() + name.slice(1),
      portionLabel: unit,
      quantity: quantity && quantity > 0 ? r1(quantity) : 1,
      grams: Math.round(finite(raw.grams, 0, 5000) ?? 0),
      kcal: Math.round(kcal),
      protein: r1(finite(raw.protein, 0, 500) ?? 0),
      carbs: r1(finite(raw.carbs, 0, 1000) ?? 0),
      fat: r1(finite(raw.fat, 0, 500) ?? 0),
      confidence: finite(raw.confidence, 0, 1) ?? 0.5,
      box: parseBox(raw.box),
    })
  }
  return items
}

/** Totals for a different quantity of the same item (values scale per unit). */
export function scaleMealItem(item: MealItem, quantity: number): { grams: number; macros: Macros } {
  const f = item.quantity > 0 ? quantity / item.quantity : 0
  return {
    grams: Math.round(item.grams * f),
    macros: { kcal: Math.round(item.kcal * f), protein: r1(item.protein * f), carbs: r1(item.carbs * f), fat: r1(item.fat * f) },
  }
}

/** Validates the nutrition-label reply; throws if the numbers are impossible. */
export function parseLabelResponse(text: string): LabelResult {
  const data = parseJson(text) as Record<string, unknown>
  const per = (data?.per100g ?? {}) as Record<string, unknown>
  const kcal = finite(per.kcal)
  const protein = finite(per.protein)
  const carbs = finite(per.carbs)
  const fat = finite(per.fat)
  if (kcal === null || protein === null || carbs === null || fat === null) throw new BadResponseError()
  if (kcal > 900 || protein + carbs + fat > 105) throw new BadResponseError('The label values don’t add up. Try a clearer photo.')
  const s = data.servingSize as Record<string, unknown> | null | undefined
  const sGrams = s ? finite(s.grams) : null
  const servingSize =
    s && sGrams && sGrams > 0 && sGrams <= 2000
      ? { label: (typeof s.label === 'string' && s.label.trim() ? s.label.trim() : 'serving').slice(0, 24), grams: r1(sGrams) }
      : null
  return {
    productName: typeof data.productName === 'string' ? data.productName.trim().slice(0, 60) : '',
    per100g: { kcal: Math.round(kcal), protein: r1(protein), carbs: r1(carbs), fat: r1(fat) },
    servingSize,
    confidence: finite(data.confidence, 0, 1) ?? 0.5,
  }
}
