import { RouterProvider } from 'react-router/dom'
import { Analytics } from '@vercel/analytics/react'
import { AppErrorBoundary } from './AppErrorBoundary'
import { router } from './router'

export function App() {
  return (
    <AppErrorBoundary>
      <RouterProvider router={router} />
      <Analytics />
    </AppErrorBoundary>
  )
}
