import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronRight, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Chip } from '../../components/Chip'
import { cx } from '../../components/cx'
import { Select } from '../../components/Select'
import { Skeleton } from '../../components/Skeleton'
import { db } from '../../db/db'
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '../../db/seed/exercises'
import type { Equipment, Exercise, Muscle } from '../../db/types'

const MUSCLES = Object.keys(MUSCLE_LABEL) as Muscle[]
const EQUIPMENT = Object.keys(EQUIPMENT_LABEL) as Equipment[]

export interface ExerciseListProps {
  /** Makes rows tappable. Rows for which `canSelect` returns false stay plain text. */
  onSelect?: (ex: Exercise) => void
  canSelect?: (ex: Exercise) => boolean
  /** Shown as "Added" and not selectable (e.g. exercises already in the workout). */
  disabledIds?: Set<string>
  autoFocus?: boolean
  /** Multi-select mode: rows toggle instead of picking, and show their pick order. */
  selectedIds?: string[]
  onToggle?: (ex: Exercise) => void
}

export function filterExercises(all: Exercise[], query: string, muscle: Muscle | 'all', equipment: Equipment | 'all') {
  const q = query.trim().toLowerCase()
  return all.filter(
    (e) =>
      (muscle === 'all' || e.muscle === muscle) &&
      (equipment === 'all' || e.equipment === equipment) &&
      (!q ||
        e.name.toLowerCase().includes(q) ||
        MUSCLE_LABEL[e.muscle].toLowerCase().includes(q) ||
        EQUIPMENT_LABEL[e.equipment].toLowerCase().includes(q)),
  )
}

/** Searchable exercise list grouped by muscle, with muscle chips and an equipment filter. */
export function ExerciseList({ onSelect, canSelect = () => true, disabledIds, autoFocus, selectedIds, onToggle }: ExerciseListProps) {
  const all = useLiveQuery(() => db.exercises.orderBy('name').toArray())
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | 'all'>('all')
  const [equipment, setEquipment] = useState<Equipment | 'all'>('all')

  const groups = useMemo(() => {
    if (!all) return []
    const filtered = filterExercises(all, query, muscle, equipment)
    return MUSCLES.map((m) => ({ muscle: m, items: filtered.filter((e) => e.muscle === m) })).filter((g) => g.items.length)
  }, [all, query, muscle, equipment])

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 px-4 pb-3 pt-3">
        <label className="relative block">
          <span className="sr-only">Search exercises</span>
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="search"
            className="input pl-11"
            placeholder="Search exercises"
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filter by muscle">
          {(['all', ...MUSCLES] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={muscle === m}
              onClick={() => setMuscle(m)}
              className={cx(
                'h-11 shrink-0 rounded-full border px-4 text-[13px] font-extrabold uppercase tracking-[0.06em]',
                muscle === m ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface-2 text-muted',
              )}
            >
              {m === 'all' ? 'All' : MUSCLE_LABEL[m]}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-3">
          <span className="shrink-0 text-[13px] font-bold text-muted">Equipment</span>
          <div className="min-w-0 flex-1">
            <Select value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment | 'all')}>
              <option value="all">Any equipment</option>
              {EQUIPMENT.map((q) => (
                <option key={q} value={q}>
                  {EQUIPMENT_LABEL[q]}
                </option>
              ))}
            </Select>
          </div>
        </label>
      </div>

      {!all ? (
        <div className="flex flex-col gap-2 px-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="px-5 py-8 text-center text-[14px] text-muted">No exercises match. Try another search or create one.</p>
      ) : (
        groups.map((g) => (
          <section key={g.muscle} aria-labelledby={`grp-${g.muscle}`} className="pb-2">
            <h3
              id={`grp-${g.muscle}`}
              className="sticky top-0 z-10 flex items-baseline justify-between bg-surface px-5 py-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-muted"
            >
              {MUSCLE_LABEL[g.muscle]}
              <span className="num text-faint">{g.items.length}</span>
            </h3>
            <ul>
              {g.items.map((ex) => (
                <li key={ex.id}>
                  {onToggle ? (
                    <ToggleRow
                      ex={ex}
                      disabled={disabledIds?.has(ex.id) ?? false}
                      position={(selectedIds?.indexOf(ex.id) ?? -1) + 1}
                      onToggle={() => onToggle(ex)}
                    />
                  ) : (
                    <ExerciseRow
                      ex={ex}
                      disabled={disabledIds?.has(ex.id) ?? false}
                      onSelect={onSelect && canSelect(ex) ? () => onSelect(ex) : undefined}
                    />
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

function ExerciseRow({ ex, onSelect, disabled }: { ex: Exercise; onSelect?: () => void; disabled: boolean }) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-fg">{ex.name}</span>
        <span className="block text-[13px] font-semibold text-muted">
          {EQUIPMENT_LABEL[ex.equipment]} · {ex.isCompound ? 'Compound' : 'Isolation'}
        </span>
      </span>
      {ex.custom && <Chip className="h-6 px-2 text-[10px]">Custom</Chip>}
      {disabled ? (
        <span className="flex items-center gap-1 text-[13px] font-bold text-faint">
          <Check size={16} aria-hidden="true" /> Added
        </span>
      ) : (
        onSelect && <ChevronRight size={18} aria-hidden="true" className="text-faint" />
      )}
    </>
  )
  const cls = 'flex min-h-[60px] w-full items-center gap-3 border-b border-divider px-5 py-2 text-left'
  if (!onSelect || disabled) return <div className={cls}>{body}</div>
  return (
    <button type="button" onClick={onSelect} className={cx(cls, 'active:bg-surface-2')}>
      {body}
    </button>
  )
}

/** Multi-select row: a toggle button whose badge shows the order it was picked in (0 = not picked). */
function ToggleRow({ ex, position, disabled, onToggle }: { ex: Exercise; position: number; disabled: boolean; onToggle: () => void }) {
  const picked = position > 0
  return (
    <button
      type="button"
      aria-pressed={picked}
      disabled={disabled}
      onClick={onToggle}
      className={cx(
        'flex min-h-[60px] w-full items-center gap-3 border-b border-divider px-5 py-2 text-left disabled:opacity-60',
        picked ? 'bg-accent/10' : 'active:bg-surface-2',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-fg">{ex.name}</span>
        <span className="block text-[13px] font-semibold text-muted">
          {EQUIPMENT_LABEL[ex.equipment]} · {ex.isCompound ? 'Compound' : 'Isolation'}
          {disabled ? ' · already added' : ''}
        </span>
      </span>
      {ex.custom && <Chip className="h-6 px-2 text-[10px]">Custom</Chip>}
      <span
        aria-hidden="true"
        className={cx(
          'num flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-extrabold',
          picked ? 'border-accent bg-accent text-on-accent' : 'border-border text-transparent',
          disabled && 'border-border bg-surface-2',
        )}
      >
        {disabled ? <Check size={14} className="text-faint" /> : picked ? position : ''}
      </span>
    </button>
  )
}
