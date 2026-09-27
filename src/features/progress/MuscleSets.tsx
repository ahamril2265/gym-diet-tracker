import { ChartCard, DataTable } from '../../components/charts/ChartCard'
import { cx } from '../../components/cx'
import { MUSCLE_LABEL } from '../../db/seed/exercises'
import type { Muscle } from '../../db/types'
import { SET_TARGET, zoneStatus } from '../../lib/calc/progress'
import { colors } from '../../theme/colors'

const STATUS_TEXT = { below: 'Low', in: 'In range', above: 'High' } as const

/**
 * Working sets per muscle this week as horizontal bars over a shaded 10–20 target zone. Bars outside the
 * zone are orange AND labelled Low/High, so the state never depends on colour alone.
 */
export function MuscleSets({ counts, muscles }: { counts: Partial<Record<Muscle, number>>; muscles: Muscle[] }) {
  const rows = muscles.map((m) => ({ muscle: m, sets: counts[m] ?? 0 }))
  const max = Math.max(24, ...rows.map((r) => r.sets + 2))
  const pct = (n: number) => `${(n / max) * 100}%`

  return (
    <ChartCard
      title="Sets per muscle"
      subtitle={`This week (Mon–today) · target ${SET_TARGET.min}–${SET_TARGET.max} working sets`}
      legend={[
        { label: 'In range', color: colors.accent, shape: 'square' },
        { label: 'Outside range', color: colors.flame, shape: 'square' },
        { label: `Target ${SET_TARGET.min}–${SET_TARGET.max}`, color: colors.border, shape: 'square' },
      ]}
      table={
        <DataTable
          columns={['Muscle', 'Sets', 'Status']}
          rows={rows.map((r) => [MUSCLE_LABEL[r.muscle], r.sets, STATUS_TEXT[zoneStatus(r.sets)]])}
        />
      }
    >
      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const status = zoneStatus(r.sets)
          return (
            <li key={r.muscle} className="grid grid-cols-[76px_1fr_64px] items-center gap-2" title={`${MUSCLE_LABEL[r.muscle]}: ${r.sets} sets (${STATUS_TEXT[status]})`}>
              <span className="truncate text-[13px] font-bold text-muted">{MUSCLE_LABEL[r.muscle]}</span>
              <span className="relative h-5" aria-hidden="true">
                {/* Shaded target zone */}
                <span className="absolute inset-y-0 rounded-[4px] bg-border" style={{ left: pct(SET_TARGET.min), width: pct(SET_TARGET.max - SET_TARGET.min) }} />
                {/* Bar: square at the baseline, 4px rounded data end */}
                <span
                  className={cx('absolute left-0 top-1/2 h-3 -translate-y-1/2 rounded-r-[4px]', status === 'in' ? 'bg-accent' : 'bg-flame')}
                  style={{ width: r.sets > 0 ? pct(r.sets) : '2px' }}
                />
              </span>
              <span className="num text-right text-[13px] font-bold">
                {r.sets}
                {status !== 'in' && <span className="ml-1 text-[11px] font-extrabold uppercase text-faint">{STATUS_TEXT[status]}</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </ChartCard>
  )
}
