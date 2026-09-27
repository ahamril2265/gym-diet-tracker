import { useLiveQuery } from 'dexie-react-hooks'
import { Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { ScreenHeader } from '../../components/ScreenHeader'
import { ScreenSkeleton } from '../../components/Skeleton'
import { StatTile } from '../../components/StatTile'
import { db } from '../../db/db'
import type { Muscle, Settings } from '../../db/types'
import { useActiveSplit, useSettings, useTargets, type ActiveSplit } from '../../hooks/useAppData'
import { finishedSince, heatmap, prHistory, setsPerMuscle, volumeChange, weekStart } from '../../lib/calc/progress'
import { addDays, fromISODate, toISODate } from '../../lib/date'
import { formatSet, formatShortDate } from '../../lib/format'
import { round, weightFromKg } from '../../lib/units'
import { ConsistencyHeatmap } from './ConsistencyHeatmap'
import { E1rmChart } from './E1rmChart'
import { MuscleSets } from './MuscleSets'
import { NutritionView } from './NutritionView'
import { ProgressTabs } from './ProgressTabs'
import { useProgressData, type ProgressData } from './useProgressData'

export default function ProgressScreen() {
  const [params] = useSearchParams()
  const view = params.get('view') === 'nutrition' ? 'nutrition' : 'strength'
  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader eyebrow="Progress" title={view === 'nutrition' ? 'Nutrition' : 'Strength'} />
      <ProgressTabs current={view} />
      {view === 'nutrition' ? <NutritionSection /> : <StrengthSection />}
    </div>
  )
}

function NutritionSection() {
  const targets = useTargets()
  const logs = useLiveQuery(() => db.foodLogs.where('date').aboveOrEqual(addDays(toISODate(), -31)).toArray())
  if (!targets || !logs) return <ScreenSkeleton />
  return <NutritionView logs={logs} targets={targets.targets} />
}

/** Muscles to show: the ones your split trains, plus anything trained this week. */
function musclesToShow(split: ActiveSplit | null, data: ProgressData, counts: Partial<Record<Muscle, number>>): Muscle[] {
  const set = new Set<Muscle>()
  for (const d of split?.days ?? []) for (const e of d.exercises) {
    const m = data.exercises.get(e.exerciseId)?.muscle
    if (m) set.add(m)
  }
  for (const m of Object.keys(counts) as Muscle[]) set.add(m)
  if (set.size === 0) (['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'biceps', 'triceps'] as Muscle[]).forEach((m) => set.add(m))
  const order: Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'traps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs']
  return order.filter((m) => set.has(m))
}

function StrengthSection() {
  const data = useProgressData()
  const settings = useSettings()
  const split = useActiveSplit()
  const today = toISODate()

  const stats = useMemo(() => {
    if (!data) return null
    const prs = prHistory(data.workouts, data.sets)
    const monthStart = `${today.slice(0, 7)}-01`
    const counts = setsPerMuscle(data.workouts, data.sets, data.exercises, weekStart(today), today)
    return {
      workouts12w: finishedSince(data.workouts, addDays(today, -83)).length,
      volume: volumeChange(data.workouts, data.sets, today),
      prsThisMonth: prs.filter((p) => p.date >= monthStart).length,
      recentPrs: [...prs].reverse().slice(0, 8),
      counts,
      grid: heatmap(data.workouts, data.sets, today),
    }
  }, [data, today])

  if (!data || !settings || split === undefined || !stats) return <ScreenSkeleton />

  const unit = settings.weightUnit
  const v = stats.volume

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Workouts" value={stats.workouts12w} hint="last 12 weeks" />
        <StatTile
          label="Volume"
          value={v.pct === null ? '—' : `${v.pct >= 0 ? '+' : '−'}${Math.abs(Math.round(v.pct))}%`}
          delta={null}
          hint={v.pct === null ? (v.last7 > 0 ? 'no prior week' : 'no sets yet') : 'vs last week'}
        />
        <StatTile label="PRs" value={stats.prsThisMonth} hint="this month" />
      </div>

      <E1rmChart data={data} unit={unit} />

      <RecentPrs prs={stats.recentPrs} data={data} unit={unit} />

      <MuscleSets counts={stats.counts} muscles={musclesToShow(split, data, stats.counts)} />

      <ConsistencyHeatmap grid={stats.grid} />
    </>
  )
}

function RecentPrs({ prs, data, unit }: { prs: ReturnType<typeof prHistory>; data: ProgressData; unit: Settings['weightUnit'] }) {
  return (
    <section className="card p-4" aria-labelledby="prs-h">
      <h2 id="prs-h" className="h-display flex items-center gap-2 text-[22px]">
        <Trophy size={18} className="text-flame" aria-hidden="true" /> Recent PRs
      </h2>
      {prs.length === 0 ? (
        <p className="mt-2 text-[14px] text-muted">
          PRs appear once you beat an earlier session — your first session of each lift sets the baseline.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-divider">
          {prs.map((p) => (
            <li key={`${p.workoutId}-${p.exerciseId}-${p.kg}-${p.reps}`} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold">{data.exercises.get(p.exerciseId)?.name ?? 'Exercise'}</p>
                <p className="num text-[12px] font-semibold text-muted">
                  {formatShortDate(fromISODate(p.date))} · {p.kinds.includes('e1rm') ? 'best e1RM' : 'heaviest for reps'} ·{' '}
                  {round(weightFromKg(p.e1rm, unit), 1)} {unit} e1RM
                </p>
              </div>
              <span className="num shrink-0 text-[15px] font-extrabold">{formatSet(p.kg, p.reps, unit)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
