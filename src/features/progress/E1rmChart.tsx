import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard, DataTable, TooltipBox } from '../../components/charts/ChartCard'
import { Select } from '../../components/Select'
import type { WeightUnit } from '../../db/types'
import { e1rmSeries, exercisesByFrequency, niceTicks, seriesGain } from '../../lib/calc/progress'
import { addDays, fromISODate, toISODate } from '../../lib/date'
import { formatDayMonth, formatShortDate } from '../../lib/format'
import { round, weightFromKg } from '../../lib/units'
import { colors } from '../../theme/colors'
import type { ProgressData } from './useProgressData'

const WEEKS = 12
const tick = { fill: colors.faint, fontSize: 11, fontWeight: 600 }
const shortDay = (iso: string) => formatDayMonth(fromISODate(iso))

/** Estimated 1RM (Epley) for a chosen lift over the last 12 weeks, with the gain. */
export function E1rmChart({ data, unit }: { data: ProgressData; unit: WeightUnit }) {
  const options = useMemo(() => {
    // Most-trained lifts first; compounds are the interesting ones for 1RM, so they lead on ties.
    return exercisesByFrequency(data.workouts, data.sets)
      .map((o) => ({ ...o, ex: data.exercises.get(o.exerciseId) }))
      .filter((o) => o.ex)
      .sort((a, b) => b.sessions - a.sessions || Number(b.ex!.isCompound) - Number(a.ex!.isCompound))
  }, [data])
  const [chosen, setChosen] = useState<string | null>(null)
  const exerciseId = chosen && options.some((o) => o.exerciseId === chosen) ? chosen : options[0]?.exerciseId

  const from = addDays(toISODate(), -7 * WEEKS)
  const series = useMemo(
    () => (exerciseId ? e1rmSeries(exerciseId, data.workouts, data.sets, from) : []),
    [exerciseId, data, from],
  )
  const gain = seriesGain(series)
  const conv = (kg: number) => round(weightFromKg(kg, unit), 1)
  const points = series.map((p) => ({ ...p, value: conv(p.e1rm) }))

  if (options.length === 0) {
    return (
      <ChartCard title="Estimated 1RM">
        <p className="rounded-btn border border-dashed border-border p-4 text-center text-[14px] text-muted">
          Finish a workout with weighted sets to see your strength trend.
        </p>
      </ChartCard>
    )
  }

  const values = points.map((p) => p.value)
  const ticks = niceTicks(Math.min(...values), Math.max(...values))
  const last = points[points.length - 1]

  return (
    <ChartCard
      title="Estimated 1RM"
      subtitle={
        gain ? (
          <span className="num">
            <span className={gain.kg >= 0 ? 'font-extrabold text-accent' : 'font-extrabold text-fg'}>
              {gain.kg >= 0 ? '+' : '−'}
              {conv(Math.abs(gain.kg))} {unit} ({gain.pct >= 0 ? '+' : '−'}
              {Math.abs(gain.pct)}%)
            </span>{' '}
            in {WEEKS} weeks (best of first vs last 2 weeks) · Epley
          </span>
        ) : (
          `Last ${WEEKS} weeks · Epley formula`
        )
      }
      table={
        <DataTable
          columns={['Date', 'Best set', `e1RM (${unit})`]}
          rows={[...points].reverse().map((p) => [formatShortDate(fromISODate(p.date)), `${conv(p.kg)} × ${p.reps}`, p.value])}
        />
      }
    >
      <label className="flex items-center gap-3">
        <span className="shrink-0 text-[13px] font-bold text-muted">Lift</span>
        <div className="min-w-0 flex-1">
          <Select value={exerciseId} onChange={(e) => setChosen(e.target.value)}>
            {options.map((o) => (
              <option key={o.exerciseId} value={o.exerciseId}>
                {o.ex!.name} ({o.sessions})
              </option>
            ))}
          </Select>
        </div>
      </label>
      {points.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-muted">No sessions of this lift in the last {WEEKS} weeks.</p>
      ) : (
        <div role="img" aria-label={`Estimated one-rep max for the selected lift: ${points.length} sessions, latest ${last?.value} ${unit}.`}>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={points} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={colors.divider} />
              <XAxis dataKey="date" tickFormatter={shortDay} tick={tick} tickLine={false} axisLine={{ stroke: colors.border }} minTickGap={28} />
              <YAxis domain={[ticks[0]!, ticks[ticks.length - 1]!]} ticks={ticks} width={40} tick={tick} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ stroke: colors.muted, strokeWidth: 1 }}
                content={({ active, payload }) => {
                  const p = active ? (payload?.[0]?.payload as (typeof points)[number] | undefined) : undefined
                  return p ? (
                    <TooltipBox
                      title={formatShortDate(fromISODate(p.date))}
                      rows={[
                        { label: 'e1RM', value: `${p.value} ${unit}`, color: colors.accent },
                        { label: 'best set', value: `${conv(p.kg)} × ${p.reps}`, color: colors.faint },
                      ]}
                    />
                  ) : null
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name="e1RM"
                stroke={colors.accent}
                strokeWidth={2.5}
                strokeLinecap="round"
                dot={{ r: 4, fill: colors.accent, stroke: colors.surface, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: colors.accent, stroke: colors.surface, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}
