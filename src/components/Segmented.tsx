import { useId } from 'react'
import { cx } from './cx'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedProps<T extends string> {
  legend: string
  /** Visually hide the legend when the context already makes it obvious. */
  hideLegend?: boolean
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/** Segmented control built on native radio inputs (keyboard + screen reader support for free). */
export function Segmented<T extends string>({ legend, hideLegend, options, value, onChange, className }: SegmentedProps<T>) {
  const name = useId()
  return (
    <fieldset className={cx('min-w-0', className)}>
      <legend className={hideLegend ? 'sr-only' : 'mb-1.5 text-[13px] font-bold text-muted'}>{legend}</legend>
      <div className="flex rounded-btn border border-border bg-surface p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              'flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-[10px] px-2 text-[14px] font-bold transition-colors',
              'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent',
              value === o.value ? 'bg-accent text-on-accent' : 'text-muted',
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span className="truncate">{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
