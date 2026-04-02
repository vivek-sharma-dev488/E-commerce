import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo } from 'react'
import { ToastProvider } from '../components/common/ToastProvider'
import { useAuthSync } from '../hooks/useAuthSync'
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications'
import { useAuthStore } from '../store/authStore'

function AppBootstrap() {
  useAuthSync()

  const user = useAuthStore((state) => state.user)
  useRealtimeNotifications(user?.id)

  return null
}

export function AppProviders({ children }) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30,
            refetchOnWindowFocus: false,
          },
        },
      }),
    [],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AppBootstrap />
      {children}
      <ToastProvider />
    </QueryClientProvider>
  )
}
