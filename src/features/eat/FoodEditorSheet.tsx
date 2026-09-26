import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Button, IconButton } from '../../components/Button'
import { Field } from '../../components/Field'
import { saveFood } from '../../db/food'
import type { Food } from '../../db/types'
import { kcalFromMacros } from '../../lib/calc/targets'

interface Draft {
  name: string
  brand: string
  kcal: string
  protein: string
  carbs: string
  fat: string
  servings: { label: string; grams: string }[]
}

export type FoodPrefill = Partial<Pick<Food, 'name' | 'brand' | 'per100g' | 'servings' | 'barcode' | 'imageUrl' | 'packQuantity'>>

const toDraft = (food: Food | null, name: string, initial?: FoodPrefill): Draft => {
  const f = food || initial ? ({ ...food, ...initial } as Partial<Food>) : null
  return f && f.per100g
    ? {
        name: f.name ?? name,
        brand: f.brand ?? '',
        kcal: String(f.per100g.kcal),
        protein: String(f.per100g.protein),
        carbs: String(f.per100g.carbs),
        fat: String(f.per100g.fat),
        servings: (f.servings ?? []).map((s) => ({ label: s.label, grams: String(s.grams) })),
      }
    : { name: f?.name ?? name, brand: f?.brand ?? '', kcal: '', protein: '', carbs: '', fat: '', servings: [{ label: 'serving', grams: '' }] }
}

const num = (s: string) => (s.trim() === '' ? Number.NaN : Number(s.replace(',', '.')))

export interface FoodEditorSheetProps {
  open: boolean
  /** Food to edit, or null to create one. */
  food: Food | null
  initialName?: string
  /** Values to start from (e.g. read from a nutrition label). Overrides the food's own values. */
  initial?: FoodPrefill
  /** Shown above the form, e.g. "Read by AI — check the numbers". */
  note?: string
  title?: string
  onClose: () => void
  onSaved: (id: string) => void
}

/** Create a food or edit any food (including built-in ones). Values are per 100 g, like Indian labels. */
export function FoodEditorSheet({ open, food, initialName = '', initial, note, title, onClose, onSaved }: FoodEditorSheetProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(food, initialName, initial))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setDraft(toDraft(food, initialName, initial))
      setError(null)
    }
  }, [open, food, initialName, initial])

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const p = num(draft.protein)
  const c = num(draft.carbs)
  const f = num(draft.fat)
  const k = num(draft.kcal)
  const implied = [p, c, f].every(Number.isFinite) ? Math.round(kcalFromMacros({ protein: p, carbs: c, fat: f })) : null
  const mismatch = implied !== null && Number.isFinite(k) && k > 0 && Math.abs(implied - k) > Math.max(20, k * 0.15)

  async function save() {
    const name = draft.name.trim()
    if (!name) return setError('Enter a name')
    if (!Number.isFinite(k) || k < 0 || k > 900) return setError('Calories per 100 g must be between 0 and 900')
    for (const [label, v] of [
      ['Protein', p],
      ['Carbs', c],
      ['Fat', f],
    ] as const) {
      if (!Number.isFinite(v) || v < 0 || v > 100) return setError(`${label} per 100 g must be between 0 and 100`)
    }
    if (p + c + f > 100.5) return setError('Protein + carbs + fat can’t exceed 100 g per 100 g')
    const servings = draft.servings
      .filter((s) => s.label.trim() || s.grams.trim())
      .map((s) => ({ label: s.label.trim(), grams: num(s.grams) }))
    if (servings.some((s) => !s.label || !(s.grams > 0 && s.grams <= 2000))) {
      return setError('Each serving needs a name and a weight in grams')
    }
    const id = await saveFood({
      id: food?.id,
      name,
      brand: draft.brand.trim() || undefined,
      per100g: { kcal: k, protein: p, carbs: c, fat: f },
      servings,
      barcode: initial?.barcode ?? food?.barcode,
      imageUrl: initial?.imageUrl ?? food?.imageUrl,
      packQuantity: initial?.packQuantity ?? food?.packQuantity,
      aliases: food?.aliases,
    })
    onSaved(id)
  }

  const decimalField = (label: string, key: 'kcal' | 'protein' | 'carbs' | 'fat', suffix: string) => (
    <Field label={label} suffix={suffix}>
      {(fp) => (
        <input {...fp} className="input num pr-12" inputMode="decimal" value={draft[key]} onChange={(e) => set({ [key]: e.target.value })} />
      )}
    </Field>
  )

  return (
    <BottomSheet open={open} onClose={onClose} title={title ?? (food ? 'Edit food' : 'New food')}>
      <form
        className="flex flex-col gap-4 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {note && <p className="rounded-btn-sm border border-flame/40 bg-flame/10 px-3 py-2 text-[13px] font-semibold text-flame">{note}</p>}
        <Field label="Name">
          {(fp) => <input {...fp} className="input" maxLength={60} value={draft.name} onChange={(e) => set({ name: e.target.value })} />}
        </Field>
        <Field label="Brand (optional)">
          {(fp) => <input {...fp} className="input" maxLength={40} value={draft.brand} onChange={(e) => set({ brand: e.target.value })} />}
        </Field>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-[13px] font-extrabold uppercase tracking-[0.08em] text-muted">Per 100 g</legend>
          <div className="grid grid-cols-2 gap-3">
            {decimalField('Calories', 'kcal', 'kcal')}
            {decimalField('Protein', 'protein', 'g')}
            {decimalField('Carbs', 'carbs', 'g')}
            {decimalField('Fat', 'fat', 'g')}
          </div>
          {implied !== null && (
            <p className={mismatch ? 'text-[13px] font-semibold text-flame' : 'num text-[13px] text-faint'}>
              Macros add up to {implied} kcal{mismatch ? ' — check the numbers' : ''}
            </p>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[13px] font-extrabold uppercase tracking-[0.08em] text-muted">Servings</legend>
          {draft.servings.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                aria-label={`Serving ${i + 1} name`}
                className="input min-w-0 flex-1"
                placeholder="e.g. katori, piece"
                maxLength={20}
                value={s.label}
                onChange={(e) => set({ servings: draft.servings.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
              />
              <div className="relative w-24 shrink-0">
                <input
                  aria-label={`Serving ${i + 1} grams`}
                  className="input num pr-8"
                  inputMode="decimal"
                  value={s.grams}
                  onChange={(e) => set({ servings: draft.servings.map((x, j) => (j === i ? { ...x, grams: e.target.value } : x)) })}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-faint">g</span>
              </div>
              <IconButton
                label={`Remove serving ${i + 1}`}
                variant="ghost"
                onClick={() => set({ servings: draft.servings.filter((_, j) => j !== i) })}
              >
                <X size={18} aria-hidden="true" />
              </IconButton>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            icon={<Plus size={16} aria-hidden="true" />}
            onClick={() => set({ servings: [...draft.servings, { label: '', grams: '' }] })}
          >
            Add serving
          </Button>
        </fieldset>

        {error && (
          <p role="alert" className="text-[13px] font-semibold text-danger">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="surface" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" block>
            Save food
          </Button>
        </div>
        {food && <p className="text-[12px] text-faint">Past entries keep the values they were logged with.</p>}
      </form>
    </BottomSheet>
  )
}
