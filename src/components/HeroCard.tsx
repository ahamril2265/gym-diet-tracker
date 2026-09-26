import type { ReactNode } from 'react'
import { FlameHem, FlameKanji } from './FlameHem'

/** The gold hero card: flame-hair gold with a crimson flame hem and a faint 炎 mark. */
export function HeroCard({ children, labelledBy }: { children: ReactNode; labelledBy?: string }) {
  return (
    <section
      className="relative isolate overflow-hidden rounded-card-lg bg-accent p-5 pb-[64px] text-on-accent"
      aria-labelledby={labelledBy}
    >
      <FlameKanji className="-right-3 -top-4 -z-10 text-[150px] text-on-accent/10" />
      {children}
      <FlameHem height={44} />
    </section>
  )
}
