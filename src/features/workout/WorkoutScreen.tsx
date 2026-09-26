import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button, ButtonLink, IconButton } from '../../components/Button'
import { cx } from '../../components/cx'
import { ScreenSkeleton } from '../../components/Skeleton'
import type { Settings, WorkoutSet } from '../../db/types'
import { addExercise, DEFAULT_TARGET, deleteWorkout, finishWorkout, removeExercise, replaceExercise } from '../../db/workouts'
import { useSettings } from '../../hooks/useAppData'
import { useNow } from '../../hooks/useNow'
import { useWakeLock } from '../../lib/feedback'
import { formatClock, formatTarget } from '../../lib/format'
import { restTimer } from '../../lib/restTimer'
import { ExercisePickerSheet } from '../exercises/ExercisePickerSheet'
import { ExerciseCard } from './ExerciseCard'
import { FinishSheet } from './FinishSheet'
import { RestTimerCard } from './RestTimerCard'
import { useWorkoutData, type WorkoutData } from './useWorkoutData'
import { WorkoutSummary } from './WorkoutSummary'

export default function WorkoutScreen() {
  const { id } = useParams()
  const data = useWorkoutData(id)
  const settings = useSettings()
  // Remember whether this screen saw the workout finish, to show "Workout complete" wording.
  const [finishedHere, setFinishedHere] = useState(false)

  if (data === undefined || !settings) {
    return (
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+20px)]">
        <ScreenSkeleton />
      </div>
    )
  }
  if (data === null) {
    return (
      <div className="flex min-h-dvh flex-col items-start justify-center gap-4 px-6">
        <h1 className="h-display text-[40px]">Workout not found</h1>
        <p className="text-muted">It may have been discarded or deleted.</p>
        <ButtonLink to="/" replace>
          Go to Today
        </ButtonLink>
      </div>
    )
  }
  if (data.workout.endedAt !== null) {
    return <WorkoutSummary data={data} unit={settings.weightUnit} justFinished={finishedHere} />
  }
  return <LiveWorkout data={data} settings={settings} onFinished={() => setFinishedHere(true)} />
}

type Picker = { mode: 'add' } | { mode: 'replace'; exerciseId: string } | null

function LiveWorkout({ data, settings, onFinished }: { data: WorkoutData; settings: Settings; onFinished: () => void }) {
  const navigate = useNavigate()
  const { workout, sets, exercises, previous, bests } = data
  const now = useNow(1000)
  const [chosen, setChosen] = useState<string | null>(null)
  const [picker, setPicker] = useState<Picker>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  useWakeLock(true)

  const setsByExercise = useMemo(() => {
    const m = new Map<string, WorkoutSet[]>()
    for (const exId of workout.exerciseOrder) m.set(exId, [])
    for (const s of sets) m.get(s.exerciseId)?.push(s)
    for (const list of m.values()) list.sort((a, b) => a.order - b.order)
    return m
  }, [workout.exerciseOrder, sets])

  const isComplete = (exId: string) => {
    const list = setsByExercise.get(exId) ?? []
    return list.length > 0 && list.every((s) => s.done)
  }
  const order = workout.exerciseOrder
  const current =
    chosen && order.includes(chosen) ? chosen : (order.find((id) => !isComplete(id)) ?? order[0] ?? null)
  const upNext = order.filter((id) => id !== current && !isComplete(id))
  const completed = order.filter((id) => id !== current && isComplete(id))
  const nextAfterCurrent = upNext[0]

  const jumpTo = (exId: string) => {
    setChosen(exId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const currentEx = current ? exercises.get(current) : undefined
  const tickedCount = sets.filter((s) => s.done).length

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="pt-safe sticky top-0 z-30 border-b border-divider bg-bg">
        <div className="flex h-[56px] items-center gap-2 px-2">
          <IconButton label="Back to Today (workout keeps running)" variant="ghost" onClick={() => navigate('/')}>
            <ChevronLeft size={24} aria-hidden="true" />
          </IconButton>
          <div className="min-w-0 flex-1">
            <h1 className="h-display truncate text-[24px] leading-none">{workout.name}</h1>
            <p className="num text-[13px] font-bold text-muted">
              <span className="sr-only">Elapsed </span>
              {formatClock(now - workout.startedAt)}
            </p>
          </div>
          <Button size="sm" onClick={() => setFinishOpen(true)} className="mr-2">
            Finish
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 pb-10 pt-4">
        <RestTimerCard workoutId={workout.id} />

        {current && currentEx ? (
          <ExerciseCard
            key={current}
            workoutId={workout.id}
            exercise={currentEx}
            sets={setsByExercise.get(current) ?? []}
            previous={previous[current] ?? []}
            bests={bests[current] ?? { e1rm: 0, kgByReps: {}, count: 0 }}
            target={workout.targets[current] ?? DEFAULT_TARGET}
            unit={settings.weightUnit}
            restSec={currentEx.isCompound ? settings.restCompoundSec : settings.restAccessorySec}
            note={workout.exerciseNotes[current] ?? ''}
            onNext={nextAfterCurrent ? () => jumpTo(nextAfterCurrent) : undefined}
            onReplace={() => setPicker({ mode: 'replace', exerciseId: current })}
            onRemove={() => void removeExercise(workout.id, current)}
          />
        ) : (
          <div className="rounded-card border border-dashed border-border p-6 text-center">
            <p className="h-display text-[24px]">No exercises yet</p>
            <p className="mt-1 text-[14px] text-muted">Add exercises from the library to start logging.</p>
          </div>
        )}

        <ExerciseQueue
          title="Up next"
          ids={upNext}
          data={data}
          setsByExercise={setsByExercise}
          onJump={jumpTo}
        />
        <ExerciseQueue title="Done" ids={completed} data={data} setsByExercise={setsByExercise} onJump={jumpTo} />

        <Button variant="surface" block icon={<Plus size={18} aria-hidden="true" />} onClick={() => setPicker({ mode: 'add' })}>
          Add exercise
        </Button>
        <p className="num text-center text-[13px] text-faint">
          {tickedCount} of {sets.length} sets ticked
        </p>
      </main>

      <ExercisePickerSheet
        open={picker?.mode === 'replace'}
        title={picker?.mode === 'replace' ? `Replace ${exercises.get(picker.exerciseId)?.name ?? ''}` : ''}
        disabledIds={new Set(order)}
        onClose={() => setPicker(null)}
        onPick={(exId) => {
          const p = picker
          setPicker(null)
          if (p?.mode === 'replace') void replaceExercise(workout.id, p.exerciseId, exId).then(() => setChosen(exId))
        }}
      />
      <ExercisePickerSheet
        open={picker?.mode === 'add'}
        multiple
        title="Add exercises"
        disabledIds={new Set(order)}
        onClose={() => setPicker(null)}
        onPickMany={async (ids) => {
          setPicker(null)
          for (const exId of ids) await addExercise(workout.id, exId)
          if (ids[0]) jumpTo(ids[0])
        }}
      />

      <FinishSheet
        open={finishOpen}
        sets={sets}
        onClose={() => setFinishOpen(false)}
        onFinish={async () => {
          setFinishOpen(false)
          restTimer.stop()
          onFinished()
          await finishWorkout(workout.id)
          window.scrollTo(0, 0)
        }}
        onDiscard={async () => {
          setFinishOpen(false)
          restTimer.stop()
          await deleteWorkout(workout.id)
          navigate('/', { replace: true })
        }}
      />
    </div>
  )
}

function ExerciseQueue({
  title,
  ids,
  data,
  setsByExercise,
  onJump,
}: {
  title: string
  ids: string[]
  data: WorkoutData
  setsByExercise: Map<string, WorkoutSet[]>
  onJump: (id: string) => void
}) {
  if (ids.length === 0) return null
  const headingId = `list-${title.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-muted">
        {title}
      </h2>
      <ul className="card divide-y divide-divider overflow-hidden">
        {ids.map((id) => {
          const ex = data.exercises.get(id)
          const list = setsByExercise.get(id) ?? []
          const done = list.filter((s) => s.done).length
          const target = data.workout.targets[id] ?? DEFAULT_TARGET
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onJump(id)}
                className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-left active:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">{ex?.name ?? 'Exercise'}</span>
                  <span className="num block text-[13px] font-semibold text-muted">
                    {done}/{list.length} sets · {formatTarget(target)}
                  </span>
                </span>
                <span
                  className={cx(
                    'num shrink-0 rounded-full px-2 py-0.5 text-[12px] font-extrabold',
                    done === list.length && list.length > 0 ? 'bg-accent text-on-accent' : 'bg-surface-2 text-muted',
                  )}
                  aria-hidden="true"
                >
                  {done}/{list.length}
                </span>
                <ChevronRight size={18} className="shrink-0 text-faint" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
