import { useEffect, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { logWeight } from '../../db/actions'
import type { WeightUnit } from '../../db/types'
import { round, weightFromKg, weightToKg } from '../../lib/units'

/** Log today's weigh-in. The newest weigh-in also updates the weight used for your targets. */
export function WeightSheet({
  open,
  onClose,
  unit,
  latestKg,
}: {
  open: boolean
  onClose: () => void
  unit: WeightUnit
  latestKg: number | null
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setText(latestKg ? String(round(weightFromKg(latestKg, unit), 1)) : '')
      setError(null)
    }
  }, [open, latestKg, unit])

  return (
    <BottomSheet open={open} onClose={onClose} title="Log weight">
      <form
        className="flex flex-col gap-4 p-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const v = Number(text.replace(',', '.'))
          const kg = weightToKg(v, unit)
          if (!text.trim() || !Number.isFinite(kg) || kg < 30 || kg > 300) {
            setError(unit === 'kg' ? 'Enter a weight between 30 and 300 kg' : 'Enter a weight between 66 and 660 lb')
            return
          }
          await logWeight(round(kg, 2))
          onClose()
        }}
      >
        <Field label="Today’s weight" suffix={unit} error={error} hint="Weigh in the morning, before eating, for the steadiest trend.">
          {(p) => (
            <input
              {...p}
              className="input num h-14 pr-12 text-[24px] font-extrabold"
              inputMode="decimal"
              autoFocus
              value={text}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => {
                setText(e.target.value)
                setError(null)
              }}
            />
          )}
        </Field>
        <Button type="submit" block>
          Save
        </Button>
      </form>
    </BottomSheet>
  )
}
