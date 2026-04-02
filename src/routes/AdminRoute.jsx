import { Navigate, Outlet } from 'react-router-dom'
import { USER_ROLES } from '../lib/constants'
import { useAuthStore } from '../store/authStore'

export function AdminRoute() {
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const isLoading = useAuthStore((state) => state.isLoading)
  const user = useAuthStore((state) => state.user)
  const role = useAuthStore((state) => state.role)

  if (!isInitialized || isLoading) {
    return <div className="h-56 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
  }

  if (!user) {
    return <Navigate replace to="/admin/login" />
  }

  if (role !== USER_ROLES.ADMIN) {
    return <Navigate replace to="/" />
  }

  return <Outlet />
}
