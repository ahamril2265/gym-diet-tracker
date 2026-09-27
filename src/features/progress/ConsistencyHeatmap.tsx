import { ChartCard, DataTable } from '../../components/charts/ChartCard'
import { heatLevel, type HeatCell } from '../../lib/calc/progress'
import { fromISODate } from '../../lib/date'
import { formatShortDate } from '../../lib/format'
import { colors, goldRamp } from '../../theme/colors'

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']
const LEVEL_COLOR = [colors['surface-2'], ...goldRamp] as const
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** 12 weeks × 7 days. Darker → lighter gold = more working sets that day (sequential, one hue). */
export function ConsistencyHeatmap({ grid }: { grid: HeatCell[][] }) {
  const days = grid.flat().filter((c) => !c.future)
  const trained = days.filter((c) => c.trained).length
  const perWeek = trained / grid.length

  return (
    <ChartCard
      title="Consistency"
      subtitle={
        <span className="num">
          {trained} training days in {grid.length} weeks · {perWeek.toFixed(1)} per week
        </span>
      }
      table={
        <DataTable
          columns={['Week of', 'Days trained', 'Sets']}
          rows={[...grid].reverse().map((week) => [
            formatShortDate(fromISODate(week[0]!.date)),
            week.filter((c) => c.trained).length,
            week.reduce((s, c) => s + c.sets, 0),
          ])}
        />
      }
    >
      <div
        role="img"
        aria-label={`Training calendar: ${trained} of the last ${days.length} days had a workout.`}
        className="grid grid-cols-[28px_1fr] gap-x-1.5"
      >
        {/* Month labels over the week columns where a new month starts */}
        <span />
        <div className="grid grid-cols-12 gap-[3px] pb-1 text-[10px] font-bold text-faint">
          {grid.map((week, i) => {
            const d = fromISODate(week[0]!.date)
            const prev = i > 0 ? fromISODate(grid[i - 1]![0]!.date) : null
            return <span key={week[0]!.date}>{!prev || prev.getMonth() !== d.getMonth() ? MONTHS[d.getMonth()] : ''}</span>
          })}
        </div>
        <div className="grid grid-rows-7 gap-[3px] text-[10px] font-bold text-faint">
          {DAY_LABELS.map((l, i) => (
            <span key={i} className="flex items-center">
              {l}
            </span>
          ))}
        </div>
        <div className="grid grid-flow-col grid-cols-12 grid-rows-7 gap-[3px]">
          {grid.flatMap((week) =>
            week.map((cell) => (
              <span
                key={cell.date}
                title={cell.future ? undefined : `${formatShortDate(fromISODate(cell.date))}: ${cell.trained ? `${cell.sets} sets` : 'rest'}`}
                className="aspect-square rounded-[3px]"
                style={
                  cell.future
                    ? { background: 'transparent', boxShadow: `inset 0 0 0 1px ${colors.divider}` }
                    : { background: LEVEL_COLOR[heatLevel(cell)] }
                }
              />
            )),
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5 text-[11px] font-bold text-faint" aria-hidden="true">
        Rest
        {LEVEL_COLOR.map((c) => (
          <span key={c} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />
        ))}
        More sets
      </div>
    </ChartCard>
  )
}
