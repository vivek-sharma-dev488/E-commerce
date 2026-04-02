import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { USER_ROLES } from '../../lib/constants'
import { useAuthStore } from '../../store/authStore'
import { LoginPage } from './LoginPage'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const role = useAuthStore((state) => state.role)

  useEffect(() => {
    if (role === USER_ROLES.ADMIN) {
      navigate('/admin', { replace: true })
    }
  }, [role, navigate])

  useEffect(() => {
    toast('Use an account with admin role to access dashboard.')
  }, [])

  return <LoginPage />
}
