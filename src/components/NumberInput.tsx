import { useEffect, useState, type InputHTMLAttributes } from 'react'
import { cx } from './cx'

export interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number
  onValue: (n: number) => void
  min: number
  max: number
  /** Accessible name (these inputs usually sit in compact rows without a visible label). */
  label: string
}

/** Small integer input: keeps what you type locally and commits only valid, in-range whole numbers. */
export function NumberInput({ value, onValue, min, max, label, className, ...rest }: NumberInputProps) {
  const [text, setText] = useState(String(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(String(value))
  }, [value, focused])

  return (
    <input
      {...rest}
      aria-label={label}
      inputMode="numeric"
      pattern="[0-9]*"
      className={cx('input num h-11 px-2 text-center', className)}
      value={text}
      onFocus={(e) => {
        setFocused(true)
        e.currentTarget.select()
      }}
      onBlur={() => {
        setFocused(false)
        setText(String(value))
      }}
      onChange={(e) => {
        setText(e.target.value)
        const n = Number(e.target.value)
        if (e.target.value.trim() !== '' && Number.isInteger(n) && n >= min && n <= max) onValue(n)
      }}
    />
  )
}
