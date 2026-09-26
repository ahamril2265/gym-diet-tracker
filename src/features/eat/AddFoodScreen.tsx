import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronLeft, ChevronRight, Plus, Search, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { BottomSheet } from '../../components/BottomSheet'
import { Button, IconButton } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { Skeleton } from '../../components/Skeleton'
import { db } from '../../db/db'
import { addLog, recentFoods } from '../../db/food'
import type { Food, Meal } from '../../db/types'
import { parseMeal, useSelectedDate } from '../../hooks/useFoodData'
import { MEAL_LABEL, mealForTime, scaleMacros } from '../../lib/calc/nutrition'
import { toISODate } from '../../lib/date'
import { searchFoods } from '../../lib/foodSearch'
import { FoodEditorSheet } from './FoodEditorSheet'
import { PortionPicker, SOURCE_BADGE } from './PortionPicker'
import { QuickAddForm } from './QuickAddForm'

export default function AddFoodScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [date] = useSelectedDate()
  const [meal, setMeal] = useState<Meal>(() => parseMeal(params.get('meal')) ?? mealForTime())
  const foods = useLiveQuery(() => db.foods.orderBy('name').toArray())
  const recents = useLiveQuery(() => recentFoods(10))
  const [query, setQuery] = useState('')
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [editor, setEditor] = useState<{ food: Food | null; name: string; thenPick: boolean } | null>(null)
  const [quickAdd, setQuickAdd] = useState(false)
  const [added, setAdded] = useState<string[]>([])

  const results = useMemo(() => (foods && query.trim() ? searchFoods(foods, query) : []), [foods, query])
  const picked = pickedId ? (foods?.find((f) => f.id === pickedId) ?? null) : null
  const back = () => navigate(date === toISODate() ? '/eat' : `/eat?d=${date}`)

  const recordAdded = (label: string, m: Meal) => {
    setAdded((a) => [...a, label])
    setMeal(m)
    setQuery('')
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="pt-safe sticky top-0 z-20 border-b border-divider bg-bg">
        <div className="flex h-14 items-center gap-2 px-2">
          <IconButton label="Back to food log" variant="ghost" onClick={back}>
            <ChevronLeft size={24} aria-hidden="true" />
          </IconButton>
          <h1 className="h-display min-w-0 flex-1 truncate text-[24px]">Add to {MEAL_LABEL[meal]}</h1>
          {added.length > 0 && (
            <Button size="sm" className="mr-2" onClick={back} icon={<Check size={16} aria-hidden="true" />}>
              Done
            </Button>
          )}
        </div>
        <div className="px-4 pb-3">
          <label className="relative block">
            <span className="sr-only">Search foods</span>
            <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
            <input
              type="search"
              className="input pl-11"
              placeholder="Search roti, dal, paneer…"
              autoFocus
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-5 px-4 pb-10 pt-4">
        {added.length > 0 && (
          <p role="status" className="flex items-start gap-2 rounded-card-sm bg-surface p-3 text-[14px] font-semibold">
            <Check size={18} className="mt-px shrink-0 text-accent" aria-hidden="true" />
            <span>
              Added {added.length} to {MEAL_LABEL[meal]}: <span className="text-muted">{added.join(', ')}</span>
            </span>
          </p>
        )}

        {!foods || !recents ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[60px] w-full" />
            ))}
          </div>
        ) : query.trim() ? (
          results.length > 0 ? (
            <FoodList title={`${results.length} ${results.length === 1 ? 'match' : 'matches'}`} foods={results} onPick={(f) => setPickedId(f.id)} />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-border p-6 text-center">
              <p className="text-[15px] text-muted">No food matches “{query.trim()}”.</p>
              <Button
                variant="surface"
                icon={<Plus size={18} aria-hidden="true" />}
                onClick={() => setEditor({ food: null, name: query.trim(), thenPick: true })}
              >
                Create “{query.trim()}”
              </Button>
            </div>
          )
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="surface" icon={<Plus size={18} aria-hidden="true" />} onClick={() => setEditor({ food: null, name: '', thenPick: true })}>
                New food
              </Button>
              <Button variant="surface" icon={<Zap size={18} aria-hidden="true" />} onClick={() => setQuickAdd(true)}>
                Quick add
              </Button>
            </div>
            {recents.length > 0 && <FoodList title="Recent" foods={recents} onPick={(f) => setPickedId(f.id)} />}
            <FoodList title={`All foods (${foods.length})`} foods={foods} onPick={(f) => setPickedId(f.id)} />
          </>
        )}
      </main>

      <BottomSheet open={picked !== null} onClose={() => setPickedId(null)} title={`Add to ${MEAL_LABEL[meal]}`}>
        {picked && (
          <PortionPicker
            key={picked.id + picked.updatedAt}
            food={picked}
            meal={meal}
            submitLabel={(m) => `Add to ${MEAL_LABEL[m]}`}
            onEditFood={() => {
              setEditor({ food: picked, name: picked.name, thenPick: true })
              setPickedId(null)
            }}
            onSubmit={async (r) => {
              await addLog({
                date,
                meal: r.meal,
                foodId: picked.id,
                name: picked.name,
                portionLabel: r.portionLabel,
                grams: r.grams,
                macros: r.macros,
                serving: r.serving,
              })
              recordAdded(`${r.portionLabel} ${picked.name}`, r.meal)
              setPickedId(null)
            }}
          />
        )}
      </BottomSheet>

      <FoodEditorSheet
        open={editor !== null}
        food={editor?.food ?? null}
        initialName={editor?.name}
        onClose={() => setEditor(null)}
        onSaved={(id) => {
          const pick = editor?.thenPick
          setEditor(null)
          if (pick) setPickedId(id)
        }}
      />

      <BottomSheet open={quickAdd} onClose={() => setQuickAdd(false)} title="Quick add">
        <QuickAddForm
          meal={meal}
          submitLabel="Add"
          onSubmit={async (v) => {
            await addLog({ date, meal: v.meal, foodId: null, name: v.name, portionLabel: 'Quick add', grams: 0, macros: v.macros })
            recordAdded(`${v.name} (${v.macros.kcal} kcal)`, v.meal)
            setQuickAdd(false)
          }}
        />
      </BottomSheet>
    </div>
  )
}

function FoodList({ title, foods, onPick }: { title: string; foods: Food[]; onPick: (f: Food) => void }) {
  const id = `list-${title.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-muted">
        {title}
      </h2>
      <ul className="card divide-y divide-divider overflow-hidden">
        {foods.map((f) => {
          const s = f.servings[0]
          const hint = s ? `1 ${s.label} · ${scaleMacros(f.per100g, s.grams).kcal} kcal` : `100 g · ${Math.round(f.per100g.kcal)} kcal`
          const badge = SOURCE_BADGE[f.source]
          return (
            <li key={f.id}>
              <button type="button" onClick={() => onPick(f)} className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-left active:bg-surface-2">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-bold">{f.name}</span>
                    {badge && (
                      <Chip tone="accent" className="h-5 shrink-0 px-1.5 text-[10px]">
                        {badge}
                      </Chip>
                    )}
                  </span>
                  <span className="num block truncate text-[13px] font-semibold text-muted">
                    {f.brand ? `${f.brand} · ` : ''}
                    {hint}
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-faint" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
