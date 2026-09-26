import { cx } from './cx'

/** Placeholder block with a fixed size so content doesn't shift when data arrives. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('animate-shimmer rounded-btn bg-surface-2', className)} />
}

/** Generic screen skeleton: header + a few cards. */
export function ScreenSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-44 w-full rounded-card" />
      <Skeleton className="h-32 w-full rounded-card" />
    </div>
  )
}
