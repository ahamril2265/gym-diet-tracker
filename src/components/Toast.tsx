import { useEffect } from 'react'

/** Small status message above the tab bar, with an optional action (e.g. Undo). Auto-hides. */
export function Toast({
  message,
  actionLabel,
  onAction,
  onDismiss,
  durationMs = 5000,
}: {
  message: string | null
  actionLabel?: string
  onAction?: () => void
  onDismiss: () => void
  durationMs?: number
}) {
  useEffect(() => {
    if (!message) return
    const t = window.setTimeout(onDismiss, durationMs)
    return () => window.clearTimeout(t)
  }, [message, durationMs, onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-[calc(84px+env(safe-area-inset-bottom)+84px)] left-1/2 z-40 flex w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2 justify-center"
    >
      {message && (
        <div className="pointer-events-auto flex w-full items-center gap-3 rounded-card border border-border bg-surface-2 py-2 pl-4 pr-2 shadow-lg shadow-black/40">
          <p className="min-w-0 flex-1 truncate text-[14px] font-semibold">{message}</p>
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={() => {
                onAction()
                onDismiss()
              }}
              className="h-11 shrink-0 rounded-btn-sm px-3 text-[14px] font-extrabold uppercase tracking-[0.06em] text-accent active:bg-border"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
