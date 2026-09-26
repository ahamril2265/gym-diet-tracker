import { Images, KeyRound, Minus, Plus, RotateCcw, Search, TriangleAlert, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, ButtonLink, IconButton } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { cx } from '../../components/cx'
import { Segmented } from '../../components/Segmented'
import { addLog } from '../../db/food'
import type { ISODate, Meal } from '../../db/types'
import { useCamera } from '../../hooks/useCamera'
import { useOnline } from '../../hooks/useOnline'
import { LOW_CONFIDENCE } from '../../lib/ai/config'
import { AiError } from '../../lib/ai/errors'
import { scaleMealItem, type MealItem } from '../../lib/ai/parse'
import { formatQty, MEAL_LABEL, MEALS, portionLabel, portionStep, stepQuantity, sumMacros } from '../../lib/calc/nutrition'
import { haptic } from '../../lib/feedback'
import { captureVideoFrame, compressImage } from '../../lib/image'
import { CameraView, PHOTO_AREA, PhotoPicker, ScanPanel, ScanTopBar, Shutter, type ScanMode } from './ScanChrome'

type Phase =
  | { kind: 'camera' }
  | { kind: 'analyzing'; photo: string }
  | { kind: 'results'; photo: string; items: MealItem[] }
  | { kind: 'error'; photo?: string; message: string; aiKind?: string }

export interface ScanProps {
  meal: Meal
  date: ISODate
  apiKey: string | null
  onClose: () => void
  onSwitch: (m: ScanMode) => void
  onDone: (toast: string) => void
}

export function MealScan({ meal: initialMeal, date, apiKey, onClose, onSwitch, onDone }: ScanProps) {
  const [phase, setPhase] = useState<Phase>({ kind: 'camera' })
  const camera = useCamera(phase.kind === 'camera')
  const online = useOnline()
  const abort = useRef<AbortController | null>(null)
  const photoUrl = 'photo' in phase ? phase.photo : undefined

  // Free the previous photo's memory when it changes.
  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl)
  }, [photoUrl])
  useEffect(() => () => abort.current?.abort(), [])

  async function analyze(blob: Blob) {
    const photo = URL.createObjectURL(blob)
    setPhase({ kind: 'analyzing', photo })
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    try {
      const { analyzeMealPhoto } = await import('../../lib/ai/gemini')
      const items = await analyzeMealPhoto(apiKey, blob, ctrl.signal)
      if (ctrl.signal.aborted) return
      haptic()
      setPhase({ kind: 'results', photo, items })
    } catch (e) {
      if (ctrl.signal.aborted) return
      const err = e instanceof AiError ? e : new AiError('bad-response')
      if (err.kind === 'cancelled') return
      setPhase({ kind: 'error', photo, message: err.message, aiKind: err.kind })
    }
  }

  const capture = async () => {
    const video = camera.videoRef.current
    if (!video) return
    try {
      await analyze(await captureVideoFrame(video))
    } catch {
      setPhase({ kind: 'error', message: 'Couldn’t take the photo. Try again or pick one from your gallery.' })
    }
  }

  const pick = async (file: File) => {
    try {
      await analyze(await compressImage(file))
    } catch {
      setPhase({ kind: 'error', message: 'That file couldn’t be opened as a photo.' })
    }
  }

  const retake = () => {
    abort.current?.abort()
    setPhase({ kind: 'camera' })
  }

  const blocked = !apiKey ? 'no-key' : !online ? 'offline' : null

  return (
    <div className="fixed inset-0 z-40 mx-auto max-w-app overflow-hidden bg-black text-fg">
      {phase.kind === 'camera' ? (
        <CameraView videoRef={camera.videoRef} status={camera.status} error={camera.error}>
          {!blocked && (
            <PhotoPicker onFile={(f) => void pick(f)} className="inline-flex h-12 items-center gap-2 rounded-btn bg-accent px-5 font-bold text-on-accent">
              <Images size={18} aria-hidden="true" /> Pick a photo
            </PhotoPicker>
          )}
        </CameraView>
      ) : (
        photoUrl && <PhotoWithBoxes photo={photoUrl} items={phase.kind === 'results' ? phase.items : []} dim={phase.kind === 'analyzing'} />
      )}

      <ScanTopBar
        mode="meal"
        onSwitch={onSwitch}
        onClose={onClose}
        torch={phase.kind === 'camera' ? { supported: camera.torchSupported, on: camera.torchOn, toggle: () => void camera.toggleTorch() } : undefined}
      />

      {phase.kind === 'camera' && blocked && <BlockedPanel reason={blocked} />}

      {phase.kind === 'camera' && !blocked && camera.status === 'ready' && (
        <div className="pb-safe absolute inset-x-0 bottom-0 z-20">
          <p className="mx-auto mb-4 w-fit rounded-full bg-black/60 px-4 py-2 text-[14px] font-semibold text-white">Fit the whole plate in the frame</p>
          <div className="mb-6 flex items-center justify-around px-6">
            <PhotoPicker onFile={(f) => void pick(f)} className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white">
              <Images size={22} aria-hidden="true" />
              <span className="sr-only">Pick a photo from gallery</span>
            </PhotoPicker>
            <Shutter label="Take photo of meal" onClick={() => void capture()} />
            <span className="h-12 w-12" aria-hidden="true" />
          </div>
        </div>
      )}

      {phase.kind === 'analyzing' && (
        <ScanPanel labelledBy="analyzing-h">
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <h2 id="analyzing-h" className="h-display animate-shimmer text-[28px]">
              Finding your food…
            </h2>
            <p className="text-[14px] text-muted">Recognising dishes and estimating portions. This takes a few seconds.</p>
            <Button variant="surface" onClick={retake}>
              Cancel
            </Button>
          </div>
        </ScanPanel>
      )}

      {phase.kind === 'error' && (
        <ScanPanel labelledBy="scan-err-h">
          <div className="flex flex-col gap-3 p-5">
            <h2 id="scan-err-h" className="h-display flex items-center gap-2 text-[26px]">
              <TriangleAlert size={22} className="text-flame" aria-hidden="true" /> Scan failed
            </h2>
            <p role="alert" className="text-[15px] text-muted">
              {phase.message}
            </p>
            {phase.aiKind === 'no-key' || phase.aiKind === 'invalid-key' ? (
              <ButtonLink to="/me#ai" block icon={<KeyRound size={18} aria-hidden="true" />}>
                Open AI settings
              </ButtonLink>
            ) : (
              <Button block onClick={retake} icon={<RotateCcw size={18} aria-hidden="true" />}>
                Try again
              </Button>
            )}
            <ButtonLink to={`/eat/add?meal=${initialMeal}&d=${date}`} replace variant="surface" block icon={<Search size={18} aria-hidden="true" />}>
              Search foods instead
            </ButtonLink>
          </div>
        </ScanPanel>
      )}

      {phase.kind === 'results' && (
        <Results
          items={phase.items}
          meal={initialMeal}
          date={date}
          onRetake={retake}
          onDone={onDone}
          onChangeItems={(items) => setPhase({ ...phase, items })}
        />
      )}
    </div>
  )
}

function BlockedPanel({ reason }: { reason: 'no-key' | 'offline' }) {
  return (
    <ScanPanel labelledBy="blocked-h">
      <div className="flex flex-col gap-3 p-5">
        <h2 id="blocked-h" className="h-display text-[26px]">
          {reason === 'no-key' ? 'Add your Gemini key' : 'You’re offline'}
        </h2>
        <p className="text-[15px] text-muted">
          {reason === 'no-key'
            ? 'Meal photo scanning uses Google Gemini with your own free API key. It takes a minute to set up.'
            : 'Meal photo scanning needs internet. Barcodes you’ve scanned before and food search still work offline.'}
        </p>
        {reason === 'no-key' && (
          <ButtonLink to="/me#ai" block icon={<KeyRound size={18} aria-hidden="true" />}>
            Add API key
          </ButtonLink>
        )}
        <ButtonLink to="/eat/add" replace variant="surface" block icon={<Search size={18} aria-hidden="true" />}>
          Search foods
        </ButtonLink>
      </div>
    </ScanPanel>
  )
}

/** The photo with a labelled box around each recognised item (Gemini boxes are 0–1000 normalized). */
function PhotoWithBoxes({ photo, items, dim }: { photo: string; items: MealItem[]; dim: boolean }) {
  const [ratio, setRatio] = useState<number | null>(null)
  return (
    <div className={cx('absolute inset-x-0 top-0 flex items-center justify-center bg-black pb-3 pt-[calc(env(safe-area-inset-top)+60px)]', PHOTO_AREA)}>
      <div className="relative max-h-full max-w-full" style={ratio ? { aspectRatio: String(ratio), height: '100%' } : undefined}>
        <img
          src={photo}
          alt="Your meal"
          onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
          className={cx('h-full w-full object-contain', dim && 'opacity-60')}
        />
        {items.map((it) =>
          it.box ? (
            <div
              key={it.id}
              className={cx(
                'absolute rounded-md border-2',
                it.confidence < LOW_CONFIDENCE ? 'border-dashed border-flame' : 'border-accent',
              )}
              style={{
                top: `${it.box[0] / 10}%`,
                left: `${it.box[1] / 10}%`,
                height: `${(it.box[2] - it.box[0]) / 10}%`,
                width: `${(it.box[3] - it.box[1]) / 10}%`,
              }}
            >
              <span
                className={cx(
                  'absolute -top-px left-0 max-w-full -translate-y-full truncate rounded-t-md px-1.5 py-0.5 text-[11px] font-extrabold',
                  it.confidence < LOW_CONFIDENCE ? 'bg-flame text-on-accent' : 'bg-accent text-on-accent',
                )}
              >
                {it.name}
              </span>
            </div>
          ) : null,
        )}
        {dim && <div className="absolute inset-0 animate-shimmer bg-black/30" aria-hidden="true" />}
      </div>
    </div>
  )
}

function Results({
  items,
  meal: initialMeal,
  date,
  onRetake,
  onDone,
  onChangeItems,
}: {
  items: MealItem[]
  meal: Meal
  date: ISODate
  onRetake: () => void
  onDone: (toast: string) => void
  onChangeItems: (items: MealItem[]) => void
}) {
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(items.map((i) => [i.id, i.quantity])))
  const [meal, setMeal] = useState<Meal>(initialMeal)
  const [saving, setSaving] = useState(false)

  const scaled = useMemo(() => items.map((it) => ({ it, q: qty[it.id] ?? it.quantity, ...scaleMealItem(it, qty[it.id] ?? it.quantity) })), [items, qty])
  const total = sumMacros(scaled.map((s) => s.macros))

  async function add() {
    setSaving(true)
    try {
      for (const s of scaled) {
        // Keep a per-unit weight so the entry can be re-portioned later from the food log.
        const grams = s.grams > 0 ? s.grams : Math.max(1, Math.round(s.macros.kcal / 1.5))
        await addLog({
          date,
          meal,
          foodId: null,
          name: s.it.name,
          portionLabel: portionLabel(s.q, s.it.portionLabel),
          grams,
          macros: s.macros,
          aiScan: true,
          serving: { label: s.it.portionLabel, grams: Math.round((grams / s.q) * 10) / 10, qty: s.q },
        })
      }
      onDone(`Added ${scaled.length} ${scaled.length === 1 ? 'item' : 'items'} to ${MEAL_LABEL[meal]}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScanPanel labelledBy="found-h" belowPhoto>
      <div className="flex flex-col gap-3 px-4 pb-4 pt-2">
        <h2 id="found-h" className="h-display text-[28px]">
          Found {items.length} {items.length === 1 ? 'item' : 'items'}
        </h2>

        {items.length === 0 ? (
          <p className="text-[15px] text-muted">No food was recognised in this photo. Retake it closer, in good light, or search instead.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-divider rounded-card border border-border">
            {scaled.map(({ it, q, grams, macros }) => {
              const step = portionStep(it.portionLabel)
              return (
                <li key={it.id} className="flex flex-col gap-2 p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-[15px] font-bold">
                        {it.name}
                        {it.confidence < LOW_CONFIDENCE && (
                          <Chip tone="flame" className="h-5 px-1.5 text-[10px]" icon={<TriangleAlert size={11} aria-hidden="true" />}>
                            Check this
                          </Chip>
                        )}
                      </p>
                      <p className="num text-[13px] font-semibold text-muted">
                        {portionLabel(q, it.portionLabel)} · {grams} g · P {macros.protein} · C {macros.carbs} · F {macros.fat}
                      </p>
                    </div>
                    <span className="num shrink-0 text-[16px] font-extrabold">{macros.kcal}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconButton
                      label={`${formatQty(step)} ${it.portionLabel} less ${it.name}`}
                      onClick={() => setQty((m) => ({ ...m, [it.id]: stepQuantity(q, step, -1) }))}
                    >
                      <Minus size={18} aria-hidden="true" />
                    </IconButton>
                    <output className="num min-w-[72px] text-center text-[16px] font-extrabold" aria-live="polite">
                      {formatQty(q)} <span className="text-[13px] font-bold text-muted">{it.portionLabel}</span>
                    </output>
                    <IconButton
                      label={`${formatQty(step)} ${it.portionLabel} more ${it.name}`}
                      onClick={() => setQty((m) => ({ ...m, [it.id]: stepQuantity(q, step, 1) }))}
                    >
                      <Plus size={18} aria-hidden="true" />
                    </IconButton>
                    <IconButton label={`Remove ${it.name}`} variant="ghost" className="ml-auto" onClick={() => onChangeItems(items.filter((x) => x.id !== it.id))}>
                      <X size={18} aria-hidden="true" />
                    </IconButton>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {items.length > 0 && (
          <>
            <div className="num flex items-baseline justify-between rounded-card-sm bg-surface-2 px-4 py-3">
              <span>
                <span className="h-display text-[32px] leading-none">{total.kcal}</span>
                <span className="ml-1 text-[12px] font-extrabold uppercase tracking-[0.08em] text-muted">kcal total</span>
              </span>
              <span className="text-[13px] font-bold">
                <span className="text-protein">P {total.protein}</span> · <span className="text-carbs">C {total.carbs}</span> ·{' '}
                <span className="text-fat">F {total.fat}</span>
              </span>
            </div>
            {scaled.some(({ it }) => it.confidence < LOW_CONFIDENCE) && (
              <p className="text-[13px] font-semibold text-flame">AI estimates can be off — check the items marked “Check this”.</p>
            )}
            <Segmented legend="Meal" options={MEALS.map((m) => ({ value: m, label: MEAL_LABEL[m] }))} value={meal} onChange={setMeal} />
          </>
        )}

        <div className="flex gap-3">
          <Button variant="surface" onClick={onRetake} icon={<RotateCcw size={18} aria-hidden="true" />}>
            Retake
          </Button>
          {items.length > 0 ? (
            <Button block disabled={saving} onClick={() => void add()}>
              Add to {MEAL_LABEL[meal]}
            </Button>
          ) : (
            <ButtonLink to={`/eat/add?meal=${meal}&d=${date}`} replace block icon={<Search size={18} aria-hidden="true" />}>
              Search foods
            </ButtonLink>
          )}
        </div>
      </div>
    </ScanPanel>
  )
}
