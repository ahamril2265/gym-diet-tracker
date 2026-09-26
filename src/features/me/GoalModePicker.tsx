import { useId } from 'react'
import { RadioCard } from '../../components/RadioCard'
import type { GoalMode } from '../../db/types'
import { GOAL_OPTIONS } from './profileDraft'

export function GoalModePicker({ value, onChange }: { value: GoalMode; onChange: (g: GoalMode) => void }) {
  const name = useId()
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Goal mode</legend>
      {GOAL_OPTIONS.map((o) => (
        <RadioCard
          key={o.value}
          name={name}
          value={o.value}
          size="lg"
          checked={value === o.value}
          onChange={() => onChange(o.value)}
          title={o.label}
          meta={o.adjustment}
        >
          {o.desc}
        </RadioCard>
      ))}
    </fieldset>
  )
}
