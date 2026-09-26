import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { ScreenSkeleton } from '../components/Skeleton'
import { TabBar } from './TabBar'

/** Tab screens: scrollable content above the fixed bottom tab bar. */
export function TabLayout() {
  return (
    <>
      <main className="px-4 pb-[calc(84px+32px)] pt-[calc(env(safe-area-inset-top)+20px)]">
        <Suspense fallback={<ScreenSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <TabBar />
    </>
  )
}

/** Full-screen routes (live workout, camera): no tab bar. */
export function FullScreenLayout() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <Outlet />
    </Suspense>
  )
}
