import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDownRight, ArrowUpRight, Plus, Trash } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Button, IconButton } from '../../components/Button'
import { deleteMeasurement, MEASUREMENT_SITES, saveMeasurements, summarizeMeasurements } from '../../db/body'
import { db } from '../../db/db'
import type { LengthUnit, MeasurementSite } from '../../db/types'
import { fromISODate, toISODate } from '../../lib/date'
import { formatShortDate } from '../../lib/format'
import { lengthFromCm, lengthToCm, round } from '../../lib/units'

const LABEL = Object.fromEntries(MEASUREMENT_SITES.map((s) => [s.site, s.label])) as Record<MeasurementSite, string>

/** Grid of body measurements with the change vs the previous reading for each site. */
export function MeasurementsCard({ unit }: { unit: LengthUnit }) {
  const list = useLiveQuery(() => db.measurements.toArray())
  const [logging, setLogging] = useState(false)
  const [historyFor, setHistoryFor] = useState<MeasurementSite | null>(null)
  const conv = (cm: number) => round(lengthFromCm(cm, unit), 1)
  const summary = list ? summarizeMeasurements(list) : []

  return (
    <section className="card flex flex-col gap-3 p-4" aria-labelledby="meas-h">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="meas-h" className="h-display text-[22px]">
            Measurements
          </h2>
          <p className="text-[13px] font-semibold text-muted">Change vs your previous reading · tap a site for history</p>
        </div>
        <Button size="sm" icon={<Plus size={16} aria-hidden="true" />} onClick={() => setLogging(true)}>
          Log
        </Button>
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {summary.map(({ site, latest, change }) => (
          <li key={site}>
            <button
              type="button"
              onClick={() => setHistoryFor(site)}
              disabled={!latest}
              className="flex h-full min-h-[76px] w-full flex-col justify-between rounded-btn bg-surface-2 px-2.5 py-2 text-left active:bg-border disabled:cursor-default"
              aria-label={
                latest
                  ? `${LABEL[site]}: ${conv(latest.cm)} ${unit}${change !== null ? `, ${change > 0 ? 'up' : change < 0 ? 'down' : 'no change'} ${conv(Math.abs(change))}` : ''}. Show history`
                  : `${LABEL[site]}: not measured yet`
              }
            >
              <span className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-muted">{LABEL[site]}</span>
              <span className="h-display num text-[22px] leading-none">
                {latest ? conv(latest.cm) : '—'}
                {latest && <span className="ml-0.5 font-sans text-[11px] font-bold normal-case text-muted">{unit}</span>}
              </span>
              <span className="num flex items-center gap-0.5 text-[11px] font-bold text-faint">
                {change === null ? (
                  latest ? 'first reading' : ' '
                ) : change === 0 ? (
                  '±0'
                ) : (
                  <>
                    {change > 0 ? <ArrowUpRight size={12} aria-hidden="true" /> : <ArrowDownRight size={12} aria-hidden="true" />}
                    {change > 0 ? '+' : '−'}
                    {conv(Math.abs(change))}
                  </>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <LogMeasurementsSheet open={logging} onClose={() => setLogging(false)} unit={unit} />
      <SiteHistorySheet site={historyFor} onClose={() => setHistoryFor(null)} unit={unit} />
    </section>
  )
}

function LogMeasurementsSheet({ open, onClose, unit }: { open: boolean; onClose: () => void; unit: LengthUnit }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (open) {
      setValues({})
      setError(null)
    }
  }, [open])

  return (
    <BottomSheet open={open} onClose={onClose} title="Log measurements">
      <form
        className="flex flex-col gap-4 p-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const entries: { site: MeasurementSite; cm: number }[] = []
          for (const { site, label } of MEASUREMENT_SITES) {
            const raw = values[site]?.trim()
            if (!raw) continue
            const cm = lengthToCm(Number(raw.replace(',', '.')), unit)
            if (!Number.isFinite(cm) || cm < 10 || cm > 250) return setError(`${label} looks off — check the number.`)
            entries.push({ site, cm })
          }
          if (entries.length === 0) return setError('Enter at least one measurement.')
          await saveMeasurements(toISODate(), entries)
          onClose()
        }}
      >
        <p className="text-[13px] text-faint">Today · fill in the ones you measured. Measure relaxed, same time of day, tape snug but not tight.</p>
        <div className="grid grid-cols-2 gap-3">
          {MEASUREMENT_SITES.map(({ site, label }) => (
            <label key={site} className="relative flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-muted">{label}</span>
              <input
                className="input num pr-10"
                inputMode="decimal"
                value={values[site] ?? ''}
                onChange={(e) => {
                  setValues((v) => ({ ...v, [site]: e.target.value }))
                  setError(null)
                }}
              />
              <span className="pointer-events-none absolute bottom-3.5 right-4 text-[14px] font-bold text-faint">{unit}</span>
            </label>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-[13px] font-semibold text-danger">
            {error}
          </p>
        )}
        <Button type="submit" block>
          Save
        </Button>
      </form>
    </BottomSheet>
  )
}

function SiteHistorySheet({ site, onClose, unit }: { site: MeasurementSite | null; onClose: () => void; unit: LengthUnit }) {
  const history = useLiveQuery(async () => (site ? db.measurements.where('site').equals(site).reverse().sortBy('date') : []), [site])
  const conv = (cm: number) => round(lengthFromCm(cm, unit), 1)
  return (
    <BottomSheet open={site !== null} onClose={onClose} title={site ? `${LABEL[site]} history` : ''}>
      <ul className="divide-y divide-divider px-4 pb-4">
        {(history ?? []).map((m, i, arr) => {
          const prev = arr[i + 1]
          const diff = prev ? round(m.cm - prev.cm, 1) : null
          return (
            <li key={m.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 text-[14px] font-semibold text-muted">{formatShortDate(fromISODate(m.date))}</span>
              <span className="num text-[15px] font-bold">
                {conv(m.cm)} {unit}
              </span>
              <span className="num w-14 text-right text-[12px] font-bold text-faint">
                {diff === null ? '' : `${diff > 0 ? '+' : diff < 0 ? '−' : '±'}${conv(Math.abs(diff))}`}
              </span>
              <IconButton
                label={`Delete ${formatShortDate(fromISODate(m.date))} reading`}
                variant="ghost"
                onClick={() => {
                  if (window.confirm('Delete this reading?')) void deleteMeasurement(m.id)
                }}
              >
                <Trash size={16} aria-hidden="true" />
              </IconButton>
            </li>
          )
        })}
      </ul>
    </BottomSheet>
  )
}
