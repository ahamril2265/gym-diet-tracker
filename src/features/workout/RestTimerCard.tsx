import { X } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { IconButton } from '../../components/Button'
import { cx } from '../../components/cx'
import { useNow } from '../../hooks/useNow'
import { formatClock } from '../../lib/format'
import { remainingMs, restTimer } from '../../lib/restTimer'

const subscribe = (fn: () => void) => restTimer.subscribe(fn)

/** Big countdown with −15 / +15, shown while resting between sets of this workout. */
export function RestTimerCard({ workoutId }: { workoutId: string }) {
  const state = useSyncExternalStore(subscribe, restTimer.get)
  const visible = state !== null && state.workoutId === workoutId
  const now = useNow(250, visible && !state?.done)
  if (!visible) return null

  const left = remainingMs(state, now)
  const pct = state.done ? 0 : Math.min(100, (left / state.totalMs) * 100)

  return (
    <section
      aria-label="Rest timer"
      className="sticky top-[calc(env(safe-area-inset-top)+60px)] z-20 rounded-card border-2 border-accent bg-surface p-4 shadow-lg shadow-black/40"
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className={cx('text-[12px] font-extrabold uppercase tracking-[0.12em]', state.done ? 'text-flame' : 'text-muted')}>
            {state.done ? 'Rest over — go!' : 'Rest'}
          </p>
          <p className="h-display num text-[56px] leading-none" role="timer" aria-live="off">
            {formatClock(left)}
          </p>
        </div>
        {!state.done && (
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="15 seconds less rest"
              onClick={() => restTimer.adjust(-15)}
              className="num h-12 min-w-[56px] rounded-btn border border-border bg-surface-2 px-3 text-[16px] font-extrabold active:bg-border"
            >
              −15
            </button>
            <button
              type="button"
              aria-label="15 seconds more rest"
              onClick={() => restTimer.adjust(15)}
              className="num h-12 min-w-[56px] rounded-btn border border-border bg-surface-2 px-3 text-[16px] font-extrabold active:bg-border"
            >
              +15
            </button>
          </div>
        )}
        <IconButton label={state.done ? 'Dismiss' : 'Skip rest'} variant="ghost" onClick={() => restTimer.stop()}>
          <X size={20} aria-hidden="true" />
        </IconButton>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <div className="h-full rounded-full bg-accent transition-[width] duration-200 ease-linear" style={{ width: `${pct}%` }} />
      </div>
      {/* Announce only the end, not every second. */}
      <p className="sr-only" aria-live="assertive">
        {state.done ? 'Rest over' : ''}
      </p>
    </section>
  )
}
