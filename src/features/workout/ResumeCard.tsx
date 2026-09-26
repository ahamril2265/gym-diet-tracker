import { Play } from 'lucide-react'
import { ButtonLink } from '../../components/Button'
import type { Workout } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { formatClock } from '../../lib/format'

/** Shown on Today and Train while a workout is in progress. */
export function ResumeCard({ workout }: { workout: Workout }) {
  const now = useNow()
  return (
    <section
      aria-labelledby="resume-h"
      className="flex items-center gap-4 rounded-card border-2 border-accent bg-surface p-4"
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-flame">
          <span className="h-2 w-2 animate-pulse rounded-full bg-flame" aria-hidden="true" />
          In progress
        </p>
        <h2 id="resume-h" className="h-display mt-1 truncate text-[30px]">
          {workout.name}
        </h2>
        <p className="num text-[14px] font-bold text-muted">{formatClock(now - workout.startedAt)}</p>
      </div>
      <ButtonLink to={`/workout/${workout.id}`} icon={<Play size={16} fill="currentColor" aria-hidden="true" />}>
        Resume
      </ButtonLink>
    </section>
  )
}
