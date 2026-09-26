import { ChevronLeft, Trash, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Button, IconButton } from '../../components/Button'
import { HeroCard } from '../../components/HeroCard'
import type { WeightUnit } from '../../db/types'
import { deleteWorkout } from '../../db/workouts'
import { summarizeSession } from '../../lib/calc/session'
import { fromISODate } from '../../lib/date'
import { formatDuration, formatSet, formatShortDate, formatVolume, formatWeightValue } from '../../lib/format'
import type { WorkoutData } from './useWorkoutData'

/** Finish summary (right after finishing) and the read-only view of past workouts. */
export function WorkoutSummary({ data, unit, justFinished }: { data: WorkoutData; unit: WeightUnit; justFinished: boolean }) {
  const navigate = useNavigate()
  const { workout, sets, exercises, bests } = data
  const summary = useMemo(() => summarizeSession(workout, sets, bests), [workout, sets, bests])

  return (
    <div className="flex min-h-dvh flex-col gap-4 px-4 pb-10 pt-[calc(env(safe-area-inset-top)+12px)]">
      <header className="-mx-2 flex items-center gap-1">
        <IconButton label="Back" variant="ghost" onClick={() => (justFinished ? navigate('/', { replace: true }) : navigate(-1))}>
          <ChevronLeft size={24} aria-hidden="true" />
        </IconButton>
        <p className="eyebrow">{justFinished ? 'Workout complete' : formatShortDate(fromISODate(workout.date))}</p>
      </header>

      <HeroCard labelledBy="summary-h">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.12em]">{justFinished ? 'Session saved' : 'Session'}</p>
        <h1 id="summary-h" className="h-display mt-1 text-[44px]">
          {workout.name}
        </h1>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Duration" value={formatDuration(summary.durationMs)} />
          <Stat label="Volume" value={formatVolume(summary.volumeKg, unit)} />
          <Stat label="PRs" value={String(summary.prs.length)} />
        </dl>
      </HeroCard>

      {summary.prs.length > 0 && (
        <section aria-labelledby="prs-h" className="card p-4">
          <h2 id="prs-h" className="h-display flex items-center gap-2 text-[24px]">
            <Trophy size={20} className="text-flame" aria-hidden="true" /> Personal records
          </h2>
          <ul className="mt-2 divide-y divide-divider">
            {summary.prs.map((pr) => (
              <li key={pr.setId} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold">{exercises.get(pr.exerciseId)?.name ?? 'Exercise'}</p>
                  <p className="num text-[13px] font-semibold text-muted">
                    {pr.kinds.includes('e1rm') ? 'Best estimated 1RM' : 'Heaviest for these reps'} · e1RM{' '}
                    {formatWeightValue(Math.round(pr.e1rm * 10) / 10, unit)} {unit}
                  </p>
                </div>
                <span className="num shrink-0 text-[16px] font-extrabold text-flame">{formatSet(pr.kg, pr.reps, unit)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="ex-h" className="card p-4">
        <h2 id="ex-h" className="h-display text-[24px]">
          Exercises
        </h2>
        {workout.exerciseOrder.length === 0 ? (
          <p className="mt-2 text-[14px] text-muted">No sets were logged.</p>
        ) : (
          <ul className="mt-2 divide-y divide-divider">
            {workout.exerciseOrder.map((exId) => {
              const own = sets.filter((s) => s.exerciseId === exId && s.done).sort((a, b) => a.order - b.order)
              return (
                <li key={exId} className="py-2.5">
                  <p className="text-[15px] font-bold">{exercises.get(exId)?.name ?? 'Exercise'}</p>
                  <p className="num text-[13px] font-semibold text-muted">
                    {own.map((s) => (s.isWarmup ? `W ${formatSet(s.kg, s.reps, unit)}` : formatSet(s.kg, s.reps, unit))).join(' · ')}
                  </p>
                  {workout.exerciseNotes[exId] && <p className="mt-1 text-[13px] italic text-faint">{workout.exerciseNotes[exId]}</p>}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-3">
        {justFinished && (
          <Button block onClick={() => navigate('/', { replace: true })}>
            Done
          </Button>
        )}
        <Button
          variant="danger"
          block
          icon={<Trash size={18} aria-hidden="true" />}
          onClick={async () => {
            if (!window.confirm('Delete this workout from your history?')) return
            await deleteWorkout(workout.id)
            navigate('/train', { replace: true })
          }}
        >
          Delete workout
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-btn bg-on-accent/10 px-2.5 py-2">
      <dt className="text-[11px] font-extrabold uppercase tracking-[0.08em]">{label}</dt>
      <dd className="h-display num mt-0.5 truncate text-[22px] leading-none">{value}</dd>
    </div>
  )
}
