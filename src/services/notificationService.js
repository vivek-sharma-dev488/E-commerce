import { getSupabaseClient } from './supabaseClient'

export const notificationService = {
  async fetchNotifications(userId) {
    if (!userId) {
      return []
    }

    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  },

  async markAsRead(notificationId) {
    const supabase = getSupabaseClient()

    return supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
  },

  subscribeToNotifications(userId, onEvent) {
    if (!userId) {
      return {
        unsubscribe: () => {},
      }
    }

    const supabase = getSupabaseClient()

    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onEvent(payload)
        },
      )
      .subscribe()

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel)
      },
    }
  },
}
