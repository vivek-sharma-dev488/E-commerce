import { Component } from 'react'
import { Button } from './Button'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled app error', error, errorInfo)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center p-6 text-center">
          <p className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700">
            Application Error
          </p>
          <h1 className="mt-4 text-3xl font-heading font-semibold text-slate-900 dark:text-white">
            Something unexpected happened
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {this.state.error?.message || 'Please refresh the page and try again.'}
          </p>
          <Button className="mt-6" onClick={this.reset}>
            Try Again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
