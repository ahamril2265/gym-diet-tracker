import { ChevronLeft, Play, Plus, Save, Trash } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button, ButtonLink, IconButton } from '../../components/Button'
import { cx } from '../../components/cx'
import { Field } from '../../components/Field'
import { ScreenSkeleton } from '../../components/Skeleton'
import { deleteRoutine, saveRoutine } from '../../db/splits'
import type { Exercise, Settings, SplitDay, SplitExercise } from '../../db/types'
import { DEFAULT_TARGET } from '../../db/workouts'
import { useActiveSplit, useActiveWorkout, useExerciseMap, useSettings, type ActiveSplit } from '../../hooks/useAppData'
import { estimateSessionMinutes } from '../../lib/calc/workoutTime'
import { WEEK_ORDER, WEEKDAY_SHORT } from '../../lib/date'
import { ExercisePickerSheet } from '../exercises/ExercisePickerSheet'
import { useStartWorkout } from '../workout/useStartWorkout'
import { ExercisePlanList } from './ExercisePlanList'
import { suggestRoutineName } from './routineName'

const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

export default function RoutineBuilderScreen() {
  const { id } = useParams()
  const active = useActiveSplit()
  const exercises = useExerciseMap()
  const settings = useSettings()

  if (active === undefined || !exercises || !settings) return <ScreenSkeleton />
  const existing = id ? (active?.days.find((d) => d.id === id) ?? null) : null
  if (id && !existing) {
    return (
      <div className="flex flex-col items-start gap-4 pt-10">
        <h1 className="h-display text-[36px]">Routine not found</h1>
        <p className="text-muted">It may have been deleted.</p>
        <ButtonLink to="/train">Back to Train</ButtonLink>
      </div>
    )
  }
  return <Builder key={id ?? 'new'} existing={existing} split={active} exercises={exercises} settings={settings} />
}

function Builder({
  existing,
  split,
  exercises,
  settings,
}: {
  existing: SplitDay | null
  split: ActiveSplit | null
  exercises: Map<string, Exercise>
  settings: Settings
}) {
  const navigate = useNavigate()
  const workout = useActiveWorkout()
  const { start } = useStartWorkout()
  const [name, setName] = useState(existing?.name ?? '')
  const [items, setItems] = useState<SplitExercise[]>(existing?.exercises ?? [])
  const [weekdays, setWeekdays] = useState<number[]>(() =>
    existing && split ? WEEK_ORDER.filter((d) => split.split.schedule[d] === existing.id) : [],
  )
  // A new routine starts by picking exercises.
  const [pickerOpen, setPickerOpen] = useState(existing === null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const suggestion = suggestRoutineName(items, exercises)
  const minutes = estimateSessionMinutes(
    items.flatMap((e) => {
      const ex = exercises.get(e.exerciseId)
      return ex ? [{ sets: e.sets, isCompound: ex.isCompound }] : []
    }),
    { compoundSec: settings.restCompoundSec, accessorySec: settings.restAccessorySec },
  )
  const occupant = (dow: number) => {
    const dayId = split?.split.schedule[dow]
    if (!dayId || dayId === existing?.id) return null
    return split?.days.find((d) => d.id === dayId)?.name ?? null
  }
  const replaced = weekdays.flatMap((dow) => {
    const other = occupant(dow)
    return other ? [`${other} on ${WEEKDAY_SHORT[dow]}`] : []
  })

  async function save(andStart: boolean) {
    if (items.length === 0) {
      setError('Add at least one exercise')
      return
    }
    setSaving(true)
    try {
      const dayId = await saveRoutine({ id: existing?.id, name: name.trim() || suggestion, exercises: items, weekdays })
      if (andStart) await start(dayId)
      else navigate('/train')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="-mx-2 flex items-center gap-1">
        <IconButton label="Back" variant="ghost" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} aria-hidden="true" />
        </IconButton>
        <div className="min-w-0">
          <p className="eyebrow">Train</p>
          <h1 className="h-display text-[34px]">{existing ? 'Edit routine' : 'New routine'}</h1>
        </div>
      </header>

      <Field label="Routine name">
        {(p) => (
          <input
            {...p}
            className="input"
            maxLength={24}
            placeholder={suggestion}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </Field>

      <section className="card flex flex-col gap-3 p-4" aria-labelledby="rt-ex-h">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="rt-ex-h" className="h-display text-[24px]">
            Exercises
          </h2>
          {items.length > 0 && (
            <span className="num text-[13px] font-bold text-muted">
              {items.length} lifts · ~{minutes} min
            </span>
          )}
        </div>
        <ExercisePlanList
          items={items}
          exercises={exercises}
          onChange={(list) => {
            setItems(list)
            setError(null)
          }}
          emptyText="Pick the exercises for this routine"
        />
        <Button variant="surface" icon={<Plus size={18} aria-hidden="true" />} onClick={() => setPickerOpen(true)}>
          {items.length ? 'Add more exercises' : 'Select exercises'}
        </Button>
      </section>

      <section className="card flex flex-col gap-3 p-4" aria-labelledby="rt-week-h">
        <div>
          <h2 id="rt-week-h" className="h-display text-[24px]">
            Schedule
          </h2>
          <p className="text-[13px] text-muted">Pick the days it repeats on, or none to start it any time from Train.</p>
        </div>
        <div className="grid grid-cols-7 gap-0.5" role="group" aria-label="Repeat on">
          {WEEK_ORDER.map((dow) => {
            const on = weekdays.includes(dow)
            const other = occupant(dow)
            return (
              <button
                key={dow}
                type="button"
                aria-pressed={on}
                aria-label={`${WEEKDAY_LONG[dow]}${other ? `, currently ${other}` : ''}`}
                onClick={() => setWeekdays((w) => (on ? w.filter((d) => d !== dow) : [...w, dow]))}
                className={cx(
                  'flex h-[60px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-btn-sm border px-0.5',
                  on ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface-2 text-fg',
                )}
              >
                <span className="text-[12px] font-extrabold uppercase">{WEEKDAY_SHORT[dow]}</span>
                <span className={cx('w-full truncate text-center text-[10px] font-bold', on ? 'text-on-accent/80' : 'text-faint')}>
                  {other ?? 'Rest'}
                </span>
              </button>
            )
          })}
        </div>
        {replaced.length > 0 && (
          <p className="text-[13px] font-semibold text-flame">Replaces {replaced.join(', ')}.</p>
        )}
      </section>

      {error && (
        <p role="alert" className="text-[14px] font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Button block disabled={saving} icon={<Save size={18} aria-hidden="true" />} onClick={() => void save(false)}>
          Save routine
        </Button>
        <Button
          variant="surface"
          block
          disabled={saving || workout !== null}
          icon={<Play size={16} fill="currentColor" aria-hidden="true" />}
          onClick={() => void save(true)}
        >
          Save & start now
        </Button>
        {workout && <p className="text-center text-[13px] text-faint">Finish your current workout to start another.</p>}
        {existing && (
          <Button
            variant="danger"
            block
            icon={<Trash size={18} aria-hidden="true" />}
            onClick={async () => {
              if (!window.confirm(`Delete the ${existing.name} routine? Past workouts are kept.`)) return
              await deleteRoutine(existing.id)
              navigate('/train', { replace: true })
            }}
          >
            Delete routine
          </Button>
        )}
      </div>

      <ExercisePickerSheet
        open={pickerOpen}
        multiple
        title="Select exercises"
        disabledIds={new Set(items.map((e) => e.exerciseId))}
        onClose={() => setPickerOpen(false)}
        onPickMany={(ids) => {
          setItems((list) => [...list, ...ids.map((exerciseId) => ({ exerciseId, ...DEFAULT_TARGET }))])
          setError(null)
          setPickerOpen(false)
        }}
      />
    </div>
  )
}
