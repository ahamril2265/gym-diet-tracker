import { ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { Link } from 'react-router'
import { cx } from '../../components/cx'
import type { WeightUnit } from '../../db/types'
import { fromISODate } from '../../lib/date'
import { formatDuration, formatShortDate, formatVolume } from '../../lib/format'
import type { LastSession } from './useTodayData'

/** "Last session" row: name, duration, volume, PRs and volume change vs the previous same-day session. */
export function LastSessionCard({ last, unit }: { last: LastSession; unit: WeightUnit }) {
  const { workout, summary, volumeChange } = last
  const prs = summary.prs.length
  const up = volumeChange !== null && volumeChange >= 0
  return (
    <Link to={`/workout/${workout.id}`} className="card flex items-center gap-3 p-4 active:bg-surface-2">
      <div className="min-w-0 flex-1">
        <p className="eyebrow">Last session · {formatShortDate(fromISODate(workout.date))}</p>
        <p className="h-display mt-1 truncate text-[24px]">{workout.name}</p>
        <p className="num text-[13px] font-semibold text-muted">
          {formatDuration(summary.durationMs)} · {formatVolume(summary.volumeKg, unit)} ·{' '}
          <span className={prs ? 'font-extrabold text-flame' : undefined}>
            {prs} {prs === 1 ? 'PR' : 'PRs'}
          </span>
        </p>
      </div>
      {volumeChange !== null && (
        <span
          className={cx(
            'num flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-extrabold',
            up ? 'bg-accent/15 text-accent' : 'bg-surface-2 text-muted',
          )}
          title="Volume vs your previous session of this day"
        >
          {up ? <TrendingUp size={14} aria-hidden="true" /> : <TrendingDown size={14} aria-hidden="true" />}
          {up ? '+' : '−'}
          {Math.abs(Math.round(volumeChange))}%<span className="sr-only"> volume vs previous session</span>
        </span>
      )}
      <ChevronRight size={18} className="shrink-0 text-faint" aria-hidden="true" />
    </Link>
  )
}
