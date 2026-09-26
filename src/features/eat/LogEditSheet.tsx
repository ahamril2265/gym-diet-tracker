import { useLiveQuery } from 'dexie-react-hooks'
import { Trash } from 'lucide-react'
import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { db } from '../../db/db'
import { updateLog } from '../../db/food'
import type { FoodLog } from '../../db/types'
import { MEAL_LABEL, per100FromPortion } from '../../lib/calc/nutrition'
import { PortionPicker, type PortionFood } from './PortionPicker'
import { QuickAddForm } from './QuickAddForm'

export const isQuickAdd = (l: FoodLog) => l.foodId === null && l.grams === 0

/** Edit an entry's portion or meal (or its numbers, for quick adds), or delete it. */
export function LogEditSheet({ log, onClose, onDelete }: { log: FoodLog | null; onClose: () => void; onDelete: (l: FoodLog) => void }) {
  const food = useLiveQuery(async () => (log?.foodId ? ((await db.foods.get(log.foodId)) ?? null) : null), [log?.foodId])

  const deleteButton = log && (
    <Button
      variant="danger"
      block
      icon={<Trash size={18} aria-hidden="true" />}
      onClick={() => {
        onDelete(log)
        onClose()
      }}
    >
      Delete entry
    </Button>
  )

  let body = null
  if (log && food !== undefined) {
    if (isQuickAdd(log)) {
      body = (
        <QuickAddForm
          initial={{ name: log.name, macros: log.macros }}
          meal={log.meal}
          submitLabel="Save"
          onSubmit={async (v) => {
            await updateLog(log.id, { name: v.name, macros: v.macros, meal: v.meal })
            onClose()
          }}
        >
          {deleteButton}
        </QuickAddForm>
      )
    } else {
      // Use the food record if it still exists; otherwise rebuild per-100 g values from the entry itself.
      const portionFood: PortionFood = food ?? {
        name: log.name,
        per100g: per100FromPortion(log.macros, log.grams),
        servings: log.serving && log.serving.label !== 'g' ? [{ label: log.serving.label, grams: log.serving.grams }] : [],
        source: log.aiScan ? 'ai' : undefined,
      }
      body = (
        <PortionPicker
          key={log.id}
          food={portionFood}
          initial={log.serving ?? { label: 'g', grams: 1, qty: log.grams }}
          meal={log.meal}
          submitLabel={(m) => (m === log.meal ? 'Save' : `Move to ${MEAL_LABEL[m]}`)}
          onSubmit={async (r) => {
            await updateLog(log.id, {
              meal: r.meal,
              grams: r.grams,
              macros: r.macros,
              portionLabel: r.portionLabel,
              serving: r.serving,
            })
            onClose()
          }}
        >
          {deleteButton}
        </PortionPicker>
      )
    }
  }

  return (
    <BottomSheet open={log !== null} onClose={onClose} title={log ? log.name : ''}>
      {body}
    </BottomSheet>
  )
}
