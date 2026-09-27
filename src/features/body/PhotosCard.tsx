import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, Columns2, Images, Lock, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { Segmented } from '../../components/Segmented'
import { Select } from '../../components/Select'
import { addPhoto, deletePhoto } from '../../db/body'
import { db } from '../../db/db'
import type { BodyWeight, ISODate, PhotoPose, ProgressPhoto, WeightUnit } from '../../db/types'
import { useBlobUrl } from '../../hooks/useBlobUrl'
import { fromISODate } from '../../lib/date'
import { formatShortDate } from '../../lib/format'
import { compressImage } from '../../lib/image'
import { round, weightFromKg } from '../../lib/units'

const POSES: { value: PhotoPose; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'side', label: 'Side' },
  { value: 'back', label: 'Back' },
]
const POSE_LABEL = Object.fromEntries(POSES.map((p) => [p.value, p.label])) as Record<PhotoPose, string>

/** Progress photos: stored as Blobs in IndexedDB on this device only, never uploaded. */
export function PhotosCard({ unit }: { unit: WeightUnit }) {
  const photos = useLiveQuery(() => db.photos.orderBy('date').reverse().toArray())
  const weights = useLiveQuery(() => db.bodyWeights.orderBy('date').toArray())
  const [pose, setPose] = useState<PhotoPose>('front')
  const [viewing, setViewing] = useState<ProgressPhoto | null>(null)
  const [comparing, setComparing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byDate = useMemo(() => {
    const m = new Map<ISODate, Partial<Record<PhotoPose, ProgressPhoto>>>()
    for (const p of photos ?? []) {
      const day = m.get(p.date) ?? {}
      // Newest photo wins when a pose was shot twice the same day.
      if (!day[p.pose] || day[p.pose]!.createdAt < p.createdAt) day[p.pose] = p
      m.set(p.date, day)
    }
    return [...m.entries()]
  }, [photos])

  const save = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      // Keep plenty of detail for comparisons but cap the size (~200–400 KB each).
      await addPhoto(pose, await compressImage(file, 1600, 0.85))
    } catch {
      setError('That file couldn’t be saved as a photo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card flex flex-col gap-3 p-4" aria-labelledby="photos-h">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="photos-h" className="h-display text-[22px]">
            Progress photos
          </h2>
          <p className="flex items-center gap-1 text-[13px] font-semibold text-muted">
            <Lock size={13} aria-hidden="true" /> Stored only on this phone — never uploaded
          </p>
        </div>
        {byDate.length >= 2 && (
          <Button size="sm" variant="surface" icon={<Columns2 size={16} aria-hidden="true" />} onClick={() => setComparing(true)}>
            Compare
          </Button>
        )}
      </div>

      <Segmented legend="Pose for the next photo" options={POSES} value={pose} onChange={setPose} />
      <div className="grid grid-cols-2 gap-2">
        <FileButton capture onFile={(f) => void save(f)} disabled={busy}>
          <Camera size={18} aria-hidden="true" /> Take photo
        </FileButton>
        <FileButton onFile={(f) => void save(f)} disabled={busy}>
          <Images size={18} aria-hidden="true" /> Gallery
        </FileButton>
      </div>
      {busy && <p className="text-[13px] font-semibold text-muted">Saving…</p>}
      {error && (
        <p role="alert" className="text-[13px] font-semibold text-danger">
          {error}
        </p>
      )}

      {byDate.length === 0 ? (
        <p className="rounded-btn border border-dashed border-border p-4 text-center text-[14px] text-muted">
          Take front, side and back photos every 2–4 weeks in the same light and pose.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {byDate.map(([date, day]) => (
            <li key={date}>
              <p className="mb-1.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-muted">{formatShortDate(fromISODate(date))}</p>
              <div className="grid grid-cols-3 gap-2">
                {POSES.map(({ value }) =>
                  day[value] ? (
                    <Thumb key={value} photo={day[value]!} onOpen={() => setViewing(day[value]!)} />
                  ) : (
                    <span
                      key={value}
                      className="flex aspect-[3/4] items-center justify-center rounded-btn-sm border border-dashed border-border text-[12px] font-bold text-faint"
                    >
                      {POSE_LABEL[value]}
                    </span>
                  ),
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <PhotoViewer photo={viewing} onClose={() => setViewing(null)} />
      <CompareSheet open={comparing} onClose={() => setComparing(false)} photos={photos ?? []} weights={weights ?? []} unit={unit} />
    </section>
  )
}

function FileButton({ capture, onFile, disabled, children }: { capture?: boolean; onFile: (f: File) => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <label
      className={cx(
        'inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-btn-sm border border-border bg-surface-2 px-4 text-[14px] font-bold active:bg-border',
        'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <input
        type="file"
        accept="image/*"
        {...(capture ? { capture: 'environment' as const } : {})}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) onFile(f)
        }}
      />
      {children}
    </label>
  )
}

function Thumb({ photo, onOpen }: { photo: ProgressPhoto; onOpen: () => void }) {
  const url = useBlobUrl(photo.blob)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${POSE_LABEL[photo.pose]} photo, ${formatShortDate(fromISODate(photo.date))}`}
      className="aspect-[3/4] overflow-hidden rounded-btn-sm bg-surface-2"
    >
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
    </button>
  )
}

function PhotoViewer({ photo, onClose }: { photo: ProgressPhoto | null; onClose: () => void }) {
  const url = useBlobUrl(photo?.blob)
  return (
    <BottomSheet open={photo !== null} onClose={onClose} title={photo ? `${POSE_LABEL[photo.pose]} · ${formatShortDate(fromISODate(photo.date))}` : ''}>
      {photo && (
        <div className="flex flex-col gap-3 p-4">
          {url && <img src={url} alt={`${POSE_LABEL[photo.pose]} progress photo`} className="max-h-[60dvh] w-full rounded-btn object-contain" />}
          <Button
            variant="danger"
            block
            icon={<Trash size={18} aria-hidden="true" />}
            onClick={async () => {
              if (!window.confirm('Delete this photo? It can’t be recovered.')) return
              await deletePhoto(photo.id)
              onClose()
            }}
          >
            Delete photo
          </Button>
        </div>
      )}
    </BottomSheet>
  )
}

/** Weight on or just before a date, for the compare captions. */
function weightOn(weights: BodyWeight[], date: ISODate): number | null {
  let found: number | null = null
  for (const w of weights) {
    if (w.date <= date) found = w.kg
    else break
  }
  return found
}

function CompareSheet({
  open,
  onClose,
  photos,
  weights,
  unit,
}: {
  open: boolean
  onClose: () => void
  photos: ProgressPhoto[]
  weights: BodyWeight[]
  unit: WeightUnit
}) {
  const [pose, setPose] = useState<PhotoPose>('front')
  const dates = useMemo(() => [...new Set(photos.filter((p) => p.pose === pose).map((p) => p.date))].sort(), [photos, pose])
  const [before, setBefore] = useState<ISODate | null>(null)
  const [after, setAfter] = useState<ISODate | null>(null)
  const b = before && dates.includes(before) ? before : (dates[0] ?? null)
  const a = after && dates.includes(after) ? after : (dates[dates.length - 1] ?? null)
  const pick = (date: ISODate | null) =>
    date ? photos.filter((p) => p.pose === pose && p.date === date).sort((x, y) => y.createdAt - x.createdAt)[0] : undefined

  return (
    <BottomSheet open={open} onClose={onClose} title="Compare">
      <div className="flex flex-col gap-3 p-4">
        <Segmented legend="Pose" hideLegend options={POSES} value={pose} onChange={setPose} />
        {dates.length < 2 ? (
          <p className="text-[14px] text-muted">You need {POSE_LABEL[pose].toLowerCase()} photos from two different days to compare.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-bold text-muted">Before</span>
                <Select value={b ?? ''} onChange={(e) => setBefore(e.target.value)}>
                  {dates.map((d) => (
                    <option key={d} value={d}>
                      {formatShortDate(fromISODate(d))}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-bold text-muted">After</span>
                <Select value={a ?? ''} onChange={(e) => setAfter(e.target.value)}>
                  {dates.map((d) => (
                    <option key={d} value={d}>
                      {formatShortDate(fromISODate(d))}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[b, a].map((date, i) => {
                const kg = date ? weightOn(weights, date) : null
                return (
                  <figure key={i} className="flex flex-col gap-1">
                    <ComparePhoto photo={pick(date)} />
                    <figcaption className="num text-center text-[13px] font-bold">
                      {date ? formatShortDate(fromISODate(date)) : ''}
                      {kg !== null && (
                        <span className="block text-[12px] font-semibold text-muted">
                          {round(weightFromKg(kg, unit), 1)} {unit}
                        </span>
                      )}
                    </figcaption>
                  </figure>
                )
              })}
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  )
}

function ComparePhoto({ photo }: { photo: ProgressPhoto | undefined }) {
  const url = useBlobUrl(photo?.blob)
  return (
    <div className="aspect-[3/4] overflow-hidden rounded-btn-sm bg-surface-2">
      {url && <img src={url} alt={photo ? `${POSE_LABEL[photo.pose]} photo from ${formatShortDate(fromISODate(photo.date))}` : ''} className="h-full w-full object-cover" />}
    </div>
  )
}
