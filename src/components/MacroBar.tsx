import { cx } from './cx'

export type MacroKey = 'protein' | 'carbs' | 'fat'

const MACRO: Record<MacroKey, { label: string; bar: string; text: string }> = {
  protein: { label: 'Protein', bar: 'bg-protein', text: 'text-protein' },
  carbs: { label: 'Carbs', bar: 'bg-carbs', text: 'text-carbs' },
  fat: { label: 'Fat', bar: 'bg-fat', text: 'text-fat' },
}

export interface MacroBarProps {
  macro: MacroKey
  eaten: number
  target: number
}

export function MacroBar({ macro, eaten, target }: MacroBarProps) {
  const m = MACRO[macro]
  const pct = target > 0 ? Math.min(100, (eaten / target) * 100) : 0
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className={cx('text-[12px] font-extrabold uppercase tracking-[0.08em]', m.text)}>{m.label}</span>
        <span className="num text-[13px] font-bold text-fg">
          {Math.round(eaten)}
          <span className="text-faint"> / {Math.round(target)} g</span>
        </span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-label={`${m.label} eaten`}
        aria-valuemin={0}
        aria-valuemax={Math.round(target)}
        aria-valuenow={Math.round(eaten)}
      >
        <div className={cx('h-full rounded-full transition-[width] duration-500', m.bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
