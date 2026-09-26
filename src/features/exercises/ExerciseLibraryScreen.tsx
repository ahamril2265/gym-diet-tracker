import { ChevronLeft, Plus, Trash } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { BottomSheet } from '../../components/BottomSheet'
import { Button, IconButton } from '../../components/Button'
import { addCustomExercise, deleteCustomExercise, updateCustomExercise } from '../../db/exercises'
import type { Exercise } from '../../db/types'
import { ExerciseForm } from './ExerciseForm'
import { ExerciseList } from './ExerciseList'

export default function ExerciseLibraryScreen() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  return (
    <div className="-mx-4 flex flex-col">
      <header className="flex items-center gap-2 px-2">
        <IconButton label="Back to Train" variant="ghost" onClick={() => navigate('/train')}>
          <ChevronLeft size={24} aria-hidden="true" />
        </IconButton>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Train</p>
          <h1 className="h-display truncate text-[34px]">Exercises</h1>
        </div>
        <Button size="sm" icon={<Plus size={18} aria-hidden="true" />} onClick={() => setCreating(true)} className="mr-2">
          New
        </Button>
      </header>
      <p className="px-4 pt-2 text-[13px] text-faint">Tap a custom exercise to edit it.</p>

      <div className="mt-1 rounded-card bg-surface">
        <ExerciseList
          onSelect={(ex) => {
            setDeleteError(null)
            setEditing(ex)
          }}
          canSelect={(ex) => ex.custom}
        />
      </div>

      <BottomSheet open={creating} onClose={() => setCreating(false)} title="New exercise">
        <ExerciseForm
          submitLabel="Create exercise"
          onCancel={() => setCreating(false)}
          onSubmit={async (input) => {
            await addCustomExercise(input)
            setCreating(false)
          }}
        />
      </BottomSheet>

      <BottomSheet open={editing !== null} onClose={() => setEditing(null)} title="Edit exercise">
        {editing && (
          <>
            <ExerciseForm
              initial={editing}
              editingId={editing.id}
              submitLabel="Save"
              onCancel={() => setEditing(null)}
              onSubmit={async (input) => {
                await updateCustomExercise(editing.id, input)
                setEditing(null)
              }}
            />
            <div className="border-t border-divider p-4">
              {deleteError && (
                <p role="alert" className="mb-3 text-[13px] font-semibold text-danger">
                  {deleteError}
                </p>
              )}
              <Button
                variant="danger"
                block
                icon={<Trash size={18} aria-hidden="true" />}
                onClick={async () => {
                  if (!window.confirm(`Delete "${editing.name}"?`)) return
                  const ok = await deleteCustomExercise(editing.id)
                  if (ok) setEditing(null)
                  else setDeleteError('This exercise has logged sets, so it can’t be deleted (your history needs it).')
                }}
              >
                Delete exercise
              </Button>
            </div>
          </>
        )}
      </BottomSheet>
    </div>
  )
}
