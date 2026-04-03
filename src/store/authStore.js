import { create } from 'zustand'
import { USER_ROLES } from '../lib/constants'
import { authService } from '../services/authService'

const deriveRole = (user, role) => {
  if (role) {
    return role
  }

  return user?.user_metadata?.role || USER_ROLES.USER
}

export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  role: USER_ROLES.USER,
  isInitialized: false,
  isLoading: false,
  authError: null,

  setAuthState: ({ session, user, role }) => {
    set({
      session,
      user,
      role: deriveRole(user, role),
      authError: null,
    })
  },

  initializeAuth: async () => {
    if (get().isInitialized) {
      return
    }

    set({ isLoading: true })

    const { data } = await authService.getSession()
    const session = data?.session || null
    const user = session?.user || null

    if (user && !authService.isEmailVerified(user)) {
      await authService.signOut('local')

      set({
        session: null,
        user: null,
        role: USER_ROLES.USER,
        isInitialized: true,
        isLoading: false,
        authError: null,
      })

      return
    }

    const role = user ? await authService.getUserRole(user.id) : USER_ROLES.USER

    set({
      session,
      user,
      role: deriveRole(user, role),
      isInitialized: true,
      isLoading: false,
      authError: null,
    })
  },

  signUp: async (payload) => {
    set({ isLoading: true, authError: null })
    const { data, error } = await authService.signUp(payload)

    if (error) {
      set({ isLoading: false, authError: error.message })
      return { data: null, error }
    }

    // Keep new users signed out until their email is verified.
    if (data?.session) {
      await authService.signOut('local')
    }

    set({
      session: null,
      user: null,
      role: USER_ROLES.USER,
      isLoading: false,
    })

    return { data, error: null }
  },

  signUpRetailer: async (payload) => {
    set({ isLoading: true, authError: null })
    const { data, error } = await authService.signUpRetailer(payload)

    if (error) {
      set({ isLoading: false, authError: error.message })
      return { data: null, error }
    }

    // Keep new users signed out until their email is verified.
    if (data?.session) {
      await authService.signOut('local')
    }

    set({
      session: null,
      user: null,
      role: USER_ROLES.USER,
      isLoading: false,
    })

    return { data, error: null }
  },

  signIn: async (payload) => {
    set({ isLoading: true, authError: null })
    const { data, error } = await authService.signIn(payload)

    if (error) {
      set({ isLoading: false, authError: error.message })
      return { data: null, error }
    }

    if (!authService.isEmailVerified(data?.user)) {
      await authService.signOut('local')

      const verificationError = new Error(
        'Please verify your email before logging in. Check your inbox for the confirmation link.',
      )

      set({
        session: null,
        user: null,
        role: USER_ROLES.USER,
        isLoading: false,
        authError: verificationError.message,
      })

      return { data: null, error: verificationError }
    }

    const role = await authService.getUserRole(data?.user?.id)

    set({
      session: data?.session || null,
      user: data?.user || null,
      role: deriveRole(data?.user, role),
      isLoading: false,
    })

    return { data, error: null }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, authError: null })
    const { data, error } = await authService.signInWithGoogle()

    if (error) {
      set({ isLoading: false, authError: error.message })
      return { data: null, error }
    }

    if (data?.session) {
      set({
        session: data.session,
        user: data.user,
        role: deriveRole(data.user, null),
      })
    }

    set({ isLoading: false })
    return { data, error: null }
  },

  forgotPassword: async (email) => authService.forgotPassword(email),

  resetPassword: async (password) => authService.resetPassword(password),

  signOut: async () => {
    await authService.signOut('local')
    set({
      session: null,
      user: null,
      role: USER_ROLES.USER,
      authError: null,
    })
  },

  signOutAllDevices: async () => {
    await authService.signOut('global')
    set({
      session: null,
      user: null,
      role: USER_ROLES.USER,
      authError: null,
    })
  },
}))
