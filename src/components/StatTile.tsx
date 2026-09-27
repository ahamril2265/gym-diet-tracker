import { TrendingDown, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'

/** Label · value · optional signed delta (vs a named period). */
export function StatTile({
  label,
  value,
  delta,
  hint,
}: {
  label: string
  value: ReactNode
  /** Signed change; direction shown with an arrow as well as a sign, never colour alone. */
  delta?: { value: number; text: string } | null
  hint?: string
}) {
  return (
    <div className="card flex min-w-0 flex-col gap-1 p-3">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="h-display num truncate text-[30px] leading-none">{value}</p>
      {delta ? (
        <p className={cx('num flex items-center gap-1 text-[12px] font-bold', delta.value >= 0 ? 'text-accent' : 'text-muted')}>
          {delta.value >= 0 ? <TrendingUp size={14} aria-hidden="true" /> : <TrendingDown size={14} aria-hidden="true" />}
          {delta.text}
        </p>
      ) : (
        hint && <p className="text-[12px] font-semibold text-faint">{hint}</p>
      )}
    </div>
  )
}
