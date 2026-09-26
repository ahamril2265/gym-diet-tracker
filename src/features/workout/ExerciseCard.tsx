import { ArrowLeftRight, ArrowRight, Check, NotebookPen, Plus, Trash } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Button, IconButton } from '../../components/Button'
import { cx } from '../../components/cx'
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '../../db/seed/exercises'
import type { Exercise, WeightUnit, WorkoutSet } from '../../db/types'
import { addSet, deleteSet, setExerciseNote, updateSet } from '../../db/workouts'
import { detectPRs, matchPrevious, type Bests } from '../../lib/calc/strength'
import { haptic, unlockAudio } from '../../lib/feedback'
import { formatSet, formatTarget, formatWeightValue } from '../../lib/format'
import { restTimer } from '../../lib/restTimer'
import { weightToKg } from '../../lib/units'
import { SetValueInput } from './SetValueInput'

/** Warm-ups rest at most this long. */
const WARMUP_REST_SEC = 60

export interface ExerciseCardProps {
  workoutId: string
  exercise: Exercise
  sets: WorkoutSet[]
  previous: WorkoutSet[]
  bests: Bests
  target: { sets: number; repMin: number; repMax: number }
  unit: WeightUnit
  restSec: number
  note: string
  onNext?: () => void
  onReplace: () => void
  onRemove: () => void
}

export function ExerciseCard(props: ExerciseCardProps) {
  const { workoutId, exercise, sets, previous, bests, target, unit, restSec, note, onNext, onReplace, onRemove } = props
  const [optionsFor, setOptionsFor] = useState<WorkoutSet | null>(null)
  const [notesOpen, setNotesOpen] = useState(note !== '')
  const [needsReps, setNeedsReps] = useState<string | null>(null)
  const repsRefs = useRef(new Map<string, HTMLInputElement>())

  const prevBySet = useMemo(() => matchPrevious(sets, previous), [sets, previous])
  const prs = useMemo(() => detectPRs(bests, sets), [bests, sets])
  const allDone = sets.length > 0 && sets.every((s) => s.done)

  let working = 0
  const labels = new Map(sets.map((s) => [s.id, s.isWarmup ? 'W' : String(++working)]))

  async function toggle(s: WorkoutSet) {
    unlockAudio()
    if (s.done) {
      await updateSet(s.id, { done: false, completedAt: undefined })
      return
    }
    if (s.reps === null) {
      setNeedsReps(s.id)
      repsRefs.current.get(s.id)?.focus()
      return
    }
    setNeedsReps(null)
    await updateSet(s.id, { done: true, kg: s.kg ?? 0, completedAt: Date.now() })
    haptic()
    restTimer.start(workoutId, s.isWarmup ? Math.min(WARMUP_REST_SEC, restSec) : restSec)
  }

  const nameId = `ex-${exercise.id}`

  return (
    <section aria-labelledby={nameId} className="card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 id={nameId} className="h-display text-[28px]">
            {exercise.name}
          </h2>
          <p className="text-[13px] font-bold text-muted">
            {MUSCLE_LABEL[exercise.muscle]} · {EQUIPMENT_LABEL[exercise.equipment]} ·{' '}
            <span className="num">{formatTarget(target)}</span>
          </p>
        </div>
        <IconButton label={`Replace ${exercise.name}`} variant="ghost" onClick={onReplace}>
          <ArrowLeftRight size={18} aria-hidden="true" />
        </IconButton>
        <IconButton
          label={`Remove ${exercise.name}`}
          variant="ghost"
          onClick={() => {
            if (!sets.some((s) => s.done) || window.confirm(`Remove ${exercise.name} and its ticked sets?`)) onRemove()
          }}
        >
          <Trash size={18} aria-hidden="true" />
        </IconButton>
      </div>

      <table className="mt-3 w-full table-fixed border-separate border-spacing-y-1">
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-[74px]" />
          <col className="w-[58px]" />
          <col className="w-12" />
        </colgroup>
        <thead>
          <tr className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-faint">
            <th scope="col">Set</th>
            <th scope="col" className="pl-2 text-left">
              Previous
            </th>
            <th scope="col">{unit}</th>
            <th scope="col">Reps</th>
            <th scope="col">
              <span className="sr-only">Done</span>
              <Check size={14} className="mx-auto" aria-hidden="true" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sets.map((s) => {
            const label = labels.get(s.id)!
            const prev = prevBySet.get(s.id)
            const pr = prs.get(s.id)
            const name = s.isWarmup ? 'Warm-up set' : `Set ${label}`
            const cell = cx('py-0.5', s.done && 'bg-accent/10')
            return (
              <tr key={s.id}>
                <td className={cx(cell, 'rounded-l-btn-sm')}>
                  <button
                    type="button"
                    aria-label={`${name} options`}
                    onClick={() => setOptionsFor(s)}
                    className={cx(
                      'num flex h-11 w-full items-center justify-center rounded-btn-sm text-[15px] font-extrabold active:bg-surface-2',
                      s.isWarmup ? 'text-flame' : 'text-fg',
                    )}
                  >
                    {label}
                  </button>
                </td>
                <td className={cx(cell, 'pl-2')}>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span className="num truncate text-[14px] font-semibold text-muted">
                      {prev ? formatSet(prev.kg, prev.reps, unit) : '—'}
                    </span>
                    {pr && (
                      <span
                        className="rounded-full bg-flame px-1.5 py-px text-[10px] font-extrabold uppercase tracking-[0.06em] text-on-accent"
                        title={pr.includes('e1rm') ? 'Best estimated 1RM ever' : 'Heaviest for these reps'}
                      >
                        PR<span className="sr-only">: personal record</span>
                      </span>
                    )}
                  </span>
                </td>
                <td className={cx(cell, 'px-0.5')}>
                  <SetValueInput
                    label={`${name} weight (${unit})`}
                    value={s.kg}
                    decimals
                    done={s.done}
                    placeholder="0"
                    format={(kg) => formatWeightValue(kg, unit)}
                    onValue={(v) => void updateSet(s.id, { kg: v === null ? null : weightToKg(v, unit) })}
                  />
                </td>
                <td className={cx(cell, 'px-0.5')}>
                  <SetValueInput
                    ref={(el) => {
                      if (el) repsRefs.current.set(s.id, el)
                      else repsRefs.current.delete(s.id)
                    }}
                    label={`${name} reps`}
                    value={s.reps}
                    decimals={false}
                    done={s.done}
                    placeholder={String(target.repMin)}
                    format={String}
                    onValue={(v) => {
                      if (v !== null) setNeedsReps(null)
                      void updateSet(s.id, { reps: v })
                    }}
                  />
                </td>
                <td className={cx(cell, 'rounded-r-btn-sm pl-1')}>
                  <button
                    type="button"
                    aria-label={`${name} done`}
                    aria-pressed={s.done}
                    onClick={() => void toggle(s)}
                    className={cx(
                      'flex h-11 w-11 items-center justify-center rounded-btn-sm border transition-colors',
                      s.done ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface-2 text-faint active:bg-border',
                    )}
                  >
                    <Check size={20} strokeWidth={3} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {needsReps && (
        <p role="alert" className="mt-1 text-[13px] font-semibold text-danger">
          Enter reps before ticking the set.
        </p>
      )}

      {notesOpen && <ExerciseNotes workoutId={workoutId} exerciseId={exercise.id} note={note} />}

      <div className="mt-3 flex gap-2">
        <Button variant="surface" size="sm" icon={<Plus size={16} aria-hidden="true" />} onClick={() => void addSet(workoutId, exercise.id)}>
          Add set
        </Button>
        <Button
          variant={notesOpen ? 'surface' : 'ghost'}
          size="sm"
          aria-expanded={notesOpen}
          icon={<NotebookPen size={16} aria-hidden="true" />}
          onClick={() => setNotesOpen((o) => !o)}
        >
          Notes
        </Button>
        {allDone && onNext && (
          <Button size="sm" className="ml-auto" onClick={onNext}>
            Next
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        )}
      </div>

      <BottomSheet open={optionsFor !== null} onClose={() => setOptionsFor(null)} title={optionsFor ? `Set ${labels.get(optionsFor.id) ?? ''}` : ''}>
        {optionsFor && (
          <div className="flex flex-col gap-3 p-4">
            <Button
              variant="surface"
              block
              onClick={() => {
                void updateSet(optionsFor.id, { isWarmup: !optionsFor.isWarmup })
                setOptionsFor(null)
              }}
            >
              {optionsFor.isWarmup ? 'Mark as working set' : 'Mark as warm-up'}
            </Button>
            <Button
              variant="danger"
              block
              icon={<Trash size={18} aria-hidden="true" />}
              onClick={() => {
                void deleteSet(optionsFor.id)
                setOptionsFor(null)
              }}
            >
              Delete set
            </Button>
          </div>
        )}
      </BottomSheet>
    </section>
  )
}

function ExerciseNotes({ workoutId, exerciseId, note }: { workoutId: string; exerciseId: string; note: string }) {
  const [text, setText] = useState(note)
  const latest = useRef(text)
  latest.current = text

  // Save shortly after typing stops, and on close.
  useEffect(() => {
    if (text === note) return
    const t = window.setTimeout(() => void setExerciseNote(workoutId, exerciseId, text), 600)
    return () => window.clearTimeout(t)
  }, [text, note, workoutId, exerciseId])
  useEffect(
    () => () => {
      void setExerciseNote(workoutId, exerciseId, latest.current)
    },
    [workoutId, exerciseId],
  )

  return (
    <label className="mt-3 block">
      <span className="sr-only">Notes for this exercise</span>
      <textarea
        className="input h-20 resize-none py-2 text-[15px] font-medium"
        placeholder="Seat height, grip, how it felt…"
        maxLength={500}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </label>
  )
}
