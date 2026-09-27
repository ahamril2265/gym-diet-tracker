import { ChartLine, Table2 } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { cx } from '../cx'

export interface LegendItem {
  label: string
  color: string
  /** Line key (for line series) or square swatch (for bars / cells). */
  shape?: 'line' | 'thick-line' | 'square'
}

/**
 * Card for a chart: title, optional subtitle and legend, and a Chart / Table toggle so every value is
 * readable without the chart (screen readers, colour-blind users, exact numbers).
 */
export function ChartCard({
  title,
  subtitle,
  legend,
  actions,
  table,
  children,
  className,
}: {
  title: string
  subtitle?: ReactNode
  legend?: LegendItem[]
  actions?: ReactNode
  /** The chart's table twin. */
  table?: ReactNode
  children: ReactNode
  className?: string
}) {
  const [showTable, setShowTable] = useState(false)
  const titleId = useId()
  return (
    <figure className={cx('card flex flex-col gap-3 p-4', className)} aria-labelledby={titleId}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id={titleId} className="h-display text-[22px]">
            {title}
          </h2>
          {subtitle && <div className="text-[13px] font-semibold text-muted">{subtitle}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          {table && (
            <button
              type="button"
              aria-pressed={showTable}
              aria-label={showTable ? `Show ${title} as a chart` : `Show ${title} as a table`}
              onClick={() => setShowTable((s) => !s)}
              className="flex h-11 w-11 items-center justify-center rounded-btn-sm text-muted active:bg-surface-2"
            >
              {showTable ? <ChartLine size={18} aria-hidden="true" /> : <Table2 size={18} aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>
      {legend && legend.length > 0 && !showTable && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-bold text-muted" aria-label="Legend">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cx(
                  'inline-block',
                  l.shape === 'square' ? 'h-2.5 w-2.5 rounded-[3px]' : l.shape === 'thick-line' ? 'h-[3px] w-4 rounded-full' : 'h-[2px] w-4 rounded-full',
                )}
                style={{ background: l.color }}
              />
              {l.label}
            </li>
          ))}
        </ul>
      )}
      {showTable && table ? <div className="max-h-[320px] overflow-y-auto">{table}</div> : children}
    </figure>
  )
}

/** Compact data table used as a chart's accessible twin. */
export function DataTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-[13px]">
      <thead className="sticky top-0 bg-surface">
        <tr className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-faint">
          {columns.map((c, i) => (
            <th key={c} scope="col" className={cx('py-1.5', i > 0 && 'text-right')}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-divider">
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => (
              <td key={j} className={cx('num py-1.5 font-semibold', j > 0 ? 'text-right text-fg' : 'text-muted')}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Tooltip body for Recharts: value first (strong), series name second, each keyed by a short line. */
export function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color: string }[] }) {
  return (
    <div className="rounded-btn-sm border border-border bg-surface-2 px-3 py-2 shadow-lg shadow-black/40">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-faint">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="mt-1 flex items-center gap-2 text-[13px]">
          <span aria-hidden="true" className="inline-block h-[2px] w-3 rounded-full" style={{ background: r.color }} />
          <span className="num font-extrabold text-fg">{r.value}</span>
          <span className="font-semibold text-muted">{r.label}</span>
        </p>
      ))}
    </div>
  )
}
