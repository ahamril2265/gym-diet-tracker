import { Pencil, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { Field } from '../../components/Field'
import { setTargetsOverride } from '../../db/actions'
import type { MacroTargets } from '../../db/types'
import type { TargetsInfo } from '../../hooks/useAppData'
import { kcalFromMacros } from '../../lib/calc/targets'
import { TargetTiles } from './TargetTiles'

type Draft = Record<keyof MacroTargets, string>

const FIELDS: { key: keyof MacroTargets; label: string; suffix: string; max: number }[] = [
  { key: 'kcal', label: 'Calories', suffix: 'kcal', max: 8000 },
  { key: 'protein', label: 'Protein', suffix: 'g', max: 500 },
  { key: 'carbs', label: 'Carbs', suffix: 'g', max: 1000 },
  { key: 'fat', label: 'Fat', suffix: 'g', max: 400 },
]

const toDraft = (t: MacroTargets): Draft => ({
  kcal: String(t.kcal),
  protein: String(t.protein),
  carbs: String(t.carbs),
  fat: String(t.fat),
})

export function TargetsCard({ info }: { info: TargetsInfo }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => toDraft(info.targets))
  const [error, setError] = useState<string | null>(null)

  const parsed = Object.fromEntries(FIELDS.map((f) => [f.key, Number(draft[f.key])])) as unknown as MacroTargets
  const macroKcal = kcalFromMacros(parsed)

  async function save() {
    for (const f of FIELDS) {
      const v = parsed[f.key]
      if (!Number.isFinite(v) || v < 0 || v > f.max || draft[f.key].trim() === '') {
        setError(`${f.label} must be between 0 and ${f.max}`)
        return
      }
    }
    await setTargetsOverride({
      kcal: Math.round(parsed.kcal),
      protein: Math.round(parsed.protein),
      carbs: Math.round(parsed.carbs),
      fat: Math.round(parsed.fat),
    })
    setError(null)
    setEditing(false)
  }

  return (
    <section className="card p-5" aria-labelledby="targets-h">
      <div className="flex items-center justify-between gap-3">
        <h2 id="targets-h" className="h-display text-[24px]">
          Daily targets
        </h2>
        {info.isCustom ? <Chip tone="protein">Custom</Chip> : <Chip>Calculated</Chip>}
      </div>

      {editing ? (
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <Field key={f.key} label={f.label} suffix={f.suffix}>
                {(p) => (
                  <input
                    {...p}
                    className="input num pr-14"
                    inputMode="numeric"
                    value={draft[f.key]}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  />
                )}
              </Field>
            ))}
          </div>
          <p className="num text-[13px] text-faint">
            Macros add up to {Number.isFinite(macroKcal) ? Math.round(macroKcal).toLocaleString('en-IN') : '—'} kcal
          </p>
          {error && (
            <p role="alert" className="text-[13px] font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="surface" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" block>
              Save targets
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="mt-4">
            <TargetTiles targets={info.targets} />
          </div>
          {info.isCustom && (
            <p className="num mt-3 text-[13px] text-faint">
              Calculated: {info.calculated.kcal.toLocaleString('en-IN')} kcal · P {info.calculated.protein} · C{' '}
              {info.calculated.carbs} · F {info.calculated.fat}
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <Button
              variant="surface"
              size="sm"
              icon={<Pencil size={16} aria-hidden="true" />}
              onClick={() => {
                setDraft(toDraft(info.targets))
                setError(null)
                setEditing(true)
              }}
            >
              Edit
            </Button>
            {info.isCustom && (
              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCcw size={16} aria-hidden="true" />}
                onClick={() => void setTargetsOverride(null)}
              >
                Reset to calculated
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
