import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, ScanBarcode, Search } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { MacroBar } from '../../components/MacroBar'
import { ScreenHeader } from '../../components/ScreenHeader'
import { ScreenSkeleton } from '../../components/Skeleton'
import { Toast } from '../../components/Toast'
import { db } from '../../db/db'
import { copyMeal, deleteLog, restoreLog } from '../../db/food'
import type { FoodLog, Meal } from '../../db/types'
import { useTargets } from '../../hooks/useAppData'
import { useDayLogs, useSelectedDate } from '../../hooks/useFoodData'
import { MEAL_LABEL, MEALS, mealForTime, sumMacros } from '../../lib/calc/nutrition'
import { addDays, toISODate } from '../../lib/date'
import { LogEditSheet } from './LogEditSheet'
import { MealCard } from './MealCard'
import { DateStrip } from './DateStrip'

export default function EatScreen() {
  const [date, setDate] = useSelectedDate()
  const targets = useTargets()
  const logs = useDayLogs(date)
  const prevDay = addDays(date, -1)
  const prevCounts = useLiveQuery(async () => {
    const prev = await db.foodLogs.where('date').equals(prevDay).toArray()
    return Object.fromEntries(MEALS.map((m) => [m, prev.filter((l) => l.meal === m).length])) as Record<Meal, number>
  }, [prevDay])
  const [editing, setEditing] = useState<FoodLog | null>(null)
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null)
  const dismiss = useCallback(() => setToast(null), [])

  if (!targets || !logs || !prevCounts) return <ScreenSkeleton />

  const t = targets.targets
  const total = sumMacros(logs.map((l) => l.macros))
  const isToday = date === toISODate()
  const meal = isToday ? mealForTime() : 'lunch'
  const query = `meal=${meal}&d=${date}`

  const remove = async (l: FoodLog) => {
    const removed = await deleteLog(l.id)
    if (removed) setToast({ message: `Deleted ${removed.name}`, undo: () => void restoreLog(removed) })
  }

  const copy = async (m: Meal) => {
    const n = await copyMeal(prevDay, date, m)
    setToast({ message: `Copied ${n} ${n === 1 ? 'item' : 'items'} to ${MEAL_LABEL[m]}` })
  }

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        eyebrow="Food log"
        title="Eat"
        right={
          <>
            <Link
              to={`/scan/barcode?${query}`}
              aria-label="Scan a barcode"
              className="flex h-11 w-11 items-center justify-center rounded-btn-sm border border-border bg-surface-2 active:bg-border"
            >
              <ScanBarcode size={20} aria-hidden="true" />
            </Link>
            <Link
              to={`/eat/add?${query}`}
              aria-label="Search foods"
              className="flex h-11 w-11 items-center justify-center rounded-btn-sm border border-border bg-surface-2 active:bg-border"
            >
              <Search size={20} aria-hidden="true" />
            </Link>
          </>
        }
      />

      <DateStrip selected={date} onSelect={setDate} targetKcal={t.kcal} />

      <section className="card p-4" aria-label="Day totals">
        <p className="flex items-baseline gap-2">
          <span className="h-display num text-[40px] leading-none">{total.kcal.toLocaleString('en-IN')}</span>
          <span className="num text-[15px] font-bold text-muted">/ {t.kcal.toLocaleString('en-IN')} kcal</span>
          <span className="num ml-auto text-[13px] font-bold text-faint">
            {total.kcal <= t.kcal ? `${(t.kcal - total.kcal).toLocaleString('en-IN')} left` : `${(total.kcal - t.kcal).toLocaleString('en-IN')} over`}
          </span>
        </p>
        <div className="mt-3 flex flex-col gap-2.5">
          <MacroBar macro="protein" eaten={total.protein} target={t.protein} />
          <MacroBar macro="carbs" eaten={total.carbs} target={t.carbs} />
          <MacroBar macro="fat" eaten={total.fat} target={t.fat} />
        </div>
      </section>

      {MEALS.map((m) => (
        <MealCard
          key={m}
          meal={m}
          date={date}
          logs={logs.filter((l) => l.meal === m)}
          previousCount={prevCounts[m]}
          onEdit={setEditing}
          onDelete={(l) => void remove(l)}
          onCopyPrevious={() => void copy(m)}
        />
      ))}

      <Link
        to={`/scan/meal?${query}`}
        aria-label="Scan a meal with the camera"
        className="fixed bottom-[calc(84px+env(safe-area-inset-bottom)+16px)] right-[max(16px,calc(50%-215px+16px))] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg shadow-black/50 active:brightness-95"
      >
        <Camera size={24} aria-hidden="true" />
      </Link>

      <LogEditSheet log={editing} onClose={() => setEditing(null)} onDelete={(l) => void remove(l)} />
      <Toast message={toast?.message ?? null} actionLabel={toast?.undo ? 'Undo' : undefined} onAction={toast?.undo} onDismiss={dismiss} />
    </div>
  )
}
