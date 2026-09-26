import { Camera, Droplet, Minus, Scale } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { addWater } from '../../db/food'
import type { WeightUnit } from '../../db/types'
import { useLatestWeight, useWater } from '../../hooks/useFoodData'
import { haptic } from '../../lib/feedback'
import { toISODate } from '../../lib/date'
import { round, weightFromKg } from '../../lib/units'
import { WeightSheet } from '../body/WeightSheet'

const tile = 'flex h-[112px] w-full flex-col justify-between rounded-card border border-border bg-surface p-3 text-left active:bg-surface-2'

export function QuickTiles({ unit, waterGoal }: { unit: WeightUnit; waterGoal: number }) {
  const today = toISODate()
  const water = useWater(today) ?? 0
  const weight = useLatestWeight()
  const [weighing, setWeighing] = useState(false)
  const loggedToday = weight?.date === today

  return (
    <div className="grid grid-cols-3 gap-3">
      <Link to="/scan/meal" className={tile}>
        <Camera size={22} className="text-accent" aria-hidden="true" />
        <span>
          <span className="h-display block text-[22px] leading-none">Scan</span>
          <span className="text-[12px] font-bold text-muted">Meal photo</span>
        </span>
      </Link>

      <button type="button" className={tile} onClick={() => setWeighing(true)} aria-label={weight ? `Weight ${round(weightFromKg(weight.kg, unit), 1)} ${unit}. Log weight` : 'Log weight'}>
        <Scale size={22} className="text-fat" aria-hidden="true" />
        <span>
          <span className="h-display num block text-[22px] leading-none">
            {weight ? round(weightFromKg(weight.kg, unit), 1) : '—'}
            <span className="ml-0.5 font-sans text-[12px] font-bold normal-case text-muted">{unit}</span>
          </span>
          <span className="text-[12px] font-bold text-muted">{loggedToday ? 'Logged today' : 'Log weight'}</span>
        </span>
      </button>

      <div className="relative">
        <button
          type="button"
          className={tile}
          onClick={() => {
            haptic()
            void addWater(today, 1)
          }}
          aria-label={`Water: ${water} of ${waterGoal} glasses. Add a glass`}
        >
          <Droplet size={22} className="text-water" fill={water >= waterGoal ? 'currentColor' : 'none'} aria-hidden="true" />
          <span>
            <span className="h-display num block text-[22px] leading-none">
              {water}
              <span className="font-sans text-[13px] font-bold text-muted">/{waterGoal}</span>
            </span>
            <span className="text-[12px] font-bold text-muted">Water +1</span>
          </span>
        </button>
        {water > 0 && (
          <button
            type="button"
            aria-label="Remove a glass of water"
            onClick={() => void addWater(today, -1)}
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-card text-muted active:text-fg"
          >
            <Minus size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <WeightSheet open={weighing} onClose={() => setWeighing(false)} unit={unit} latestKg={weight?.kg ?? null} />
    </div>
  )
}
