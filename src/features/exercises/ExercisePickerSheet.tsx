import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { addCustomExercise } from '../../db/exercises'
import { ExerciseForm } from './ExerciseForm'
import { ExerciseList } from './ExerciseList'

export interface ExercisePickerSheetProps {
  open: boolean
  title: string
  onClose: () => void
  onPick: (exerciseId: string) => void
  disabledIds?: Set<string>
}

/** Pick an exercise from the library, or create a custom one on the spot. */
export function ExercisePickerSheet({ open, title, onClose, onPick, disabledIds }: ExercisePickerSheetProps) {
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!open) setCreating(false)
  }, [open])

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={creating ? 'New exercise' : title}
      footer={
        creating ? undefined : (
          <Button variant="surface" block icon={<Plus size={18} aria-hidden="true" />} onClick={() => setCreating(true)}>
            Create custom exercise
          </Button>
        )
      }
    >
      {creating ? (
        <ExerciseForm
          submitLabel="Create & add"
          onCancel={() => setCreating(false)}
          onSubmit={async (input) => {
            const id = await addCustomExercise(input)
            onPick(id)
          }}
        />
      ) : (
        <ExerciseList onSelect={(ex) => onPick(ex.id)} disabledIds={disabledIds} />
      )}
    </BottomSheet>
  )
}
