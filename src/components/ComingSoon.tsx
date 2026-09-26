import { Construction } from 'lucide-react'
import { ScreenHeader } from './ScreenHeader'

/** Temporary screen for routes whose feature lands in a later build phase. */
export function ComingSoon({ title, eyebrow, phase, what }: { title: string; eyebrow?: string; phase: number; what: string }) {
  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader eyebrow={eyebrow} title={title} />
      <div className="card flex flex-col items-start gap-3 p-5">
        <Construction size={28} strokeWidth={2} className="text-accent" aria-hidden="true" />
        <p className="h-display text-[22px]">Coming in phase {phase}</p>
        <p className="text-[14px] text-muted">{what}</p>
      </div>
    </div>
  )
}
