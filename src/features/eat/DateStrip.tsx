import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from '../../components/Button'
import { cx } from '../../components/cx'
import type { ISODate } from '../../db/types'
import { useKcalByDate } from '../../hooks/useFoodData'
import { addDays, fromISODate, toISODate, WEEKDAY_SHORT } from '../../lib/date'
import { formatShortDate } from '../../lib/format'

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

function rangeLabel(first: ISODate, last: ISODate) {
  const a = fromISODate(first)
  const b = fromISODate(last)
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MONTH[b.getMonth()]}`
    : `${a.getDate()} ${MONTH[a.getMonth()]} – ${b.getDate()} ${MONTH[b.getMonth()]}`
}

/** Seven days with a small intake bar under each; arrows page a week at a time. */
export function DateStrip({ selected, onSelect, targetKcal }: { selected: ISODate; onSelect: (d: ISODate) => void; targetKcal: number }) {
  const today = toISODate()
  const [end, setEnd] = useState<ISODate>(() => (selected < addDays(today, -6) ? addDays(selected, 3) : today))
  const days = Array.from({ length: 7 }, (_, i) => addDays(end, i - 6))
  const kcal = useKcalByDate(days)

  return (
    <nav aria-label="Choose day" className="flex flex-col gap-1">
      <div className="-mx-2 flex items-center">
        <IconButton label="Previous week" variant="ghost" onClick={() => setEnd((e) => addDays(e, -7))}>
          <ChevronLeft size={20} aria-hidden="true" />
        </IconButton>
        <p className="num flex-1 text-center text-[13px] font-extrabold uppercase tracking-[0.08em] text-muted" aria-live="polite">
          {rangeLabel(days[0]!, days[6]!)}
        </p>
        <IconButton
          label="Next week"
          variant="ghost"
          disabled={end >= today}
          onClick={() => setEnd((e) => (addDays(e, 7) > today ? today : addDays(e, 7)))}
        >
          <ChevronRight size={20} aria-hidden="true" />
        </IconButton>
      </div>
      <ol className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const date = fromISODate(d)
          const eaten = kcal?.[d] ?? 0
          const pct = targetKcal > 0 ? Math.min(100, (eaten / targetKcal) * 100) : 0
          const isSel = d === selected
          return (
            <li key={d}>
              <button
                type="button"
                disabled={d > today}
                aria-pressed={isSel}
                aria-label={`${formatShortDate(date)}${d === today ? ' (today)' : ''}, ${Math.round(eaten)} kcal`}
                onClick={() => onSelect(d)}
                className={cx(
                  'flex h-[64px] w-full flex-col items-center justify-center gap-1 rounded-btn text-center disabled:opacity-40',
                  isSel ? 'bg-accent text-on-accent' : 'bg-surface text-fg active:bg-surface-2',
                )}
              >
                <span className={cx('text-[11px] font-extrabold uppercase', isSel ? 'text-on-accent' : 'text-muted')}>
                  {WEEKDAY_SHORT[date.getDay()]}
                </span>
                <span className="num text-[18px] font-extrabold leading-none">{date.getDate()}</span>
                <span className={cx('h-1 w-6 overflow-hidden rounded-full', isSel ? 'bg-on-accent/20' : 'bg-surface-2')} aria-hidden="true">
                  <span
                    className={cx('block h-full rounded-full', isSel ? 'bg-on-accent' : eaten > targetKcal ? 'bg-flame' : 'bg-accent')}
                    style={{ width: `${pct}%` }}
                  />
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
