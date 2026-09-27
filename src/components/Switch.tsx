import { cx } from './cx'

/** On/off switch (a real button with role="switch"). */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex h-11 w-[60px] shrink-0 items-center justify-center"
    >
      <span className={cx('relative h-7 w-12 rounded-full border transition-colors', checked ? 'border-accent bg-accent' : 'border-border bg-surface-2')}>
        <span
          className={cx(
            'absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-[left]',
            checked ? 'left-[24px] bg-on-accent' : 'left-[3px] bg-faint',
          )}
        />
      </span>
    </button>
  )
}
