import { getSupabaseClient } from './supabaseClient'

const isEmailVerified = (user) => Boolean(user?.email_confirmed_at || user?.confirmed_at)

export const authService = {
  async getSession() {
    const supabase = getSupabaseClient()
    return supabase.auth.getSession()
  },

  async getUserRole(userId) {
    if (!userId) {
      return 'user'
    }

    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (error) {
      return 'user'
    }

    return data?.role || 'user'
  },

  async signUp({ email, password, fullName }) {
    const supabase = getSupabaseClient()

    return supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: fullName,
          role: 'user',
        },
      },
    })
  },

  async signUpRetailer({ email, password, fullName }) {
    const supabase = getSupabaseClient()

    return supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/retailer/login`,
        data: {
          full_name: fullName,
          role: 'retailer',
        },
      },
    })
  },

  async signIn({ email, password }) {
    const supabase = getSupabaseClient()

    return supabase.auth.signInWithPassword({ email, password })
  },

  async signInWithGoogle(redirectPath = '/') {
    const supabase = getSupabaseClient()
    const redirectTo = new URL(redirectPath, window.location.origin).toString()

    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })
  },

  async forgotPassword(email) {
    const supabase = getSupabaseClient()

    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
  },

  async resetPassword(password) {
    const supabase = getSupabaseClient()

    return supabase.auth.updateUser({ password })
  },

  async signOut(scope = 'local') {
    const supabase = getSupabaseClient()

    return supabase.auth.signOut({ scope })
  },

  onAuthChange(callback) {
    const supabase = getSupabaseClient()

    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session)
    })
  },

  isEmailVerified,
}
