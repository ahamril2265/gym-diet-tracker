import { useId, type ReactNode } from 'react'
import { cx } from './cx'

export interface FieldProps {
  label: string
  /** Render prop receives the generated id + describedby so the input is properly labelled. */
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode
  hint?: string
  error?: string | null
  className?: string
  suffix?: string
}

export function Field({ label, children, hint, error, className, suffix }: FieldProps) {
  const id = useId()
  const msgId = `${id}-msg`
  const hasMsg = Boolean(error || hint)
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-bold text-muted">
        {label}
      </label>
      <div className="relative">
        {children({
          id,
          'aria-describedby': hasMsg ? msgId : undefined,
          'aria-invalid': error ? true : undefined,
        })}
        {suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-faint">
            {suffix}
          </span>
        )}
      </div>
      {hasMsg && (
        <p id={msgId} className={cx('text-[12px] font-semibold', error ? 'text-danger' : 'text-faint')}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
