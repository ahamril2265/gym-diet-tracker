import { RefreshCw, X } from 'lucide-react'
import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button, IconButton } from '../components/Button'

/**
 * Registers the service worker and shows a small banner when a new version is ready.
 * We never auto-reload, so an update can't interrupt a live workout.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.warn('Service worker registration failed', error)
    },
  })

  useEffect(() => {
    if (!offlineReady) return
    const t = window.setTimeout(() => setOfflineReady(false), 4000)
    return () => window.clearTimeout(t)
  }, [offlineReady, setOfflineReady])

  if (!needRefresh && !offlineReady) return null

  return (
    <div
      role="status"
      className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+12px)] z-50 flex w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2 items-center gap-3 rounded-card border border-border bg-surface-2 p-3 pl-4 shadow-lg shadow-black/40"
    >
      <p className="min-w-0 flex-1 text-[14px] font-semibold">
        {needRefresh ? 'A new version is ready.' : 'Ready to work offline.'}
      </p>
      {needRefresh && (
        <Button size="sm" icon={<RefreshCw size={16} aria-hidden="true" />} onClick={() => void updateServiceWorker(true)}>
          Reload
        </Button>
      )}
      <IconButton
        label="Dismiss"
        variant="ghost"
        onClick={() => {
          setNeedRefresh(false)
          setOfflineReady(false)
        }}
      >
        <X size={18} aria-hidden="true" />
      </IconButton>
    </div>
  )
}
