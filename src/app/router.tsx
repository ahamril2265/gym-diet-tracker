import type { ComponentType } from 'react'
import { createBrowserRouter, Outlet, redirect, ScrollRestoration } from 'react-router'
import { db } from '../db/db'
import { FullScreenLayout, TabLayout } from './AppLayout'
import { RouteError } from './RouteError'
import { UpdatePrompt } from './UpdatePrompt'

/** Lazy-load a screen module's default export so each screen is its own chunk. */
const screen = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default })

async function requireOnboarded() {
  const settings = await db.settings.get('app')
  if (!settings?.onboarded) throw redirect('/onboarding')
  return null
}

async function redirectIfOnboarded() {
  const settings = await db.settings.get('app')
  if (settings?.onboarded) throw redirect('/')
  return null
}

function Root() {
  return (
    <div className="mx-auto min-h-dvh max-w-app bg-bg min-[431px]:border-x min-[431px]:border-divider">
      <Outlet />
      <ScrollRestoration />
      <UpdatePrompt />
    </div>
  )
}

/** Shown for the split second while the first route's loader and lazy chunk resolve. */
function BootFallback() {
  return <div className="min-h-dvh bg-bg" aria-busy="true" />
}

export const router = createBrowserRouter([
  {
    Component: Root,
    HydrateFallback: BootFallback,
    ErrorBoundary: RouteError,
    children: [
      {
        path: 'onboarding',
        loader: redirectIfOnboarded,
        lazy: screen(() => import('../features/onboarding/OnboardingScreen')),
      },
      {
        loader: requireOnboarded,
        ErrorBoundary: RouteError,
        children: [
          {
            Component: TabLayout,
            children: [
              { index: true, lazy: screen(() => import('../features/today/TodayScreen')) },
              { path: 'train', lazy: screen(() => import('../features/train/TrainScreen')) },
              { path: 'train/exercises', lazy: screen(() => import('../features/exercises/ExerciseLibraryScreen')) },
              { path: 'train/split', lazy: screen(() => import('../features/train/SplitEditorScreen')) },
              { path: 'eat', lazy: screen(() => import('../features/eat/EatScreen')) },
              { path: 'progress', lazy: screen(() => import('../features/progress/ProgressScreen')) },
              { path: 'progress/body', lazy: screen(() => import('../features/progress/BodyScreen')) },
              { path: 'me', lazy: screen(() => import('../features/me/MeScreen')) },
            ],
          },
          {
            Component: FullScreenLayout,
            children: [
              { path: 'workout/:id', lazy: screen(() => import('../features/workout/WorkoutScreen')) },
              { path: 'scan/meal', lazy: screen(() => import('../features/scan/ScanScreen')) },
              { path: 'scan/barcode', lazy: screen(() => import('../features/scan/ScanScreen')) },
            ],
          },
        ],
      },
      { path: '*', loader: () => redirect('/') },
    ],
  },
])
