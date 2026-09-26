import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorPanel } from './RouteError'

interface State {
  error: Error | null
}

/** Last-resort boundary around the router for errors outside any route. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return <ErrorPanel title="Something went wrong" detail={this.state.error.message} />
    }
    return this.props.children
  }
}
