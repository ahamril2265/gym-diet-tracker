import { ArrowDown, ArrowUp, Trash } from 'lucide-react'
import { IconButton } from '../../components/Button'
import { NumberInput } from '../../components/NumberInput'
import { MUSCLE_LABEL } from '../../db/seed/exercises'
import type { Exercise, SplitExercise } from '../../db/types'

/** Editable list of planned exercises: sets × rep range, move up/down, remove. */
export function ExercisePlanList({
  items,
  exercises,
  onChange,
  emptyText = 'No exercises yet',
}: {
  items: SplitExercise[]
  exercises: Map<string, Exercise>
  onChange: (items: SplitExercise[]) => void
  emptyText?: string
}) {
  const update = (i: number, patch: Partial<SplitExercise>) => onChange(items.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    onChange(next)
  }

  if (items.length === 0) {
    return <p className="rounded-btn border border-dashed border-border p-4 text-center text-[14px] text-muted">{emptyText}</p>
  }

  return (
    <ol className="flex flex-col divide-y divide-divider">
      {items.map((e, i) => {
        const ex = exercises.get(e.exerciseId)
        const name = ex?.name ?? 'Unknown exercise'
        return (
          <li key={`${e.exerciseId}-${i}`} className="flex flex-col gap-2 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-[15px] font-bold">
                <span className="num mr-1.5 text-faint">{i + 1}.</span>
                {name}
              </span>
              {ex && <span className="shrink-0 text-[12px] font-bold text-faint">{MUSCLE_LABEL[ex.muscle]}</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <NumberInput label={`${name} sets`} value={e.sets} min={1} max={10} onValue={(sets) => update(i, { sets })} className="w-12" />
              <span className="text-[13px] font-bold text-faint" aria-hidden="true">
                ×
              </span>
              <NumberInput
                label={`${name} minimum reps`}
                value={e.repMin}
                min={1}
                max={100}
                onValue={(repMin) => update(i, { repMin, repMax: Math.max(repMin, e.repMax) })}
                className="w-12"
              />
              <span className="text-[13px] font-bold text-faint" aria-hidden="true">
                –
              </span>
              <NumberInput
                label={`${name} maximum reps`}
                value={e.repMax}
                min={1}
                max={100}
                onValue={(repMax) => update(i, { repMax, repMin: Math.min(repMax, e.repMin) })}
                className="w-12"
              />
              <div className="ml-auto flex">
                <IconButton label={`Move ${name} up`} variant="ghost" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp size={18} aria-hidden="true" />
                </IconButton>
                <IconButton label={`Move ${name} down`} variant="ghost" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown size={18} aria-hidden="true" />
                </IconButton>
                <IconButton label={`Remove ${name}`} variant="ghost" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                  <Trash size={18} aria-hidden="true" />
                </IconButton>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
