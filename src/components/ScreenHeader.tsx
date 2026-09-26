import type { ReactNode } from 'react'

export interface ScreenHeaderProps {
  eyebrow?: string
  title: string
  right?: ReactNode
}

export function ScreenHeader({ eyebrow, title, right }: ScreenHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="h-display mt-1 truncate text-[40px]">{title}</h1>
      </div>
      {right && <div className="flex shrink-0 items-center gap-2 pt-1">{right}</div>}
    </header>
  )
}
