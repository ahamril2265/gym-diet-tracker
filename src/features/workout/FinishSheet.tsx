import { Flag, Trash } from 'lucide-react'
import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import type { WorkoutSet } from '../../db/types'

export interface FinishSheetProps {
  open: boolean
  sets: WorkoutSet[]
  onClose: () => void
  onFinish: () => void
  onDiscard: () => void
}

export function FinishSheet({ open, sets, onClose, onFinish, onDiscard }: FinishSheetProps) {
  const ticked = sets.filter((s) => s.done).length
  const unticked = sets.length - ticked
  return (
    <BottomSheet open={open} onClose={onClose} title="Finish workout?">
      <div className="flex flex-col gap-3 p-4">
        {ticked === 0 ? (
          <p className="text-[15px] text-muted">No sets ticked yet. Keep going, or discard this workout.</p>
        ) : (
          <p className="num text-[15px] text-muted">
            <strong className="text-fg">{ticked}</strong> {ticked === 1 ? 'set' : 'sets'} logged.
            {unticked > 0 && ` ${unticked} unticked ${unticked === 1 ? 'set' : 'sets'} will be removed.`}
          </p>
        )}
        {ticked > 0 && (
          <Button block onClick={onFinish} icon={<Flag size={18} aria-hidden="true" />}>
            Finish & save
          </Button>
        )}
        <Button variant="surface" block onClick={onClose}>
          Keep going
        </Button>
        <Button
          variant="danger"
          block
          icon={<Trash size={18} aria-hidden="true" />}
          onClick={() => {
            if (window.confirm('Discard this workout? Nothing from it will be saved.')) onDiscard()
          }}
        >
          Discard workout
        </Button>
      </div>
    </BottomSheet>
  )
}
