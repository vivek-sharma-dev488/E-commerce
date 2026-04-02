import { AppProviders } from './app/AppProviders'
import { AppRouter } from './app/AppRouter'
import { ErrorBoundary } from './components/common/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </ErrorBoundary>
  )
}

export default App
