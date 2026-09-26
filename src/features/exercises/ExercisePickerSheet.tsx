import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { addCustomExercise } from '../../db/exercises'
import { ExerciseForm } from './ExerciseForm'
import { ExerciseList } from './ExerciseList'

interface BaseProps {
  open: boolean
  title: string
  onClose: () => void
  disabledIds?: Set<string>
}

interface SingleProps extends BaseProps {
  multiple?: false
  onPick: (exerciseId: string) => void
}

interface MultiProps extends BaseProps {
  multiple: true
  /** Ids in the order they were tapped. */
  onPickMany: (exerciseIds: string[]) => void
}

export type ExercisePickerSheetProps = SingleProps | MultiProps

/** Pick one exercise (or several, in multi mode) from the library, or create a custom one on the spot. */
export function ExercisePickerSheet(props: ExercisePickerSheetProps) {
  const { open, title, onClose, disabledIds } = props
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    if (!open) {
      setCreating(false)
      setSelected([])
    }
  }, [open])

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const footer = creating ? undefined : props.multiple ? (
    <div className="flex flex-col gap-2">
      <Button block disabled={selected.length === 0} onClick={() => props.onPickMany(selected)}>
        {selected.length === 0 ? 'Select exercises' : `Add ${selected.length} ${selected.length === 1 ? 'exercise' : 'exercises'}`}
      </Button>
      <Button variant="ghost" size="sm" block icon={<Plus size={16} aria-hidden="true" />} onClick={() => setCreating(true)}>
        Create custom exercise
      </Button>
    </div>
  ) : (
    <Button variant="surface" block icon={<Plus size={18} aria-hidden="true" />} onClick={() => setCreating(true)}>
      Create custom exercise
    </Button>
  )

  return (
    <BottomSheet open={open} onClose={onClose} title={creating ? 'New exercise' : title} footer={footer}>
      {creating ? (
        <ExerciseForm
          submitLabel={props.multiple ? 'Create & select' : 'Create & add'}
          onCancel={() => setCreating(false)}
          onSubmit={async (input) => {
            const id = await addCustomExercise(input)
            if (props.multiple) {
              setSelected((s) => [...s, id])
              setCreating(false)
            } else {
              props.onPick(id)
            }
          }}
        />
      ) : props.multiple ? (
        <ExerciseList selectedIds={selected} onToggle={(ex) => toggle(ex.id)} disabledIds={disabledIds} />
      ) : (
        <ExerciseList onSelect={(ex) => props.onPick(ex.id)} disabledIds={disabledIds} />
      )}
    </BottomSheet>
  )
}
