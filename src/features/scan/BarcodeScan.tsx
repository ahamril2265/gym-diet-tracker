import { Camera, Images, Keyboard, KeyRound, PackageSearch, Pencil, RotateCcw, ScanBarcode, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Button, ButtonLink } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { cx } from '../../components/cx'
import { Field } from '../../components/Field'
import { Segmented } from '../../components/Segmented'
import { db } from '../../db/db'
import { addLog, cacheOffFood, customFoodByBarcode, foodByBarcode } from '../../db/food'
import type { Food, Meal } from '../../db/types'
import { useCamera } from '../../hooks/useCamera'
import { useOnline } from '../../hooks/useOnline'
import { LOW_CONFIDENCE } from '../../lib/ai/config'
import { AiError } from '../../lib/ai/errors'
import { normalizeBarcode } from '../../lib/barcode'
import { MEAL_LABEL, MEALS, scaleMacros } from '../../lib/calc/nutrition'
import { haptic } from '../../lib/feedback'
import { captureVideoFrame, compressImage } from '../../lib/image'
import { lookupBarcode, OffError, offProductToFood } from '../../lib/off'
import { startScanner } from '../../lib/scanner'
import { FoodEditorSheet, type FoodPrefill } from '../eat/FoodEditorSheet'
import type { ScanProps } from './MealScan'
import { CameraView, PhotoPicker, ScanFrame, ScanPanel, ScanTopBar, Shutter } from './ScanChrome'

type Phase =
  | { kind: 'scanning' }
  | { kind: 'looking-up'; code: string }
  | { kind: 'found'; code: string; food: Food }
  | { kind: 'not-found'; code: string; base: FoodPrefill; reason: 'missing' | 'no-nutrition' }
  | { kind: 'error'; code?: string; message: string }
  | { kind: 'label'; code: string; base: FoodPrefill }
  | { kind: 'reading-label'; code: string; base: FoodPrefill }
  | { kind: 'review'; code: string; prefill: FoodPrefill; note: string; existing: Food | null }
  | { kind: 'manual'; code: string; base: FoodPrefill; existing: Food | null }

export function BarcodeScan({ meal, date, apiKey, onClose, onSwitch, onDone }: ScanProps) {
  const [phase, setPhase] = useState<Phase>({ kind: 'scanning' })
  const [typing, setTyping] = useState(false)
  const cameraOn = phase.kind === 'scanning' || phase.kind === 'label'
  const camera = useCamera(cameraOn)
  const online = useOnline()
  const abort = useRef<AbortController | null>(null)

  useEffect(() => () => abort.current?.abort(), [])

  const lookup = useCallback(
    async (code: string) => {
      setPhase({ kind: 'looking-up', code })
      const local = await foodByBarcode(code)
      if (local) return setPhase({ kind: 'found', code, food: local })
      if (!navigator.onLine) {
        return setPhase({ kind: 'error', code, message: 'You’re offline and this product isn’t saved on your phone yet. Enter it manually or try again when online.' })
      }
      try {
        const product = await lookupBarcode(code)
        const asFood = offProductToFood(product)
        if (!asFood) {
          return setPhase({
            kind: 'not-found',
            code,
            reason: 'no-nutrition',
            base: { barcode: code, name: product.name, brand: product.brand, imageUrl: product.imageUrl, packQuantity: product.packQuantity, servings: product.serving ? [product.serving] : [] },
          })
        }
        setPhase({ kind: 'found', code, food: await cacheOffFood(asFood) })
      } catch (e) {
        if (e instanceof OffError && e.kind === 'not-found') {
          setPhase({ kind: 'not-found', code, reason: 'missing', base: { barcode: code } })
        } else {
          setPhase({ kind: 'error', code, message: (e as Error).message })
        }
      }
    },
    [],
  )

  // Scan continuously while the camera is live in scanning mode.
  useEffect(() => {
    if (phase.kind !== 'scanning' || camera.status !== 'ready' || !camera.videoRef.current) return
    let scanner: { stop(): void } | null = null
    let cancelled = false
    void startScanner(camera.videoRef.current, (code) => {
      haptic()
      void lookup(code)
    })
      .then((s) => {
        if (cancelled) s.stop()
        else scanner = s
      })
      .catch(() => {
        if (!cancelled) setPhase({ kind: 'error', message: 'Barcode scanning isn’t available in this browser. Type the barcode instead.' })
      })
    return () => {
      cancelled = true
      scanner?.stop()
    }
  }, [phase.kind, camera.status, camera.videoRef, lookup])

  async function readLabel(blob: Blob, code: string, base: FoodPrefill) {
    setPhase({ kind: 'reading-label', code, base })
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    try {
      const { readNutritionLabel } = await import('../../lib/ai/gemini')
      const r = await readNutritionLabel(apiKey, blob, ctrl.signal)
      if (ctrl.signal.aborted) return
      haptic()
      setPhase({
        kind: 'review',
        code,
        existing: (await customFoodByBarcode(code)) ?? null,
        note:
          r.confidence < LOW_CONFIDENCE
            ? 'Read by AI with low confidence — check every number against the label.'
            : 'Read by AI — check the numbers against the label before saving.',
        prefill: {
          ...base,
          barcode: code,
          name: r.productName || base.name || `Product ${code}`,
          per100g: r.per100g,
          servings: r.servingSize ? [r.servingSize] : (base.servings ?? []),
        },
      })
    } catch (e) {
      if (ctrl.signal.aborted) return
      const err = e instanceof AiError ? e : new AiError('bad-response')
      if (err.kind !== 'cancelled') setPhase({ kind: 'error', code, message: err.message })
    }
  }

  const startLabel = (code: string, base: FoodPrefill) => setPhase({ kind: 'label', code, base })
  const startManual = async (code: string, base: FoodPrefill) =>
    setPhase({ kind: 'manual', code, base: { ...base, barcode: code }, existing: (await customFoodByBarcode(code)) ?? null })

  const afterSave = async (id: string, code: string) => {
    const food = await db.foods.get(id)
    setPhase(food ? { kind: 'found', code, food } : { kind: 'scanning' })
  }

  return (
    <div className="fixed inset-0 z-40 mx-auto max-w-app overflow-hidden bg-black text-fg">
      <CameraView videoRef={camera.videoRef} status={camera.status} error={camera.error} hidden={!cameraOn}>
        {phase.kind === 'scanning' ? (
          <Button onClick={() => setTyping(true)} icon={<Keyboard size={18} aria-hidden="true" />}>
            Type the barcode
          </Button>
        ) : phase.kind === 'label' ? (
          <PhotoPicker
            onFile={(f) => void compressImage(f).then((b) => readLabel(b, phase.code, phase.base))}
            className="inline-flex h-12 items-center gap-2 rounded-btn bg-accent px-5 font-bold text-on-accent"
          >
            <Images size={18} aria-hidden="true" /> Pick a photo of the label
          </PhotoPicker>
        ) : null}
      </CameraView>

      <ScanTopBar
        mode="barcode"
        onSwitch={onSwitch}
        onClose={onClose}
        torch={cameraOn ? { supported: camera.torchSupported, on: camera.torchOn, toggle: () => void camera.toggleTorch() } : undefined}
      />

      {phase.kind === 'scanning' && camera.status === 'ready' && (
        <>
          <ScanFrame label="Point at the barcode" />
          <div className="pb-safe absolute inset-x-0 bottom-0 z-20 flex justify-center pb-8">
            <Button variant="surface" onClick={() => setTyping(true)} icon={<Keyboard size={18} aria-hidden="true" />}>
              Type barcode
            </Button>
          </div>
        </>
      )}

      {phase.kind === 'label' && camera.status === 'ready' && (
        <>
          <ScanFrame aspect="label" label="Fit the nutrition table inside the frame" />
          <div className="pb-safe absolute inset-x-0 bottom-0 z-20 mb-6 flex items-center justify-around px-6">
            <PhotoPicker
              onFile={(f) => void compressImage(f).then((b) => readLabel(b, phase.code, phase.base))}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <Images size={22} aria-hidden="true" />
              <span className="sr-only">Pick a photo of the label</span>
            </PhotoPicker>
            <Shutter
              label="Photograph the nutrition label"
              onClick={() => {
                const v = camera.videoRef.current
                if (v) void captureVideoFrame(v).then((b) => readLabel(b, phase.code, phase.base))
              }}
            />
            <button
              type="button"
              onClick={() => setPhase({ kind: 'not-found', code: phase.code, base: phase.base, reason: 'missing' })}
              className="h-12 rounded-full bg-black/60 px-4 text-[14px] font-bold text-white"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {phase.kind === 'looking-up' && (
        <ScanPanel labelledBy="lookup-h">
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <h2 id="lookup-h" className="h-display animate-shimmer text-[26px]">
              Looking up…
            </h2>
            <p className="num text-[14px] text-muted">Barcode {phase.code}</p>
          </div>
        </ScanPanel>
      )}

      {phase.kind === 'reading-label' && (
        <ScanPanel labelledBy="reading-h">
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <h2 id="reading-h" className="h-display animate-shimmer text-[26px]">
              Reading the label…
            </h2>
            <p className="text-[14px] text-muted">Extracting per-100 g values and the serving size.</p>
            <Button variant="surface" onClick={() => startLabel(phase.code, phase.base)}>
              Cancel
            </Button>
          </div>
        </ScanPanel>
      )}

      {phase.kind === 'found' && (
        <ProductPanel
          food={phase.food}
          meal={meal}
          onScanAgain={() => setPhase({ kind: 'scanning' })}
          onWrongData={() => startLabel(phase.code, { barcode: phase.code, name: phase.food.name, brand: phase.food.brand, imageUrl: phase.food.imageUrl, packQuantity: phase.food.packQuantity, servings: phase.food.servings })}
          onAdd={async (log) => {
            await addLog({ ...log, date, foodId: phase.food.id, name: phase.food.name })
            onDone(`Added ${phase.food.name} to ${MEAL_LABEL[log.meal]}`)
          }}
        />
      )}

      {phase.kind === 'not-found' && (
        <ScanPanel labelledBy="nf-h">
          <div className="flex flex-col gap-3 p-5">
            <h2 id="nf-h" className="h-display flex items-center gap-2 text-[26px]">
              <PackageSearch size={24} className="text-flame" aria-hidden="true" />
              {phase.reason === 'missing' ? 'Product not found' : 'No nutrition info'}
            </h2>
            <p className="text-[15px] text-muted">
              {phase.reason === 'missing'
                ? 'This barcode isn’t on Open Food Facts yet.'
                : `${phase.base.name ?? 'This product'} is on Open Food Facts but without a nutrition table.`}{' '}
              Snap the nutrition label and we’ll save it for next time.
            </p>
            <p className="num text-[13px] font-bold text-faint">Barcode {phase.code}</p>
            {apiKey ? (
              <Button block icon={<Camera size={18} aria-hidden="true" />} onClick={() => startLabel(phase.code, phase.base)}>
                Snap the nutrition label
              </Button>
            ) : (
              <ButtonLink to="/me#ai" block icon={<KeyRound size={18} aria-hidden="true" />}>
                Add Gemini key to read labels
              </ButtonLink>
            )}
            <Button variant="surface" block icon={<Pencil size={18} aria-hidden="true" />} onClick={() => void startManual(phase.code, phase.base)}>
              Enter it manually
            </Button>
            <Button variant="ghost" block icon={<RotateCcw size={18} aria-hidden="true" />} onClick={() => setPhase({ kind: 'scanning' })}>
              Scan again
            </Button>
          </div>
        </ScanPanel>
      )}

      {phase.kind === 'error' && (
        <ScanPanel labelledBy="berr-h">
          <div className="flex flex-col gap-3 p-5">
            <h2 id="berr-h" className="h-display flex items-center gap-2 text-[26px]">
              <TriangleAlert size={22} className="text-flame" aria-hidden="true" /> Something went wrong
            </h2>
            <p role="alert" className="text-[15px] text-muted">
              {phase.message}
            </p>
            {phase.code && (
              <Button variant="surface" block icon={<Pencil size={18} aria-hidden="true" />} onClick={() => void startManual(phase.code!, { barcode: phase.code })}>
                Enter it manually
              </Button>
            )}
            <Button block icon={<ScanBarcode size={18} aria-hidden="true" />} onClick={() => setPhase({ kind: 'scanning' })}>
              Scan again
            </Button>
          </div>
        </ScanPanel>
      )}

      {!online && phase.kind === 'scanning' && (
        <p className="absolute inset-x-4 top-[calc(env(safe-area-inset-top)+68px)] z-20 rounded-btn bg-black/70 px-3 py-2 text-center text-[13px] font-semibold text-white">
          Offline — only products saved on this phone can be found.
        </p>
      )}

      <FoodEditorSheet
        open={phase.kind === 'review' || phase.kind === 'manual'}
        food={phase.kind === 'review' || phase.kind === 'manual' ? phase.existing : null}
        initial={phase.kind === 'review' ? phase.prefill : phase.kind === 'manual' ? phase.base : undefined}
        note={phase.kind === 'review' ? phase.note : undefined}
        title={phase.kind === 'review' ? 'Check label values' : 'Product details'}
        onClose={() => {
          // Cancelling the editor goes back to the "not found" choices for this barcode.
          if (phase.kind === 'review') setPhase({ kind: 'not-found', code: phase.code, base: phase.prefill, reason: 'missing' })
          else if (phase.kind === 'manual') setPhase({ kind: 'not-found', code: phase.code, base: phase.base, reason: 'missing' })
        }}
        onSaved={(id) => {
          if (phase.kind === 'review' || phase.kind === 'manual') void afterSave(id, phase.code)
        }}
      />

      <TypeBarcodeSheet
        open={typing}
        onClose={() => setTyping(false)}
        onCode={(code) => {
          setTyping(false)
          void lookup(code)
        }}
      />
    </div>
  )
}

interface LogPortion {
  meal: Meal
  grams: number
  macros: ReturnType<typeof scaleMacros>
  portionLabel: string
  serving: { label: string; grams: number; qty: number }
}

type ChipKey = 'serving' | 'double' | '100g' | 'custom'

/** Product sheet: pack photo, name, source tag, serving chips, macros, meal, add. */
function ProductPanel({
  food,
  meal: initialMeal,
  onScanAgain,
  onWrongData,
  onAdd,
}: {
  food: Food
  meal: Meal
  onScanAgain: () => void
  onWrongData: () => void
  onAdd: (log: LogPortion) => Promise<void>
}) {
  const serving = food.servings[0]
  const [chip, setChip] = useState<ChipKey>(serving ? 'serving' : '100g')
  const [custom, setCustom] = useState(serving ? String(serving.grams) : '100')
  const [meal, setMeal] = useState<Meal>(initialMeal)
  const [busy, setBusy] = useState(false)

  const customGrams = Number(custom.replace(',', '.'))
  const grams =
    chip === 'serving' && serving ? serving.grams : chip === 'double' && serving ? serving.grams * 2 : chip === '100g' ? 100 : customGrams
  const valid = Number.isFinite(grams) && grams > 0 && grams <= 5000
  const macros = scaleMacros(food.per100g, valid ? grams : 0)
  const p = food.per100g

  const chips: { key: ChipKey; label: string }[] = [
    ...(serving
      ? [
          { key: 'serving' as const, label: `1 ${serving.label} · ${serving.grams} g` },
          { key: 'double' as const, label: `2× · ${serving.grams * 2} g` },
        ]
      : []),
    { key: '100g', label: '100 g' },
    { key: 'custom', label: 'Custom' },
  ]

  const toLog = (): LogPortion => {
    if (chip === 'serving' && serving) return { meal, grams, macros, portionLabel: `1 ${serving.label}`, serving: { ...serving, qty: 1 } }
    if (chip === 'double' && serving) return { meal, grams, macros, portionLabel: `2 ${serving.label}`, serving: { ...serving, qty: 2 } }
    return { meal, grams, macros, portionLabel: `${Math.round(grams)} g`, serving: { label: 'g', grams: 1, qty: grams } }
  }

  const tag = food.source === 'off' ? 'Matched · Open Food Facts' : food.source === 'custom' ? 'Your saved product' : 'Saved food'

  return (
    <ScanPanel labelledBy="prod-h">
      <div className="flex flex-col gap-4 px-4 pb-4 pt-2">
        <div className="flex items-start gap-3">
          {food.imageUrl ? (
            <img src={food.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-btn-sm bg-white object-contain" loading="lazy" />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-btn-sm bg-surface-2 text-faint" aria-hidden="true">
              <ScanBarcode size={26} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id="prod-h" className="text-[18px] font-extrabold leading-tight">
              {food.name}
            </h2>
            <p className="text-[13px] font-semibold text-muted">{[food.brand, food.packQuantity].filter(Boolean).join(' · ')}</p>
            <Chip tone={food.source === 'off' ? 'accent' : 'surface'} className="mt-1.5 h-6 px-2 text-[10px]">
              {tag}
            </Chip>
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-[13px] font-bold text-muted">Serving</legend>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <label
                key={c.key}
                className={cx(
                  'num flex h-11 cursor-pointer items-center rounded-full border px-4 text-[14px] font-bold',
                  'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent',
                  chip === c.key ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface-2 text-fg',
                )}
              >
                <input type="radio" name="serving-chip" className="sr-only" checked={chip === c.key} onChange={() => setChip(c.key)} />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>

        {chip === 'custom' && (
          <Field label="Amount" suffix="g">
            {(fp) => (
              <input
                {...fp}
                className="input num pr-10"
                inputMode="decimal"
                autoFocus
                value={custom}
                aria-invalid={!valid || undefined}
                onChange={(e) => setCustom(e.target.value)}
              />
            )}
          </Field>
        )}

        <div className="rounded-card-sm bg-surface-2 p-4" aria-live="polite">
          <p>
            <span className="h-display num text-[44px] leading-none">{macros.kcal}</span>
            <span className="ml-1.5 text-[13px] font-extrabold uppercase tracking-[0.08em] text-muted">kcal</span>
          </p>
          <p className="num mt-1 text-[14px] font-bold">
            <span className="text-protein">P {macros.protein} g</span> · <span className="text-carbs">C {macros.carbs} g</span> ·{' '}
            <span className="text-fat">F {macros.fat} g</span>
          </p>
          <p className="num mt-1 text-[12px] font-semibold text-faint">
            Per 100 g: {Math.round(p.kcal)} kcal · P {p.protein} · C {p.carbs} · F {p.fat}
          </p>
        </div>

        <Segmented legend="Meal" options={MEALS.map((m) => ({ value: m, label: MEAL_LABEL[m] }))} value={meal} onChange={setMeal} />

        <div className="flex gap-3">
          <Button variant="surface" className="shrink-0 whitespace-nowrap" onClick={onScanAgain} icon={<ScanBarcode size={18} aria-hidden="true" />}>
            Scan again
          </Button>
          <Button
            block
            disabled={!valid || busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onAdd(toLog())
              } finally {
                setBusy(false)
              }
            }}
          >
            Add to {MEAL_LABEL[meal]}
          </Button>
        </div>
        <button type="button" onClick={onWrongData} className="h-11 text-[14px] font-bold text-muted underline underline-offset-4">
          Data wrong? Snap the nutrition label
        </button>
      </div>
    </ScanPanel>
  )
}

function TypeBarcodeSheet({ open, onClose, onCode }: { open: boolean; onClose: () => void; onCode: (code: string) => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (open) {
      setValue('')
      setError(null)
    }
  }, [open])
  return (
    <BottomSheet open={open} onClose={onClose} title="Type barcode">
      <form
        className="flex flex-col gap-4 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          const code = normalizeBarcode(value)
          if (!code) return setError('That doesn’t look like a valid barcode. Check the digits under the bars (8, 12 or 13 digits).')
          onCode(code)
        }}
      >
        <Field label="Barcode number" error={error} hint="The digits printed under the barcode, e.g. 8901058851298">
          {(p) => (
            <input
              {...p}
              className="input num tracking-[0.12em]"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              maxLength={16}
              value={value}
              onChange={(e) => {
                setValue(e.target.value.replace(/[^\d ]/g, ''))
                setError(null)
              }}
            />
          )}
        </Field>
        <Button type="submit" block>
          Look up
        </Button>
      </form>
    </BottomSheet>
  )
}
