import { CloudOff, TriangleAlert, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { IconButton } from '../components/Button'
import { useOnline } from '../hooks/useOnline'

/** Friendly text for a failed background save (most actions are fire-and-forget promises). */
export function describeFailure(reason: unknown): string | null {
  const name = (reason as { name?: string })?.name
  const inner = (reason as { inner?: { name?: string } })?.inner?.name // Dexie wraps the IndexedDB error
  if (name === 'AbortError' && !inner) return null // cancelled on purpose
  if (name === 'QuotaExceededError' || inner === 'QuotaExceededError') {
    return 'Your phone is out of space for this app. Free up storage, or back up and delete old progress photos.'
  }
  return 'Couldn’t save your last change. Please try again.'
}

/**
 * App-wide notices: an offline banner (so nothing fails silently offline) and a toast for any save that
 * fails in the background.
 */
export function GlobalNotices() {
  const online = useOnline()
  const [offlineDismissed, setOfflineDismissed] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  useEffect(() => {
    if (online) setOfflineDismissed(false)
  }, [online])

  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      const text = describeFailure(e.reason)
      if (!text) return
      console.error(e.reason)
      setFailure(text)
      e.preventDefault()
    }
    window.addEventListener('unhandledrejection', onRejection)
    return () => window.removeEventListener('unhandledrejection', onRejection)
  }, [])

  useEffect(() => {
    if (!failure) return
    const t = window.setTimeout(() => setFailure(null), 7000)
    return () => window.clearTimeout(t)
  }, [failure])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+8px)] z-50 mx-auto flex max-w-app flex-col gap-2 px-4">
      {!online && !offlineDismissed && (
        <div role="status" className="pointer-events-auto flex items-center gap-2 rounded-card border border-border bg-surface-2 py-1.5 pl-3 pr-1 shadow-lg shadow-black/40">
          <CloudOff size={18} className="shrink-0 text-water" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-[13px] font-semibold">Offline — everything works except AI scans and new barcode lookups.</p>
          <IconButton label="Dismiss offline notice" variant="ghost" onClick={() => setOfflineDismissed(true)}>
            <X size={16} aria-hidden="true" />
          </IconButton>
        </div>
      )}
      {failure && (
        <div role="alert" className="pointer-events-auto flex items-center gap-2 rounded-card border border-danger/50 bg-surface-2 py-1.5 pl-3 pr-1 shadow-lg shadow-black/40">
          <TriangleAlert size={18} className="shrink-0 text-danger" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-[13px] font-semibold">{failure}</p>
          <IconButton label="Dismiss" variant="ghost" onClick={() => setFailure(null)}>
            <X size={16} aria-hidden="true" />
          </IconButton>
        </div>
      )}
    </div>
  )
}
