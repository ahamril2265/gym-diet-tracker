import type { ReactNode } from 'react'
import { cx } from './cx'

export interface RingProps {
  /** 0..1; values above 1 draw a full ring. */
  progress: number
  size?: number
  stroke?: number
  /** Tailwind stroke class for the progress arc. */
  colorClass?: string
  children?: ReactNode
  label: string
}

export function Ring({ progress, size = 124, stroke = 11, colorClass = 'stroke-accent', children, label }: RingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-2" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className={cx(colorClass, 'transition-[stroke-dashoffset] duration-500')}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}
