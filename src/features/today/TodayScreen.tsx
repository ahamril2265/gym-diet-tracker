import { useLiveQuery } from 'dexie-react-hooks'
import { CircleCheck, Flame, Play } from 'lucide-react'
import { Button, ButtonLink } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { HeroCard } from '../../components/HeroCard'
import { MacroBar } from '../../components/MacroBar'
import { Ring } from '../../components/Ring'
import { ScreenSkeleton } from '../../components/Skeleton'
import { db } from '../../db/db'
import { MUSCLE_LABEL } from '../../db/seed/exercises'
import type { Exercise, Macros, Settings } from '../../db/types'
import {
  useActiveSplit,
  useActiveWorkout,
  useExerciseMap,
  useProfile,
  useSettings,
  useTargets,
  type ActiveSplit,
} from '../../hooks/useAppData'
import { sumMacros } from '../../lib/calc/nutrition'
import { planForDate } from '../../lib/calc/schedule'
import { estimateSessionMinutes } from '../../lib/calc/workoutTime'
import { formatHeaderDate, toISODate, WEEKDAY_SHORT } from '../../lib/date'
import { GOAL_LABEL } from '../me/profileDraft'
import { ResumeCard } from '../workout/ResumeCard'
import { LastSessionCard } from './LastSessionCard'
import { QuickTiles } from './QuickTiles'
import { useLastSession, useStreak } from './useTodayData'
import { useStartWorkout } from '../workout/useStartWorkout'

function useEatenToday(): Macros | undefined {
  return useLiveQuery(async () => sumMacros((await db.foodLogs.where('date').equals(toISODate()).toArray()).map((l) => l.macros)))
}

/** Split days already trained today (finished workouts). */
function useTrainedToday(): Set<string> | undefined {
  return useLiveQuery(async () => {
    const done = await db.workouts.where('date').equals(toISODate()).filter((w) => w.endedAt !== null).toArray()
    return new Set(done.flatMap((w) => (w.splitDayId ? [w.splitDayId] : [])))
  })
}

export default function TodayScreen() {
  const profile = useProfile()
  const settings = useSettings()
  const targets = useTargets()
  const split = useActiveSplit()
  const workout = useActiveWorkout()
  const exercises = useExerciseMap()
  const eaten = useEatenToday()
  const streak = useStreak()
  const last = useLastSession()
  const trainedToday = useTrainedToday()

  if (
    !profile ||
    !settings ||
    !targets ||
    split === undefined ||
    workout === undefined ||
    !exercises ||
    !eaten ||
    streak === undefined ||
    last === undefined ||
    !trainedToday
  ) {
    return <ScreenSkeleton />
  }

  const now = new Date()
  const t = targets.targets
  const left = t.kcal - eaten.kcal
  const over = left < 0

  return (
    <div className="flex flex-col gap-4">
      <header>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">{formatHeaderDate(now)}</p>
            <h1 className="h-display mt-1 break-words text-[40px]">Let's go, {profile.name}</h1>
          </div>
          <Chip tone="flame" className="mt-0.5 h-9 shrink-0 gap-1 px-3 text-[15px]" icon={<Flame size={18} aria-hidden="true" />}>
            <span className="num">{streak}</span>
            <span className="sr-only">day streak</span>
          </Chip>
        </div>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          <Chip tone="accent">{GOAL_LABEL[profile.goal]} mode</Chip>
          {split && <Chip>{split.split.name}</Chip>}
        </div>
      </header>

      <section className="card flex items-center gap-5 p-5" aria-label="Calories today">
        <Ring
          progress={t.kcal > 0 ? eaten.kcal / t.kcal : 0}
          colorClass={over ? 'stroke-flame' : 'stroke-accent'}
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

      {workout ? (
        <ResumeCard workout={workout} />
      ) : (
        <SessionCard active={split} exercises={exercises} settings={settings} now={now} trainedToday={trainedToday} />
      )}

      <QuickTiles unit={settings.weightUnit} waterGoal={settings.waterGoalGlasses} />

      {last && <LastSessionCard last={last} unit={settings.weightUnit} />}
    </div>
  )
}

function SessionCard({
  active,
  exercises,
  settings,
  now,
  trainedToday,
}: {
  active: ActiveSplit | null
  exercises: Map<string, Exercise>
  settings: Settings
  now: Date
  trainedToday: Set<string>
}) {
  const { start, starting } = useStartWorkout()

  if (!active) {
    return (
      <HeroCard>
        <p className="text-[12px] font-extrabold uppercase tracking-[0.12em]">Training</p>
        <h2 className="h-display mt-1 text-[40px]">No routines yet</h2>
        <p className="mt-1 text-[14px] font-semibold">Build a routine from your favourite exercises, or start from a template.</p>
        <ButtonLink to="/train/routine/new" variant="dark" block className="mt-4">
          Create routine
        </ButtonLink>
      </HeroCard>
    )
  }

  const plan = planForDate(active.split, active.days, now)

  if (!plan.day) {
    const nextLabel = plan.next
      ? `${plan.next.day.name} ${plan.next.inDays === 1 ? 'tomorrow' : `on ${WEEKDAY_SHORT[(now.getDay() + plan.next.inDays) % 7]}`}`
      : null
    return (
      <HeroCard>
        <p className="text-[12px] font-extrabold uppercase tracking-[0.12em]">Today's session</p>
        <h2 className="h-display mt-1 text-[44px]">Rest day</h2>
        <p className="mt-1 text-[14px] font-semibold">Recover, eat your protein, sleep well.</p>
        {nextLabel && <p className="mt-3 text-[14px] font-extrabold">Next up: {nextLabel}</p>}
      </HeroCard>
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

  const done = trainedToday.has(plan.day.id)

  return (
    <HeroCard labelledBy="session-h">
      <p className="text-[12px] font-extrabold uppercase tracking-[0.12em]">Today's session</p>
      <h2 id="session-h" className="h-display mt-1 text-[44px]">
        {plan.day.name} day
      </h2>
      {done ? (
        <p className="mt-1 flex items-center gap-1.5 text-[15px] font-extrabold">
          <CircleCheck size={18} aria-hidden="true" /> Done for today — recover well.
        </p>
      ) : (
        <>
          <p className="mt-1 text-[14px] font-bold">{muscles.join(' · ')}</p>
          <p className="num mt-0.5 text-[14px] font-semibold">
            {dayExercises.length} lifts · ~{minutes} min
          </p>
        </>
      )}
      <Button
        variant="dark"
        block
        className="mt-4"
        disabled={starting}
        onClick={() => void start(plan.day!.id)}
        icon={<Play size={18} fill="currentColor" aria-hidden="true" />}
      >
        {done ? 'Train again' : 'Start workout'}
      </Button>
    </HeroCard>
  )
}
