import { Copy, Plus } from 'lucide-react'
import { ButtonLink, IconButton } from '../../components/Button'
import { Chip } from '../../components/Chip'
import type { FoodLog, ISODate, Meal } from '../../db/types'
import { MEAL_LABEL } from '../../lib/calc/nutrition'
import { SwipeRow } from './SwipeRow'

export interface MealCardProps {
  meal: Meal
  date: ISODate
  logs: FoodLog[]
  /** Entries in the same meal the day before (for "copy yesterday's"). */
  previousCount: number
  onEdit: (l: FoodLog) => void
  onDelete: (l: FoodLog) => void
  onCopyPrevious: () => void
}

export function MealCard({ meal, date, logs, previousCount, onEdit, onDelete, onCopyPrevious }: MealCardProps) {
  const label = MEAL_LABEL[meal]
  const kcal = Math.round(logs.reduce((s, l) => s + l.macros.kcal, 0))
  const addHref = `/eat/add?meal=${meal}&d=${date}`
  const headingId = `meal-${meal}`

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-2 flex items-center gap-2">
        <h2 id={headingId} className="h-display flex-1 text-[24px]">
          {label}
        </h2>
        {logs.length > 0 && <span className="num text-[14px] font-extrabold text-muted">{kcal} kcal</span>}
        {logs.length > 0 && previousCount > 0 && (
          <IconButton label={`Copy the previous day’s ${label.toLowerCase()}`} variant="ghost" onClick={onCopyPrevious}>
            <Copy size={18} aria-hidden="true" />
          </IconButton>
        )}
        <ButtonLink to={addHref} variant="surface" size="sm" className="w-11 px-0" aria-label={`Add food to ${label}`}>
          <Plus size={20} aria-hidden="true" />
        </ButtonLink>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-border px-4 py-5 text-center">
          <p className="text-[14px] font-semibold text-muted">Nothing logged for {label.toLowerCase()}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <ButtonLink to={addHref} variant="surface" size="sm" icon={<Plus size={16} aria-hidden="true" />}>
              Add food
            </ButtonLink>
            {previousCount > 0 && (
              <button
                type="button"
                onClick={onCopyPrevious}
                className="inline-flex h-11 items-center gap-2 rounded-btn-sm px-4 text-[14px] font-bold text-accent active:bg-surface-2"
              >
                <Copy size={16} aria-hidden="true" />
                Copy previous day ({previousCount})
              </button>
            )}
          </div>
        </div>
      ) : (
        <ul className="card divide-y divide-divider overflow-hidden">
          {logs.map((l) => (
            <li key={l.id}>
              <SwipeRow
                label={`${l.name}, ${l.portionLabel}, ${Math.round(l.macros.kcal)} kcal${l.aiScan ? ', from AI scan' : ''}. Edit`}
                onEdit={() => onEdit(l)}
                onDelete={() => onDelete(l)}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-bold">{l.name}</span>
                    {l.aiScan && (
                      <Chip tone="accent" className="h-5 shrink-0 px-1.5 text-[10px]">
                        AI
                      </Chip>
                    )}
                  </span>
                  <span className="num block truncate text-[13px] font-semibold text-muted">
                    {l.portionLabel}
                    {l.grams > 0 && l.serving?.label !== 'g' ? ` · ${Math.round(l.grams)} g` : ''}
                  </span>
                </span>
                <span className="num shrink-0 text-[15px] font-extrabold">{Math.round(l.macros.kcal)}</span>
              </SwipeRow>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
