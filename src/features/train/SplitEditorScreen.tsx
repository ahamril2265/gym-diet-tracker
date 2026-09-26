import { Check, ChevronLeft, Plus, Trash } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, IconButton } from '../../components/Button'
import { Field } from '../../components/Field'
import { Select } from '../../components/Select'
import { ScreenSkeleton } from '../../components/Skeleton'
import { SPLIT_TEMPLATES, type SplitTemplate } from '../../db/seed/splitTemplates'
import { applyTemplate, createBlankSplit, saveSplit } from '../../db/splits'
import type { Exercise, Split, SplitDay } from '../../db/types'
import { DEFAULT_TARGET } from '../../db/workouts'
import { useActiveSplit, useExerciseMap, type ActiveSplit } from '../../hooks/useAppData'
import { uid } from '../../lib/id'
import { WEEK_ORDER, WEEKDAY_SHORT } from '../../lib/date'
import { ExercisePickerSheet } from '../exercises/ExercisePickerSheet'
import { ExercisePlanList } from './ExercisePlanList'

const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

export default function SplitEditorScreen() {
  const navigate = useNavigate()
  const active = useActiveSplit()
  const exercises = useExerciseMap()

  if (active === undefined || !exercises) return <ScreenSkeleton />

  return (
    <div className="flex flex-col gap-5">
      <header className="-mx-2 flex items-center gap-1">
        <IconButton label="Back" variant="ghost" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} aria-hidden="true" />
        </IconButton>
        <div className="min-w-0">
          <p className="eyebrow">Training split</p>
          <h1 className="h-display text-[34px]">{active ? 'Edit split' : 'Set up split'}</h1>
        </div>
      </header>
      {active ? <Editor key={active.split.id} initial={active} exercises={exercises} /> : <TemplatePicker />}
    </div>
  )
}

/** Debounced autosave; flushes pending changes when the screen closes. */
function useAutoSave<T>(value: T, save: (v: T) => Promise<void>, delay = 500) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saved = useRef(value)
  const latest = useRef(value)
  latest.current = value

  useEffect(() => {
    if (value === saved.current) return
    setStatus('saving')
    const t = window.setTimeout(() => {
      saved.current = value
      void save(value).then(() => setStatus('saved'))
    }, delay)
    return () => window.clearTimeout(t)
  }, [value, save, delay])

  useEffect(
    () => () => {
      if (latest.current !== saved.current) void save(latest.current)
    },
    [save],
  )
  return status
}

const persist = ({ split, days }: { split: Split; days: SplitDay[] }) => saveSplit(split, days)

function Editor({ initial, exercises }: { initial: ActiveSplit; exercises: Map<string, Exercise> }) {
  const [split, setSplit] = useState<Split>(initial.split)
  const [days, setDays] = useState<SplitDay[]>(initial.days)
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const value = useMemo(() => ({ split, days }), [split, days])
  const status = useAutoSave(value, persist)

  const updateDay = (id: string, patch: Partial<SplitDay>) =>
    setDays((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)))

  const removeDay = (day: SplitDay) => {
    if (!window.confirm(`Delete ${day.name}? Past workouts are kept.`)) return
    setDays((ds) => ds.filter((d) => d.id !== day.id))
    setSplit((s) => ({ ...s, schedule: s.schedule.map((id) => (id === day.id ? null : id)) }))
  }

  const addDay = () => {
    const letter = String.fromCharCode(65 + (days.length % 26))
    setDays((ds) => [...ds, { id: uid(), splitId: split.id, name: `Day ${letter}`, order: ds.length, exercises: [] }])
  }

  const pickerDay = days.find((d) => d.id === pickerFor)

  return (
    <>
      <p role="status" className="-mt-3 flex h-5 items-center gap-1 text-[13px] font-bold text-faint">
        {status === 'saving' && 'Saving…'}
        {status === 'saved' && (
          <>
            <Check size={14} aria-hidden="true" /> Saved
          </>
        )}
      </p>

      <Field label="Split name">
        {(p) => (
          <input
            {...p}
            className="input"
            maxLength={40}
            value={split.name}
            onChange={(e) => setSplit((s) => ({ ...s, name: e.target.value }))}
          />
        )}
      </Field>

      <section className="card flex flex-col gap-2 p-4" aria-labelledby="week-h">
        <h2 id="week-h" className="h-display text-[24px]">
          Week
        </h2>
        {WEEK_ORDER.map((dow) => (
          <label key={dow} className="flex items-center gap-3">
            <span className="w-12 shrink-0 text-[14px] font-extrabold uppercase text-muted" aria-hidden="true">
              {WEEKDAY_SHORT[dow]}
            </span>
            <span className="sr-only">{WEEKDAY_LONG[dow]}</span>
            <div className="min-w-0 flex-1">
              <Select
                value={split.schedule[dow] ?? ''}
                onChange={(e) =>
                  setSplit((s) => ({ ...s, schedule: s.schedule.map((v, i) => (i === dow ? e.target.value || null : v)) }))
                }
              >
                <option value="">Rest</option>
                {days.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
          </label>
        ))}
      </section>

      <section aria-labelledby="days-h" className="flex flex-col gap-4">
        <h2 id="days-h" className="h-display text-[24px]">
          Days
        </h2>
        {days.map((day) => (
          <article key={day.id} className="card flex flex-col gap-3 p-4" aria-label={day.name}>
            <div className="flex items-end gap-2">
              <Field label="Day name" className="min-w-0 flex-1">
                {(p) => (
                  <input
                    {...p}
                    className="input"
                    maxLength={24}
                    value={day.name}
                    onChange={(e) => updateDay(day.id, { name: e.target.value })}
                  />
                )}
              </Field>
              <IconButton label={`Delete ${day.name}`} onClick={() => removeDay(day)} className="mb-0.5 text-danger">
                <Trash size={18} aria-hidden="true" />
              </IconButton>
            </div>

            <ExercisePlanList items={day.exercises} exercises={exercises} onChange={(list) => updateDay(day.id, { exercises: list })} />
            <Button variant="surface" size="sm" icon={<Plus size={16} aria-hidden="true" />} onClick={() => setPickerFor(day.id)}>
              Add exercises
            </Button>
          </article>
        ))}
        <Button variant="surface" block icon={<Plus size={18} aria-hidden="true" />} onClick={addDay}>
          Add day
        </Button>
      </section>

      <section aria-labelledby="tpl-h" className="card flex flex-col gap-3 p-4">
        <h2 id="tpl-h" className="h-display text-[24px]">
          Start over
        </h2>
        <p className="text-[13px] text-muted">Replaces this split. Your workout history is kept.</p>
        <TemplateButtons confirm />
      </section>

      <ExercisePickerSheet
        open={pickerDay !== undefined}
        title={`Add to ${pickerDay?.name ?? ''}`}
        onClose={() => setPickerFor(null)}
        disabledIds={new Set(pickerDay?.exercises.map((e) => e.exerciseId))}
        multiple
        onPickMany={(ids) => {
          if (pickerDay) {
            updateDay(pickerDay.id, { exercises: [...pickerDay.exercises, ...ids.map((exerciseId) => ({ exerciseId, ...DEFAULT_TARGET }))] })
          }
          setPickerFor(null)
        }}
      />
    </>
  )
}

function TemplateButtons({ confirm }: { confirm?: boolean }) {
  const ask = (msg: string) => !confirm || window.confirm(msg)
  const use = async (t: SplitTemplate) => {
    if (ask(`Replace your split with ${t.name}?`)) await applyTemplate(t)
  }
  return (
    <div className="flex flex-col gap-2">
      {SPLIT_TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => void use(t)}
          className="flex min-h-[56px] items-center justify-between gap-3 rounded-btn border border-border bg-surface-2 px-4 py-2 text-left active:bg-border"
        >
          <span>
            <span className="block text-[15px] font-extrabold">{t.name}</span>
            <span className="block text-[13px] font-semibold text-muted">{t.blurb}</span>
          </span>
          <Plus size={18} aria-hidden="true" className="shrink-0 text-faint" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => {
          if (ask('Replace your split with a blank one?')) void createBlankSplit()
        }}
        className="flex min-h-[56px] items-center justify-between gap-3 rounded-btn border border-dashed border-border px-4 py-2 text-left active:bg-surface-2"
      >
        <span>
          <span className="block text-[15px] font-extrabold">Blank split</span>
          <span className="block text-[13px] font-semibold text-muted">Build every day yourself</span>
        </span>
        <Plus size={18} aria-hidden="true" className="shrink-0 text-faint" />
      </button>
    </div>
  )
}

function TemplatePicker() {
  return (
    <section className="flex flex-col gap-3" aria-label="Choose a starting point">
      <p className="text-[15px] text-muted">Start from a template, then tweak days, exercises, sets and reps.</p>
      <TemplateButtons />
    </section>
  )
}
