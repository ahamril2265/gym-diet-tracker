import type { ReactNode } from 'react'
import { cx } from './cx'

export interface ChipProps {
  children: ReactNode
  tone?: 'accent' | 'surface' | 'flame' | 'solid'
  icon?: ReactNode
  className?: string
}

/** Small uppercase pill, e.g. "RECOMP MODE". Non-interactive. */
export function Chip({ children, tone = 'surface', icon, className }: ChipProps) {
  return (
    <span
      className={cx(
        'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12px] font-extrabold uppercase tracking-[0.08em]',
        tone === 'accent' && 'border border-accent/60 text-accent',
        tone === 'surface' && 'border border-border bg-surface text-muted',
        tone === 'flame' && 'border border-flame/50 bg-flame/10 text-flame',
        tone === 'solid' && 'bg-accent text-on-accent',
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
