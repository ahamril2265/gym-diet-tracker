import { useLiveQuery } from 'dexie-react-hooks'
import { Play } from 'lucide-react'
import { ButtonLink } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { MacroBar } from '../../components/MacroBar'
import { Ring } from '../../components/Ring'
import { ScreenSkeleton } from '../../components/Skeleton'
import { db } from '../../db/db'
import { MUSCLE_LABEL } from '../../db/seed/exercises'
import type { Exercise, Macros, Settings } from '../../db/types'
import { useActiveSplit, useExerciseMap, useProfile, useSettings, useTargets, type ActiveSplit } from '../../hooks/useAppData'
import { planForDate } from '../../lib/calc/schedule'
import { estimateSessionMinutes } from '../../lib/calc/workoutTime'
import { formatHeaderDate, toISODate, WEEKDAY_SHORT } from '../../lib/date'
import { GOAL_LABEL } from '../me/profileDraft'

const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

function useEatenToday(): Macros | undefined {
  return useLiveQuery(async () => {
    const logs = await db.foodLogs.where('date').equals(toISODate()).toArray()
    return logs.reduce(
      (s, l) => ({
        kcal: s.kcal + l.macros.kcal,
        protein: s.protein + l.macros.protein,
        carbs: s.carbs + l.macros.carbs,
        fat: s.fat + l.macros.fat,
      }),
      ZERO,
    )
  })
}

export default function TodayScreen() {
  const profile = useProfile()
  const settings = useSettings()
  const targets = useTargets()
  const active = useActiveSplit()
  const exercises = useExerciseMap()
  const eaten = useEatenToday()

  if (!profile || !settings || !targets || active === undefined || !exercises || !eaten) return <ScreenSkeleton />

  const now = new Date()
  const t = targets.targets
  const left = t.kcal - eaten.kcal
  const over = left < 0

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="eyebrow">{formatHeaderDate(now)}</p>
        <h1 className="h-display mt-1 break-words text-[40px]">Let's go, {profile.name}</h1>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          <Chip tone="accent">{GOAL_LABEL[profile.goal]} mode</Chip>
          {active && <Chip>{active.split.name}</Chip>}
        </div>
      </header>

      <section className="card flex items-center gap-5 p-5" aria-label="Calories today">
        <Ring
          progress={t.kcal > 0 ? eaten.kcal / t.kcal : 0}
          colorClass={over ? 'stroke-protein' : 'stroke-accent'}
          label={`${Math.round(eaten.kcal)} of ${t.kcal} kilocalories eaten`}
        >
          <span className="h-display num text-[34px] leading-none">{Math.abs(Math.round(left)).toLocaleString('en-IN')}</span>
          <span className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted">
            {over ? 'kcal over' : 'kcal left'}
          </span>
        </Ring>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <MacroBar macro="protein" eaten={eaten.protein} target={t.protein} />
          <MacroBar macro="carbs" eaten={eaten.carbs} target={t.carbs} />
          <MacroBar macro="fat" eaten={eaten.fat} target={t.fat} />
        </div>
      </section>

      <SessionCard active={active} exercises={exercises} settings={settings} now={now} />
    </div>
  )
}

function SessionCard({
  active,
  exercises,
  settings,
  now,
}: {
  active: ActiveSplit | null
  exercises: Map<string, Exercise>
  settings: Settings
  now: Date
}) {
  if (!active) {
    return (
      <section className="rounded-card-lg bg-accent p-5 text-on-accent">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.12em]">Training</p>
        <h2 className="h-display mt-1 text-[40px]">No split yet</h2>
        <p className="mt-1 text-[14px] font-semibold">Set up your weekly plan to see today's session here.</p>
        <ButtonLink to="/me" variant="dark" block className="mt-4">
          Set up split
        </ButtonLink>
      </section>
    )
  }

  const plan = planForDate(active.split, active.days, now)

  if (!plan.day) {
    const nextLabel = plan.next
      ? `${plan.next.day.name} ${plan.next.inDays === 1 ? 'tomorrow' : `on ${WEEKDAY_SHORT[(now.getDay() + plan.next.inDays) % 7]}`}`
      : null
    return (
      <section className="rounded-card-lg bg-accent p-5 text-on-accent">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.12em]">Today's session</p>
        <h2 className="h-display mt-1 text-[44px]">Rest day</h2>
        <p className="mt-1 text-[14px] font-semibold">Recover, eat your protein, sleep well.</p>
        {nextLabel && <p className="mt-3 text-[14px] font-extrabold">Next up: {nextLabel}</p>}
      </section>
    )
  }

  const dayExercises = plan.day.exercises.flatMap((e) => {
    const ex = exercises.get(e.exerciseId)
    return ex ? [{ ...e, ex }] : []
  })
  const muscles = [...new Set(dayExercises.map((e) => MUSCLE_LABEL[e.ex.muscle]))]
  const minutes = estimateSessionMinutes(
    dayExercises.map((e) => ({ sets: e.sets, isCompound: e.ex.isCompound })),
    { compoundSec: settings.restCompoundSec, accessorySec: settings.restAccessorySec },
  )

  return (
    <section className="rounded-card-lg bg-accent p-5 text-on-accent" aria-labelledby="session-h">
      <p className="text-[12px] font-extrabold uppercase tracking-[0.12em]">Today's session</p>
      <h2 id="session-h" className="h-display mt-1 text-[44px]">
        {plan.day.name} day
      </h2>
      <p className="mt-1 text-[14px] font-bold">{muscles.join(' · ')}</p>
      <p className="num mt-0.5 text-[14px] font-semibold">
        {dayExercises.length} lifts · ~{minutes} min
      </p>
      <ButtonLink
        to={`/workout/new?day=${plan.day.id}`}
        variant="dark"
        block
        className="mt-4"
        icon={<Play size={18} fill="currentColor" aria-hidden="true" />}
      >
        Start workout
      </ButtonLink>
    </section>
  )
}
