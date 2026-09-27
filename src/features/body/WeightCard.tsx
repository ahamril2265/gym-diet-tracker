import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button, IconButton } from '../../components/Button'
import { ChartCard, TooltipBox } from '../../components/charts/ChartCard'
import { Segmented } from '../../components/Segmented'
import { deleteWeight } from '../../db/body'
import { db } from '../../db/db'
import type { WeightUnit } from '../../db/types'
import { movingAverage, niceTicks, weightSummary, type TrendPoint } from '../../lib/calc/progress'
import { addDays, fromISODate, toISODate } from '../../lib/date'
import { formatDayMonth, formatShortDate } from '../../lib/format'
import { round, weightFromKg } from '../../lib/units'
import { colors } from '../../theme/colors'
import { WeightSheet } from './WeightSheet'

type Range = '30' | '90' | '365' | 'all'
const RANGES: { value: Range; label: string }[] = [
  { value: '30', label: '30D' },
  { value: '90', label: '90D' },
  { value: '365', label: '1Y' },
  { value: 'all', label: 'All' },
]
const tick = { fill: colors.faint, fontSize: 11, fontWeight: 600 }

/** Today's weight, 7-day moving average, change this month; weigh-ins (thin grey) vs trend (thick gold). */
export function WeightCard({ unit }: { unit: WeightUnit }) {
  const weights = useLiveQuery(() => db.bodyWeights.orderBy('date').toArray())
  const [range, setRange] = useState<Range>('90')
  const [logging, setLogging] = useState(false)
  const today = toISODate()
  const series = useMemo(() => (weights ? movingAverage(weights) : []), [weights])
  const summary = weightSummary(series, today)
  const conv = (kg: number) => round(weightFromKg(kg, unit), 1)

  const visible = range === 'all' ? series : series.filter((p) => p.date >= addDays(today, -Number(range)))
  const points = visible.map((p) => ({ date: p.date, kg: conv(p.kg), trend: conv(p.trend) }))
  const all = points.flatMap((p) => [p.kg, p.trend])
  const ticks = all.length ? niceTicks(Math.min(...all), Math.max(...all)) : [0, 1]

  const latest = summary.latest
  return (
    <>
      <section className="card flex flex-col gap-3 p-4" aria-labelledby="weight-h">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="weight-h" className="h-display text-[22px]">
              Weight
            </h2>
            <p className="text-[13px] font-semibold text-muted">
              {latest ? (latest.date === today ? 'Weighed in today' : `Last weigh-in ${formatShortDate(fromISODate(latest.date))}`) : 'No weigh-ins yet'}
            </p>
          </div>
          <Button size="sm" icon={<Plus size={16} aria-hidden="true" />} onClick={() => setLogging(true)}>
            Log
          </Button>
        </div>
        <dl className="grid grid-cols-3 gap-2">
          <Figure label="Latest" value={latest ? `${conv(latest.kg)}` : '—'} unit={latest ? unit : ''} />
          <Figure label="7-day avg" value={latest ? `${conv(latest.trend)}` : '—'} unit={latest ? unit : ''} />
          <Figure
            label="This month"
            value={summary.monthChange === null ? '—' : `${summary.monthChange > 0 ? '+' : summary.monthChange < 0 ? '−' : '±'}${conv(Math.abs(summary.monthChange))}`}
            unit={summary.monthChange === null ? '' : unit}
          />
        </dl>
      </section>

      {series.length > 0 && (
        <>
          <Segmented legend="Chart range" hideLegend options={RANGES} value={range} onChange={setRange} />
          <ChartCard
            title="Weight trend"
            subtitle="7-day moving average smooths out daily water swings"
            legend={[
              { label: 'Daily weigh-in', color: colors.faint, shape: 'line' },
              { label: '7-day trend', color: colors.accent, shape: 'thick-line' },
            ]}
            table={<WeightTable series={visible} unit={unit} />}
          >
            {points.length === 0 ? (
              <p className="py-8 text-center text-[14px] text-muted">No weigh-ins in this range.</p>
            ) : (
              <div role="img" aria-label={`Weight chart: ${points.length} weigh-ins; latest trend ${points[points.length - 1]!.trend} ${unit}.`}>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={points} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke={colors.divider} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: string) => formatDayMonth(fromISODate(d))}
                      tick={tick}
                      tickLine={false}
                      axisLine={{ stroke: colors.border }}
                      minTickGap={28}
                    />
                    <YAxis domain={[ticks[0]!, ticks[ticks.length - 1]!]} ticks={ticks} width={36} tick={tick} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ stroke: colors.muted, strokeWidth: 1 }}
                      content={({ active, payload }) => {
                        const p = active ? (payload?.[0]?.payload as (typeof points)[number] | undefined) : undefined
                        return p ? (
                          <TooltipBox
                            title={formatShortDate(fromISODate(p.date))}
                            rows={[
                              { label: '7-day trend', value: `${p.trend} ${unit}`, color: colors.accent },
                              { label: 'weigh-in', value: `${p.kg} ${unit}`, color: colors.faint },
                            ]}
                          />
                        ) : null
                      }}
                    />
                    <Line
                      dataKey="kg"
                      name="Daily weigh-in"
                      stroke={colors.faint}
                      strokeWidth={1.5}
                      dot={{ r: 2.5, fill: colors.faint, strokeWidth: 0 }}
                      activeDot={{ r: 4, fill: colors.faint, stroke: colors.surface, strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="trend"
                      name="7-day trend"
                      stroke={colors.accent}
                      strokeWidth={3.5}
                      strokeLinecap="round"
                      dot={false}
                      activeDot={{ r: 5, fill: colors.accent, stroke: colors.surface, strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </>
      )}

      <WeightSheet open={logging} onClose={() => setLogging(false)} unit={unit} latestKg={latest?.kg ?? null} />
    </>
  )
}

function Figure({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-btn bg-surface-2 px-3 py-2.5">
      <dt className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="h-display num mt-0.5 text-[26px] leading-none">
        {value}
        {unit && <span className="ml-0.5 font-sans text-[12px] font-bold normal-case text-muted">{unit}</span>}
      </dd>
    </div>
  )
}

/** Table twin of the chart, newest first, with delete for mistaken weigh-ins. */
function WeightTable({ series, unit }: { series: TrendPoint[]; unit: WeightUnit }) {
  const conv = (kg: number) => round(weightFromKg(kg, unit), 1)
  return (
    <table className="w-full text-left text-[13px]">
      <thead className="sticky top-0 bg-surface">
        <tr className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-faint">
          <th scope="col" className="py-1.5">
            Date
          </th>
          <th scope="col" className="py-1.5 text-right">
            Weigh-in
          </th>
          <th scope="col" className="py-1.5 text-right">
            7-day avg
          </th>
          <th scope="col">
            <span className="sr-only">Delete</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-divider">
        {[...series].reverse().map((p) => (
          <tr key={p.date}>
            <td className="py-1 font-semibold text-muted">{formatShortDate(fromISODate(p.date))}</td>
            <td className="num py-1 text-right font-bold">
              {conv(p.kg)} {unit}
            </td>
            <td className="num py-1 text-right font-semibold text-muted">{conv(p.trend)}</td>
            <td className="w-11 py-0.5 text-right">
              <IconButton
                label={`Delete weigh-in on ${formatShortDate(fromISODate(p.date))}`}
                variant="ghost"
                onClick={() => {
                  if (window.confirm(`Delete the weigh-in on ${formatShortDate(fromISODate(p.date))}?`)) void deleteWeight(p.date)
                }}
              >
                <Trash size={16} aria-hidden="true" />
              </IconButton>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
