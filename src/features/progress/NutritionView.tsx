import { CircleCheck } from 'lucide-react'
import { cx } from '../../components/cx'
import type { FoodLog, MacroTargets } from '../../db/types'
import { nutritionStats, ON_TARGET, type NutritionStats } from '../../lib/calc/progress'
import { toISODate } from '../../lib/date'

/** Average kcal and protein vs target over 7 and 30 complete days, and days on target. */
export function NutritionView({ logs, targets }: { logs: FoodLog[]; targets: MacroTargets }) {
  const today = toISODate()
  const week = nutritionStats(logs, targets, today, 7)
  const month = nutritionStats(logs, targets, today, 30)
  return (
    <>
      <p className="text-[13px] text-faint">
        Complete days only — today counts once it’s over. A day is on target when calories are within ±
        {ON_TARGET.kcalTolerance * 100}% of {targets.kcal.toLocaleString('en-IN')} kcal and protein reaches {ON_TARGET.proteinMin * 100}% of{' '}
        {targets.protein} g.
      </p>
      <PeriodCard title="Last 7 days" days={7} stats={week} targets={targets} />
      <PeriodCard title="Last 30 days" days={30} stats={month} targets={targets} />
    </>
  )
}

function PeriodCard({ title, days, stats, targets }: { title: string; days: number; stats: NutritionStats; targets: MacroTargets }) {
  const headingId = `nut-${days}`
  return (
    <section className="card flex flex-col gap-4 p-4" aria-labelledby={headingId}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="h-display text-[22px]">
          {title}
        </h2>
        <span className="num text-[13px] font-bold text-muted">
          {stats.loggedDays} of {days} days logged
        </span>
      </div>
      {stats.loggedDays === 0 ? (
        <p className="text-[14px] text-muted">Log a full day of food to see your averages here.</p>
      ) : (
        <>
          <Meter label="Avg calories" value={stats.avgKcal!} target={targets.kcal} unit="kcal" tone="accent" />
          <Meter label="Avg protein" value={stats.avgProtein!} target={targets.protein} unit="g" tone="protein" />
          <p className="flex items-center gap-2 text-[15px] font-bold">
            <CircleCheck size={18} className="text-accent" aria-hidden="true" />
            <span className="num">
              {stats.onTargetDays} of {stats.loggedDays} logged {stats.loggedDays === 1 ? 'day' : 'days'} on target
            </span>
          </p>
        </>
      )}
    </section>
  )
}

/** Value vs target meter: the track is the target; the fill is capped at 120 % and labelled with the %. */
function Meter({ label, value, target, unit, tone }: { label: string; value: number; target: number; unit: string; tone: 'accent' | 'protein' }) {
  const pct = target > 0 ? (value / target) * 100 : 0
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold text-muted">{label}</span>
        <span className="num text-[14px] font-bold">
          {value.toLocaleString('en-IN')} <span className="text-faint">/ {target.toLocaleString('en-IN')} {unit}</span>
          <span className="ml-1.5 text-[12px] text-muted">({Math.round(pct)}%)</span>
        </span>
      </div>
      <div
        className="relative mt-1.5 h-2.5 rounded-full bg-surface-2"
        role="meter"
        aria-label={`${label} vs target`}
        aria-valuemin={0}
        aria-valuemax={Math.round(target * 1.2)}
        aria-valuenow={value}
      >
        <div
          className={cx('h-full rounded-full', tone === 'accent' ? 'bg-accent' : 'bg-protein')}
          style={{ width: `${Math.min(100, (Math.min(pct, 120) / 120) * 100)}%` }}
        />
        {/* Target marker at 100 % of target (on a 0–120 % scale) */}
        <span className="absolute -top-1 h-[18px] w-0.5 rounded-full bg-fg" style={{ left: `${(100 / 120) * 100}%` }} aria-hidden="true" />
      </div>
    </div>
  )
}
