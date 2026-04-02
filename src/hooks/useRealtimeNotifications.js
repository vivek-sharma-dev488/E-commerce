import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { notificationService } from '../services/notificationService'
import { useNotificationStore } from '../store/notificationStore'

export const useRealtimeNotifications = (userId) => {
  const pushNotification = useNotificationStore((state) => state.pushNotification)

  useEffect(() => {
    if (!userId) {
      return undefined
    }

    const subscription = notificationService.subscribeToNotifications(
      userId,
      (payload) => {
        const notification = payload.new

        if (!notification) {
          return
        }

        pushNotification(notification)
        toast(notification.title || 'New update received')
      },
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [userId, pushNotification])
}
