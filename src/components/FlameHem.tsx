import { useId } from 'react'
import { cx } from './cx'

/**
 * Decorative flame border, like the hem of a flame-patterned haori: uneven crimson tongues with ember
 * cores over a solid band. Flat fills only (no gradients). Place it at the bottom of a `relative
 * overflow-hidden` container.
 */
export function FlameHem({ className, height = 44 }: { className?: string; height?: number }) {
  // useId returns ":r1:"-style ids; colons can break url(#…) references in some browsers.
  const id = `hem${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cx('pointer-events-none absolute inset-x-0 bottom-0 w-full', className)}
      height={height}
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id={id} width="120" height="52" patternUnits="userSpaceOnUse" x="-8" y={height - 52}>
          <g className="fill-flame-deep">
            <path d="M0 52 C 10 46, 16 38, 14 27 C 12 16, 18 7, 27 0 C 22 11, 31 19, 37 30 C 41 38, 39 45, 42 52 Z" />
            <path d="M34 52 C 44 48, 48 41, 47 34 C 46 27, 51 20, 60 15 C 56 23, 65 29, 71 36 C 75 42, 73 47, 77 52 Z" />
            <path d="M70 52 C 80 49, 86 44, 86 38 C 86 33, 90 29, 97 25 C 94 31, 104 35, 112 40 C 118 44, 118 48, 120 52 Z" />
          </g>
          <g className="fill-ember">
            <path d="M6 52 C 13 47, 19 41, 19 33 C 19 27, 22 22, 27 17 C 25 24, 30 30, 33 37 C 35 43, 33 48, 34 52 Z" />
            <path d="M42 52 C 48 49, 52 44, 52 39 C 52 35, 55 31, 59 28 C 57 33, 62 37, 65 42 C 67 46, 66 49, 67 52 Z" />
            <path d="M78 52 C 84 50, 88 46, 89 43 C 90 40, 92 38, 96 36 C 94 40, 100 43, 104 46 C 107 48, 107 50, 108 52 Z" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${id})`} />
      <rect y={height - 4} width="100%" height="4" className="fill-flame-deep" />
    </svg>
  )
}

/** Large faint 炎 ("flame") mark used as a watermark on hero cards. */
export function FlameKanji({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'pointer-events-none absolute select-none font-black leading-none',
        'font-jp',
        className,
      )}
    >
      炎
    </span>
  )
}
