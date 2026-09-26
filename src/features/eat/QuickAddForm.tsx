import { useState, type ReactNode } from 'react'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { Segmented } from '../../components/Segmented'
import type { Macros, Meal } from '../../db/types'
import { MEAL_LABEL, MEALS } from '../../lib/calc/nutrition'

export interface QuickAddValue {
  name: string
  macros: Macros
  meal: Meal
}

/** Log calories (and optionally macros) without a food — e.g. a restaurant meal you estimated. */
export function QuickAddForm({
  initial,
  meal: initialMeal,
  submitLabel,
  onSubmit,
  children,
}: {
  initial?: { name: string; macros: Macros }
  meal: Meal
  submitLabel: string
  onSubmit: (v: QuickAddValue) => void | Promise<void>
  children?: ReactNode
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [kcal, setKcal] = useState(initial ? String(initial.macros.kcal) : '')
  const [protein, setProtein] = useState(initial?.macros.protein ? String(initial.macros.protein) : '')
  const [carbs, setCarbs] = useState(initial?.macros.carbs ? String(initial.macros.carbs) : '')
  const [fat, setFat] = useState(initial?.macros.fat ? String(initial.macros.fat) : '')
  const [meal, setMeal] = useState<Meal>(initialMeal)
  const [error, setError] = useState<string | null>(null)

  const n = (s: string) => (s.trim() === '' ? 0 : Number(s.replace(',', '.')))

  return (
    <form
      className="flex flex-col gap-4 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        const k = n(kcal)
        const [p, c, f] = [n(protein), n(carbs), n(fat)]
        if (!kcal.trim() || !Number.isFinite(k) || k <= 0 || k > 5000) return setError('Enter calories between 1 and 5000')
        if (![p, c, f].every((v) => Number.isFinite(v) && v >= 0 && v <= 500)) return setError('Macros must be between 0 and 500 g')
        void onSubmit({
          name: name.trim() || 'Quick add',
          macros: { kcal: Math.round(k), protein: p, carbs: c, fat: f },
          meal,
        })
      }}
    >
      <Field label="What was it? (optional)">
        {(p) => <input {...p} className="input" maxLength={60} placeholder="Quick add" value={name} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <Field label="Calories" suffix="kcal" error={error}>
        {(p) => (
          <input
            {...p}
            className="input num pr-14"
            inputMode="numeric"
            value={kcal}
            onChange={(e) => {
              setKcal(e.target.value)
              setError(null)
            }}
          />
        )}
      </Field>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['Protein', protein, setProtein],
            ['Carbs', carbs, setCarbs],
            ['Fat', fat, setFat],
          ] as const
        ).map(([label, value, setter]) => (
          <Field key={label} label={label} suffix="g">
            {(p) => <input {...p} className="input num pr-8" inputMode="decimal" value={value} onChange={(e) => setter(e.target.value)} />}
          </Field>
        ))}
      </div>
      <Segmented legend="Meal" options={MEALS.map((m) => ({ value: m, label: MEAL_LABEL[m] }))} value={meal} onChange={setMeal} />
      <Button type="submit" block>
        {submitLabel}
      </Button>
      {children}
    </form>
  )
}
