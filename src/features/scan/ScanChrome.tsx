import { Flashlight, FlashlightOff, X } from 'lucide-react'
import type { ReactNode, RefObject } from 'react'
import { cx } from '../../components/cx'
import { Segmented } from '../../components/Segmented'
import { CAMERA_ERROR_TEXT, type CameraError } from '../../hooks/useCamera'

export type ScanMode = 'meal' | 'barcode'

const round = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/60 text-white active:bg-black/80'

/** Close · Meal | Barcode toggle · torch. Sits on top of the camera view. */
export function ScanTopBar({
  mode,
  onSwitch,
  onClose,
  torch,
}: {
  mode: ScanMode
  onSwitch: (m: ScanMode) => void
  onClose: () => void
  torch?: { supported: boolean; on: boolean; toggle: () => void }
}) {
  return (
    <div className="pt-safe absolute inset-x-0 top-0 z-30">
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" aria-label="Close camera" className={round} onClick={onClose}>
          <X size={22} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <Segmented
            legend="Scan mode"
            hideLegend
            options={[
              { value: 'meal', label: 'Meal' },
              { value: 'barcode', label: 'Barcode' },
            ]}
            value={mode}
            onChange={onSwitch}
          />
        </div>
        {torch?.supported ? (
          <button
            type="button"
            aria-label={torch.on ? 'Turn torch off' : 'Turn torch on'}
            aria-pressed={torch.on}
            className={cx(round, torch.on && 'bg-accent text-on-accent active:bg-accent')}
            onClick={torch.toggle}
          >
            {torch.on ? <Flashlight size={20} aria-hidden="true" /> : <FlashlightOff size={20} aria-hidden="true" />}
          </button>
        ) : (
          <span className="w-11 shrink-0" aria-hidden="true" />
        )}
      </div>
    </div>
  )
}

/** Full-bleed live camera, or an explanation when the camera can't start. */
export function CameraView({
  videoRef,
  status,
  error,
  hidden,
  children,
}: {
  videoRef: RefObject<HTMLVideoElement>
  status: string
  error: CameraError | null
  hidden?: boolean
  children?: ReactNode
}) {
  return (
    <>
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        aria-hidden="true"
        className={cx('absolute inset-0 h-full w-full object-cover', (hidden || status !== 'ready') && 'invisible')}
      />
      {status === 'starting' && (
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[14px] font-semibold text-white/80">Starting camera…</p>
      )}
      {status === 'error' && error && (
        <div className="absolute inset-x-6 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-3 text-center">
          <p className="text-[15px] font-semibold text-white">{CAMERA_ERROR_TEXT[error]}</p>
          {children}
        </div>
      )}
    </>
  )
}

/** Big round shutter button. */
export function Shutter({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-white/90 disabled:opacity-40"
    >
      <span className="h-[60px] w-[60px] rounded-full bg-accent active:scale-95" />
    </button>
  )
}

/** Hidden file input wrapped in a button-styled label ("Pick photo"). */
export function PhotoPicker({ onFile, children, className }: { onFile: (f: File) => void; children: ReactNode; className?: string }) {
  return (
    <label className={cx('cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent', className)}>
      <input
        type="file"
        accept="image/*"
        className="sr-only"
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

/** Accent corner brackets with an animated scan line; the area outside the frame is dimmed. */
export function ScanFrame({ aspect = 'barcode', label }: { aspect?: 'barcode' | 'label'; label: string }) {
  const corner = 'absolute h-7 w-7 border-accent'
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
      <div
        className={cx('relative rounded-card shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]', aspect === 'barcode' ? 'h-[34%] w-[80%] max-h-[220px]' : 'h-[58%] w-[80%]')}
        aria-hidden="true"
      >
        <span className={cx(corner, 'left-0 top-0 rounded-tl-card border-l-[3px] border-t-[3px]')} />
        <span className={cx(corner, 'right-0 top-0 rounded-tr-card border-r-[3px] border-t-[3px]')} />
        <span className={cx(corner, 'bottom-0 left-0 rounded-bl-card border-b-[3px] border-l-[3px]')} />
        <span className={cx(corner, 'bottom-0 right-0 rounded-br-card border-b-[3px] border-r-[3px]')} />
        {aspect === 'barcode' && <span className="absolute inset-x-4 h-0.5 animate-scanline rounded-full bg-accent shadow-[0_0_12px_2px_rgba(255,182,39,0.7)]" />}
      </div>
      <p className="mt-4 rounded-full bg-black/60 px-4 py-2 text-[14px] font-semibold text-white">{label}</p>
    </div>
  )
}

/** Top 40% of the screen, where a captured photo is shown above a `belowPhoto` panel. */
export const PHOTO_AREA = 'h-[40dvh]'

/**
 * Panel that slides up from the bottom of the camera screen. With `belowPhoto` it fills the space under
 * the photo instead of covering it, so the boxes stay visible.
 */
export function ScanPanel({ children, labelledBy, belowPhoto }: { children: ReactNode; labelledBy?: string; belowPhoto?: boolean }) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cx(
        'pb-safe absolute inset-x-0 bottom-0 z-20 overflow-y-auto overscroll-contain rounded-t-card-lg border-t border-border bg-surface',
        belowPhoto ? 'top-[40dvh]' : 'max-h-[72dvh]',
      )}
    >
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
      {children}
    </section>
  )
}
