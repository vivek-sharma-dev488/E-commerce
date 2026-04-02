import { useEffect } from 'react'
import { authService } from '../services/authService'
import { cartService } from '../services/cartService'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'

export const useAuthSync = () => {
  const initializeAuth = useAuthStore((state) => state.initializeAuth)
  const setAuthState = useAuthStore((state) => state.setAuthState)
  const hydrateFromServer = useCartStore((state) => state.hydrateFromServer)

  useEffect(() => {
    const bootstrap = async () => {
      await initializeAuth()

      const user = useAuthStore.getState().user

      if (user?.id) {
        const serverCart = await cartService.fetchCart(user.id)
        hydrateFromServer(serverCart)
      }
    }

    bootstrap()

    const {
      data: { subscription },
    } = authService.onAuthChange(async (_event, session) => {
      const user = session?.user || null
      const role = user ? await authService.getUserRole(user.id) : 'user'

      const serverCart = user?.id ? await cartService.fetchCart(user.id) : []

      setAuthState({
        session,
        user,
        role,
      })

      hydrateFromServer(serverCart)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [hydrateFromServer, initializeAuth, setAuthState])
}
