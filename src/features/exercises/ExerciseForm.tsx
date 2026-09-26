import { useState } from 'react'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { Segmented } from '../../components/Segmented'
import { Select } from '../../components/Select'
import { db } from '../../db/db'
import type { ExerciseInput } from '../../db/exercises'
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '../../db/seed/exercises'
import type { Equipment, Muscle } from '../../db/types'

export interface ExerciseFormProps {
  initial?: ExerciseInput
  /** Id being edited, so its own name doesn't count as a duplicate. */
  editingId?: string
  submitLabel: string
  onSubmit: (input: ExerciseInput) => Promise<void> | void
  onCancel?: () => void
}

export function ExerciseForm({ initial, editingId, submitLabel, onSubmit, onCancel }: ExerciseFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [muscle, setMuscle] = useState<Muscle>(initial?.muscle ?? 'chest')
  const [equipment, setEquipment] = useState<Equipment>(initial?.equipment ?? 'dumbbell')
  const [isCompound, setIsCompound] = useState(initial?.isCompound ?? false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    const trimmed = name.trim()
    if (!trimmed) return setError('Enter a name')
    if (trimmed.length > 40) return setError('Keep it under 40 characters')
    const clash = await db.exercises.filter((e) => e.id !== editingId && e.name.toLowerCase() === trimmed.toLowerCase()).first()
    if (clash) return setError('An exercise with this name already exists')
    setBusy(true)
    try {
      await onSubmit({ name: trimmed, muscle, equipment, isCompound })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-4 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <Field label="Name" error={error}>
        {(p) => (
          <input
            {...p}
            className="input"
            maxLength={40}
            value={name}
            autoFocus
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Muscle">
          {(p) => (
            <Select {...p} value={muscle} onChange={(e) => setMuscle(e.target.value as Muscle)}>
              {(Object.keys(MUSCLE_LABEL) as Muscle[]).map((m) => (
                <option key={m} value={m}>
                  {MUSCLE_LABEL[m]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Equipment">
          {(p) => (
            <Select {...p} value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
              {(Object.keys(EQUIPMENT_LABEL) as Equipment[]).map((q) => (
                <option key={q} value={q}>
                  {EQUIPMENT_LABEL[q]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Segmented
        legend="Type (sets the default rest timer)"
        options={[
          { value: 'compound', label: 'Compound' },
          { value: 'isolation', label: 'Isolation' },
        ]}
        value={isCompound ? 'compound' : 'isolation'}
        onChange={(v) => setIsCompound(v === 'compound')}
      />
      <div className="flex gap-3 pt-1">
        {onCancel && (
          <Button variant="surface" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" block disabled={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
