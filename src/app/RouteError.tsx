import { TriangleAlert } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Button, ButtonLink } from '../components/Button'

function describe(error: unknown): { title: string; detail: string } {
  if (isRouteErrorResponse(error)) {
    return error.status === 404
      ? { title: 'Page not found', detail: "That screen doesn't exist." }
      : { title: `Error ${error.status}`, detail: error.statusText }
  }
  if (error instanceof Error) {
    // A new deploy can remove old lazy-loaded chunks; a reload fetches the new ones.
    if (/dynamically imported module|Importing a module script failed|Failed to fetch/i.test(error.message)) {
      return { title: 'App updated', detail: 'A newer version is available. Reload to continue.' }
    }
    return { title: 'Something went wrong', detail: error.message }
  }
  return { title: 'Something went wrong', detail: 'Unknown error' }
}

export function ErrorPanel({ title, detail }: { title: string; detail: string }) {
  return (
    <div role="alert" className="mx-auto flex min-h-dvh max-w-app flex-col justify-center gap-4 px-6">
      <TriangleAlert size={36} strokeWidth={2} className="text-flame" aria-hidden="true" />
      <h1 className="h-display text-[40px]">{title}</h1>
      <p className="break-words text-muted">{detail}</p>
      <p className="text-[13px] text-faint">Your data is safe — it's stored on this device.</p>
      <div className="mt-2 flex gap-3">
        <Button onClick={() => window.location.reload()}>Reload</Button>
        <ButtonLink to="/" variant="surface" reloadDocument>
          Go to Today
        </ButtonLink>
      </div>
    </div>
  )
}

/** Route-level error boundary (`ErrorBoundary` in the router config). */
export function RouteError() {
  const error = useRouteError()
  const { title, detail } = describe(error)
  return <ErrorPanel title={title} detail={detail} />
}
