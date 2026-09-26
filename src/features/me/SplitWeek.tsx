import { cx } from '../../components/cx'
import { WEEK_ORDER, WEEKDAY_SHORT } from '../../lib/date'

/**
 * Mon→Sun strip showing which days train and which rest.
 * `schedule` is indexed by `Date#getDay()`; `nameOf` turns an entry into a short label.
 */
export function SplitWeek({
  schedule,
  nameOf,
  highlightDay,
}: {
  schedule: (string | null)[]
  nameOf: (id: string) => string
  highlightDay?: number
}) {
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label="Weekly schedule">
      {WEEK_ORDER.map((dow) => {
        const id = schedule[dow] ?? null
        const label = id ? nameOf(id) : 'Rest'
        return (
          <li
            key={dow}
            className={cx(
              'flex min-w-0 flex-col items-center gap-1 rounded-btn-sm px-0.5 py-2',
              id ? 'bg-surface-2' : 'border border-dashed border-border',
              highlightDay === dow && 'ring-2 ring-accent',
            )}
          >
            <span className="text-[11px] font-extrabold uppercase text-muted">{WEEKDAY_SHORT[dow]}</span>
            <span className={cx('w-full truncate text-center text-[11px] font-bold', id ? 'text-fg' : 'text-faint')} title={label}>
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
