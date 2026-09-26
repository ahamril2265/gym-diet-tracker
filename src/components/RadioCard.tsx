import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'

export interface RadioCardProps {
  name: string
  value: string
  checked: boolean
  onChange: () => void
  title: ReactNode
  meta?: ReactNode
  children?: ReactNode
  size?: 'lg' | 'md'
}

/** A big selectable card backed by a real radio input. The selected card fills with the accent colour. */
export function RadioCard({ name, value, checked, onChange, title, meta, children, size = 'md' }: RadioCardProps) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-center gap-3 border transition-colors',
        'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
        size === 'lg' ? 'min-h-[84px] rounded-card-lg px-5 py-4' : 'min-h-[60px] rounded-card-sm px-4 py-3',
        checked ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface text-fg',
      )}
    >
      <input type="radio" className="sr-only" name={name} value={value} checked={checked} onChange={onChange} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className={size === 'lg' ? 'h-display text-[30px]' : 'text-[15px] font-extrabold'}>{title}</span>
          {meta && (
            <span className={cx('num shrink-0 text-[13px] font-extrabold', checked ? 'text-on-accent' : 'text-muted')}>
              {meta}
            </span>
          )}
        </div>
        {children && (
          <div className={cx('mt-0.5 text-[13px] font-semibold', checked ? 'text-on-accent/80' : 'text-muted')}>{children}</div>
        )}
      </div>
      <span
        aria-hidden="true"
        className={cx(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
          checked ? 'border-on-accent bg-on-accent text-accent' : 'border-border',
        )}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
    </label>
  )
}
