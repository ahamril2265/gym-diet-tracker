import { forwardRef, useEffect, useState } from 'react'
import { cx } from '../../components/cx'

export interface SetValueInputProps {
  value: number | null
  /** Called with a parsed value (`null` when cleared). */
  onValue: (v: number | null) => void
  format: (v: number) => string
  decimals: boolean
  label: string
  placeholder?: string
  done?: boolean
}

/** Compact kg/reps cell. Keeps the typed text while focused; shows the stored value otherwise. */
export const SetValueInput = forwardRef<HTMLInputElement, SetValueInputProps>(function SetValueInput(
  { value, onValue, format, decimals, label, placeholder, done },
  ref,
) {
  const shown = value === null ? '' : format(value)
  const [text, setText] = useState(shown)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(shown)
  }, [shown, focused])

  return (
    <input
      ref={ref}
      aria-label={label}
      inputMode={decimals ? 'decimal' : 'numeric'}
      enterKeyHint="done"
      autoComplete="off"
      placeholder={placeholder}
      className={cx(
        'num h-11 w-full rounded-btn-sm border px-1 text-center text-[16px] font-bold placeholder:font-semibold placeholder:text-faint focus:border-accent focus:outline-none',
        done ? 'border-transparent bg-transparent text-fg' : 'border-border bg-surface-2 text-fg',
      )}
      value={text}
      onFocus={(e) => {
        setFocused(true)
        e.currentTarget.select()
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const raw = e.target.value.replace(',', '.')
        if (raw !== '' && !(decimals ? /^\d{0,4}(\.\d{0,2})?$/ : /^\d{0,4}$/).test(raw)) return
        setText(raw)
        if (raw === '' || raw === '.') onValue(null)
        else onValue(Number(raw))
      }}
    />
  )
})
