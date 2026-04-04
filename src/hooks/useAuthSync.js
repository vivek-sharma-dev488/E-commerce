import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { authService } from '../services/authService'
import { cartService } from '../services/cartService'
import { consumePendingAddToCart } from '../lib/pendingAddToCart'
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

      if (user && !authService.isEmailVerified(user)) {
        // Avoid signOut recursion from auth listeners; keep app state unauthenticated.
        setAuthState({
          session: null,
          user: null,
          role: 'user',
        })
        hydrateFromServer([])
        return
      }

      const role = user ? await authService.getUserRole(user.id) : 'user'

      const serverCart = user?.id ? await cartService.fetchCart(user.id) : []

      setAuthState({
        session,
        user,
        role,
      })

      hydrateFromServer(serverCart)

      if (user?.id) {
        const pending = consumePendingAddToCart()

        if (pending?.product) {
          useCartStore.getState().addToCart(pending.product, pending.payload)
          toast.success('Added to cart')
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [hydrateFromServer, initializeAuth, setAuthState])
}
