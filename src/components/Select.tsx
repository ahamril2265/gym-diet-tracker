import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'
import { cx } from './cx'

/** Native <select> styled like the text inputs (native pickers are the best UX on phones). */
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cx('input appearance-none pr-10', className)} {...rest}>
        {children}
      </select>
      <ChevronDown
        size={18}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint"
      />
    </div>
  )
}
