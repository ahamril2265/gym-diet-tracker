import { Minus, Pencil, Plus } from 'lucide-react'
import { useId, useMemo, useState, type ReactNode } from 'react'
import { Button, IconButton } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { cx } from '../../components/cx'
import { Segmented } from '../../components/Segmented'
import type { FoodSource, Macros, Meal, Serving } from '../../db/types'
import { MEAL_LABEL, MEALS, formatQty, portionLabel, scaleMacros } from '../../lib/calc/nutrition'

export interface PortionFood {
  name: string
  brand?: string
  per100g: Macros
  servings: Serving[]
  approximate?: boolean
  source?: FoodSource
}

export interface PortionResult {
  grams: number
  macros: Macros
  portionLabel: string
  serving: { label: string; grams: number; qty: number }
  meal: Meal
}

const GRAMS: Serving = { label: 'g', grams: 1 }

const HALF_STEP_UNITS = new Set(['katori', 'small katori', 'plate', 'bowl', 'glass', 'cup', '½ cup', 'serving'])

/** Reopens the serving an entry was logged with; falls back to grams if that serving no longer exists. */
function initialState(options: Serving[], initial?: { label: string; grams: number; qty: number }) {
  if (!initial) return { idx: 0, qty: options[0] === GRAMS ? 100 : 1 }
  const i = options.findIndex((o) => o.label === initial.label && o.grams === initial.grams)
  if (i >= 0) return { idx: i, qty: initial.qty }
  return { idx: options.length - 1, qty: Math.round(initial.grams * initial.qty) }
}

export const SOURCE_BADGE: Partial<Record<FoodSource, string>> = {
  custom: 'My food',
  off: 'Open Food Facts',
  ai: 'AI',
}

export interface PortionPickerProps {
  food: PortionFood
  initial?: { label: string; grams: number; qty: number }
  meal: Meal
  submitLabel: (meal: Meal) => string
  onSubmit: (r: PortionResult) => void | Promise<void>
  onEditFood?: () => void
  children?: ReactNode
}

export function PortionPicker({ food, initial, meal: initialMeal, submitLabel, onSubmit, onEditFood, children }: PortionPickerProps) {
  const options = useMemo(() => [...food.servings.filter((s) => s.grams > 0), GRAMS], [food.servings])
  const [start] = useState(() => initialState(options, initial))
  const [idx, setIdx] = useState(start.idx)
  const [qtyText, setQtyText] = useState(formatQty(start.qty))
  const [meal, setMeal] = useState<Meal>(initialMeal)
  const [busy, setBusy] = useState(false)
  const groupName = useId()

  const opt = options[idx] ?? GRAMS
  const isGrams = opt === GRAMS
  const qty = Number(qtyText.replace(',', '.'))
  const valid = Number.isFinite(qty) && qty > 0 && qty <= (isGrams ? 5000 : 50)
  const grams = valid ? Math.round(opt.grams * qty * 10) / 10 : 0
  const macros = scaleMacros(food.per100g, grams)
  // Measures (katori, glass…) step by halves; countable things (roti, idli, egg…) by whole units.
  const step = isGrams ? 10 : HALF_STEP_UNITS.has(opt.label) ? 0.5 : 1

  const choose = (i: number) => {
    const next = options[i] ?? GRAMS
    // Keep the same amount of food when switching unit (e.g. 2 roti → 80 g).
    if (valid) {
      const newQty = next === GRAMS ? grams : grams / next.grams
      setQtyText(formatQty(next === GRAMS ? Math.round(newQty) : Math.max(0.25, Math.round(newQty * 4) / 4)))
    }
    setIdx(i)
  }

  const bump = (dir: 1 | -1) => {
    const base = valid ? qty : 0
    // Snap to the next multiple of the step in that direction (1.5 roti → 2 or 1, not 2.5).
    const units = dir > 0 ? Math.floor(base / step + 1e-9) + 1 : Math.ceil(base / step - 1e-9) - 1
    setQtyText(formatQty(Math.max(step, units * step)))
  }

  const badge = food.source ? SOURCE_BADGE[food.source] : undefined

  return (
    <form
      className="flex flex-col gap-4 p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!valid || busy) return
        setBusy(true)
        try {
          await onSubmit({
            grams,
            macros,
            portionLabel: portionLabel(qty, opt.label),
            serving: { label: opt.label, grams: opt.grams, qty },
            meal,
          })
        } finally {
          setBusy(false)
        }
      }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[18px] font-extrabold leading-tight">{food.name}</p>
          {food.brand && <p className="text-[13px] font-semibold text-muted">{food.brand}</p>}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {food.approximate && <Chip className="h-6 px-2 text-[10px]">Approx. · IFCT/NIN</Chip>}
            {badge && <Chip tone="accent" className="h-6 px-2 text-[10px]">{badge}</Chip>}
            <span className="num text-[12px] font-semibold text-faint">
              per 100 g: {Math.round(food.per100g.kcal)} kcal · P {food.per100g.protein} · C {food.per100g.carbs} · F {food.per100g.fat}
            </span>
          </div>
        </div>
        {onEditFood && (
          <IconButton label={`Edit ${food.name}`} variant="ghost" onClick={onEditFood}>
            <Pencil size={18} aria-hidden="true" />
          </IconButton>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-[13px] font-bold text-muted">Serving</legend>
        <div className="flex flex-wrap gap-2">
          {options.map((o, i) => (
            <label
              key={`${o.label}-${o.grams}`}
              className={cx(
                'flex h-11 cursor-pointer items-center rounded-full border px-4 text-[14px] font-bold',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent',
                i === idx ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface-2 text-fg',
              )}
            >
              <input type="radio" className="sr-only" name={groupName} checked={i === idx} onChange={() => choose(i)} />
              {o === GRAMS ? 'grams' : (
                <>
                  {o.label}
                  <span className={cx('num ml-1.5 text-[12px]', i === idx ? 'text-on-accent/80' : 'text-faint')}>{o.grams} g</span>
                </>
              )}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <IconButton label={`${formatQty(step)} ${isGrams ? 'g' : opt.label} less`} onClick={() => bump(-1)}>
          <Minus size={20} aria-hidden="true" />
        </IconButton>
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{isGrams ? 'Grams' : `Number of ${opt.label}`}</span>
          <input
            className="input num h-14 pr-16 text-center text-[24px] font-extrabold"
            inputMode="decimal"
            value={qtyText}
            aria-invalid={!valid || undefined}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              if (/^\d{0,4}([.,]\d{0,2})?$/.test(e.target.value)) setQtyText(e.target.value)
            }}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 max-w-[56px] -translate-y-1/2 truncate text-[14px] font-bold text-faint">
            {isGrams ? 'g' : opt.label}
          </span>
        </label>
        <IconButton label={`${formatQty(step)} ${isGrams ? 'g' : opt.label} more`} onClick={() => bump(1)}>
          <Plus size={20} aria-hidden="true" />
        </IconButton>
      </div>

      <div className="rounded-card-sm bg-surface-2 p-4" aria-live="polite">
        <div className="flex items-baseline justify-between gap-3">
          <p>
            <span className="h-display num text-[44px] leading-none">{macros.kcal}</span>
            <span className="ml-1.5 text-[13px] font-extrabold uppercase tracking-[0.08em] text-muted">kcal</span>
          </p>
          <p className="num text-[14px] font-bold text-muted">{grams} g</p>
        </div>
        <dl className="num mt-2 grid grid-cols-3 gap-2 text-[14px] font-bold">
          <MacroStat label="Protein" value={macros.protein} className="text-protein" />
          <MacroStat label="Carbs" value={macros.carbs} className="text-carbs" />
          <MacroStat label="Fat" value={macros.fat} className="text-fat" />
        </dl>
      </div>

      <Segmented
        legend="Meal"
        options={MEALS.map((m) => ({ value: m, label: MEAL_LABEL[m] }))}
        value={meal}
        onChange={setMeal}
      />

      <Button type="submit" block disabled={!valid || busy}>
        {submitLabel(meal)}
      </Button>
      {children}
    </form>
  )
}

function MacroStat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div>
      <dt className={cx('text-[11px] font-extrabold uppercase tracking-[0.08em]', className)}>{label}</dt>
      <dd>{value} g</dd>
    </div>
  )
}
