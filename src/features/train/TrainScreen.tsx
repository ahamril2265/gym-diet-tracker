import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, CalendarDays, ChevronRight, Pencil, Play, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { Button, ButtonLink } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { cx } from '../../components/cx'
import { ScreenHeader } from '../../components/ScreenHeader'
import { ScreenSkeleton } from '../../components/Skeleton'
import { db } from '../../db/db'
import { MUSCLE_LABEL } from '../../db/seed/exercises'
import type { Exercise, Settings, SplitDay, Workout } from '../../db/types'
import { useActiveSplit, useActiveWorkout, useExerciseMap, useSettings } from '../../hooks/useAppData'
import { volume } from '../../lib/calc/strength'
import { estimateSessionMinutes } from '../../lib/calc/workoutTime'
import { fromISODate, WEEK_ORDER, WEEKDAY_SHORT } from '../../lib/date'
import { formatDuration, formatShortDate, formatVolume } from '../../lib/format'
import { ResumeCard } from '../workout/ResumeCard'
import { useStartWorkout } from '../workout/useStartWorkout'

interface HistoryRow {
  workout: Workout
  volumeKg: number
  sets: number
}

function useHistory(limit = 20): HistoryRow[] | undefined {
  return useLiveQuery(async () => {
    const workouts = await db.workouts
      .orderBy('startedAt')
      .reverse()
      .filter((w) => w.endedAt !== null)
      .limit(limit)
      .toArray()
    const sets = await db.sets.where('workoutId').anyOf(workouts.map((w) => w.id)).toArray()
    return workouts.map((workout) => {
      const own = sets.filter((s) => s.workoutId === workout.id)
      return { workout, volumeKg: volume(own), sets: own.filter((s) => s.done && !s.isWarmup).length }
    })
  })
}

export default function TrainScreen() {
  const split = useActiveSplit()
  const workout = useActiveWorkout()
  const exercises = useExerciseMap()
  const settings = useSettings()
  const history = useHistory()
  const { start, starting } = useStartWorkout()

  if (split === undefined || workout === undefined || !exercises || !settings || !history) return <ScreenSkeleton />

  const todayDow = new Date().getDay()
  const busy = starting || workout !== null

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        eyebrow="Training"
        title="Train"
        right={
          <ButtonLink to="/train/exercises" variant="surface" size="sm" icon={<BookOpen size={16} aria-hidden="true" />}>
            Library
          </ButtonLink>
        }
      />

      {workout && <ResumeCard workout={workout} />}

      <section aria-labelledby="split-h" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 id="split-h" className="h-display text-[26px]">
              Routines
            </h2>
            {split && <p className="truncate text-[14px] font-bold text-muted">{split.split.name}</p>}
          </div>
          {split && (
            <ButtonLink to="/train/split" variant="ghost" size="sm" icon={<CalendarDays size={16} aria-hidden="true" />}>
              Edit week
            </ButtonLink>
          )}
        </div>

        {split ? (
          split.days.map((d) => (
            <DayCard
              key={d.id}
              day={d}
              exercises={exercises}
              settings={settings}
              weekdays={WEEK_ORDER.filter((dow) => split.split.schedule[dow] === d.id)}
              isToday={split.split.schedule[todayDow] === d.id}
              disabled={busy}
              onStart={() => void start(d.id)}
            />
          ))
        ) : (
          <div className="card p-5">
            <p className="text-[15px] text-muted">No routines yet. Build your own by picking exercises, or start from a template.</p>
            <ButtonLink to="/train/split" variant="surface" className="mt-4" block>
              Use a template
            </ButtonLink>
          </div>
        )}

        <ButtonLink to="/train/routine/new" block icon={<Plus size={18} aria-hidden="true" />}>
          Create routine
        </ButtonLink>

        <Button
          variant="surface"
          block
          disabled={busy}
          icon={<Plus size={18} aria-hidden="true" />}
          onClick={() => void start(null)}
        >
          Start empty workout
        </Button>
        {workout && <p className="text-center text-[13px] text-faint">Finish your current workout to start another.</p>}
      </section>

      <section aria-labelledby="history-h" className="flex flex-col gap-3">
        <h2 id="history-h" className="h-display text-[26px]">
          History
        </h2>
        {history.length === 0 ? (
          <p className="card p-5 text-[14px] text-muted">Finished workouts show up here.</p>
        ) : (
          <ul className="card divide-y divide-divider overflow-hidden">
            {history.map((h) => (
              <li key={h.workout.id}>
                <Link
                  to={`/workout/${h.workout.id}`}
                  className="flex min-h-[64px] items-center gap-3 px-4 py-3 active:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-extrabold">{h.workout.name}</p>
                    <p className="num text-[13px] font-semibold text-muted">
                      {formatShortDate(fromISODate(h.workout.date))} · {formatDuration((h.workout.endedAt ?? 0) - h.workout.startedAt)} ·{' '}
                      {formatVolume(h.volumeKg, settings.weightUnit)} · {h.sets} sets
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-faint" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function DayCard({
  day,
  exercises,
  settings,
  weekdays,
  isToday,
  disabled,
  onStart,
}: {
  day: SplitDay
  exercises: Map<string, Exercise>
  settings: Settings
  weekdays: number[]
  isToday: boolean
  disabled: boolean
  onStart: () => void
}) {
  const list = day.exercises.flatMap((e) => {
    const ex = exercises.get(e.exerciseId)
    return ex ? [{ ...e, ex }] : []
  })
  const muscles = [...new Set(list.map((e) => MUSCLE_LABEL[e.ex.muscle]))]
  const minutes = estimateSessionMinutes(
    list.map((e) => ({ sets: e.sets, isCompound: e.ex.isCompound })),
    { compoundSec: settings.restCompoundSec, accessorySec: settings.restAccessorySec },
  )
  return (
    <article className={cx('card flex items-center gap-4 p-4', isToday && 'border-accent')} aria-label={`${day.name} day`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="h-display truncate text-[26px]">{day.name}</h3>
          {isToday && (
            <Chip tone="solid" className="h-6 px-2 text-[10px]">
              Today
            </Chip>
          )}
        </div>
        <p className="truncate text-[13px] font-bold text-muted">{muscles.join(' · ') || 'No exercises yet'}</p>
        <p className="num text-[13px] font-semibold text-faint">
          {list.length} lifts{minutes ? ` · ~${minutes} min` : ''}
          {weekdays.length ? ` · ${weekdays.map((d) => WEEKDAY_SHORT[d]).join(', ')}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          to={`/train/routine/${day.id}`}
          aria-label={`Edit ${day.name}`}
          className="flex h-11 w-11 items-center justify-center rounded-btn-sm text-muted active:bg-surface-2"
        >
          <Pencil size={18} aria-hidden="true" />
        </Link>
        <Button
          size="sm"
          variant={isToday ? 'accent' : 'surface'}
          disabled={disabled}
          onClick={onStart}
          icon={<Play size={14} fill="currentColor" aria-hidden="true" />}
        >
          Start
        </Button>
      </div>
    </article>
  )
}
