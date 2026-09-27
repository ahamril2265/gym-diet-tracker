import { Link } from 'react-router'
import { cx } from '../../components/cx'

export type ProgressView = 'strength' | 'body' | 'nutrition'

const TABS: { view: ProgressView; label: string; to: string }[] = [
  { view: 'strength', label: 'Strength', to: '/progress' },
  { view: 'body', label: 'Body', to: '/progress/body' },
  { view: 'nutrition', label: 'Nutrition', to: '/progress?view=nutrition' },
]

/** Strength | Body | Nutrition segmented control (navigation links, so each view has its own URL). */
export function ProgressTabs({ current }: { current: ProgressView }) {
  return (
    <nav aria-label="Progress sections" className="flex rounded-btn border border-border bg-surface p-1">
      {TABS.map((t) => (
        <Link
          key={t.view}
          to={t.to}
          replace
          aria-current={t.view === current ? 'page' : undefined}
          className={cx(
            'flex h-11 flex-1 items-center justify-center rounded-[10px] text-[14px] font-bold transition-colors',
            t.view === current ? 'bg-accent text-on-accent' : 'text-muted active:bg-surface-2',
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
