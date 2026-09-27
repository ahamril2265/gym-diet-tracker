import { Minus, Pencil, Plus, ShieldCheck } from 'lucide-react'
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { ButtonLink, IconButton } from '../../components/Button'
import { ScreenHeader } from '../../components/ScreenHeader'
import { Segmented } from '../../components/Segmented'
import { ScreenSkeleton } from '../../components/Skeleton'
import { setGoalMode, updateSettings } from '../../db/actions'
import { useActiveSplit, useProfile, useSettings, useTargets } from '../../hooks/useAppData'
import { AiKeyCard } from './AiKeyCard'
import { DataCard } from './DataCard'
import { RemindersCard } from './RemindersCard'
import { GoalModePicker } from './GoalModePicker'
import { ProfileCard } from './ProfileCard'
import { SplitWeek } from './SplitWeek'
import { TargetsCard } from './TargetsCard'

export default function MeScreen() {
  const profile = useProfile()
  const settings = useSettings()
  const targets = useTargets()
  const active = useActiveSplit()
  const { hash } = useLocation()
  const ready = Boolean(profile && settings && targets && active !== undefined)

  // Links like /me#ai (from the camera screens) jump to that section once it has rendered.
  useEffect(() => {
    if (ready && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [ready, hash])

  if (!profile || !settings || !targets || active === undefined) return <ScreenSkeleton />

  const units = { weightUnit: settings.weightUnit, lengthUnit: settings.lengthUnit }

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader eyebrow="Goals & settings" title={profile.name} />

      <section aria-labelledby="goal-h" className="flex flex-col gap-3">
        <h2 id="goal-h" className="h-display text-[24px]">
          Goal mode
        </h2>
        <GoalModePicker value={profile.goal} onChange={(g) => void setGoalMode(g)} />
      </section>

      <TargetsCard key={targets.isCustom ? 'custom' : 'calc'} info={targets} />

      <ProfileCard profile={profile} units={units} />

      <section className="card p-5" aria-labelledby="split-h">
        <h2 id="split-h" className="h-display text-[24px]">
          Training split
        </h2>
        {active ? (
          <>
            <p className="mt-1 text-[14px] font-bold text-muted">{active.split.name}</p>
            <div className="mt-3">
              <SplitWeek
                schedule={active.split.schedule}
                nameOf={(id) => active.days.find((d) => d.id === id)?.name.replace('Full Body ', 'FB ') ?? '?'}
                highlightDay={new Date().getDay()}
              />
            </div>
          </>
        ) : (
          <p className="mt-2 text-[14px] text-muted">No split yet.</p>
        )}
        <ButtonLink to="/train/split" variant="surface" size="sm" className="mt-4" icon={<Pencil size={16} aria-hidden="true" />}>
          {active ? 'Edit split' : 'Set up split'}
        </ButtonLink>
      </section>

      <section className="card flex flex-col gap-5 p-5" aria-labelledby="training-h">
        <h2 id="training-h" className="h-display text-[24px]">
          Rest timers
        </h2>
        <RestStepper
          label="Compound lifts"
          value={settings.restCompoundSec}
          onChange={(v) => void updateSettings({ restCompoundSec: v })}
        />
        <RestStepper
          label="Accessories"
          value={settings.restAccessorySec}
          onChange={(v) => void updateSettings({ restAccessorySec: v })}
        />
      </section>

      <section className="card flex flex-col gap-4 p-5" aria-labelledby="units-h">
        <h2 id="units-h" className="h-display text-[24px]">
          Units
        </h2>
        <Segmented
          legend="Weight"
          options={[
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' },
          ]}
          value={settings.weightUnit}
          onChange={(weightUnit) => void updateSettings({ weightUnit })}
        />
        <Segmented
          legend="Length"
          options={[
            { value: 'cm', label: 'cm' },
            { value: 'in', label: 'in' },
          ]}
          value={settings.lengthUnit}
          onChange={(lengthUnit) => void updateSettings({ lengthUnit })}
        />
      </section>

      <AiKeyCard apiKey={settings.geminiApiKey} />

      <RemindersCard settings={settings} />

      <DataCard />

      <p className="flex items-start gap-2 px-1 text-[13px] text-faint">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Everything you log stays on this device. No account, no cloud.
      </p>
    </div>
  )
}

function formatRest(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function RestStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const step = 15
  const min = 15
  const max = 600
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[15px] font-bold">{label}</span>
      <div className="flex items-center gap-2">
        <IconButton label={`Decrease ${label} rest by ${step} seconds`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>
          <Minus size={18} aria-hidden="true" />
        </IconButton>
        <output className="h-display num w-16 text-center text-[26px]" aria-live="polite">
          {formatRest(value)}
        </output>
        <IconButton label={`Increase ${label} rest by ${step} seconds`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>
          <Plus size={18} aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  )
}
