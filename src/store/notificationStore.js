import { create } from 'zustand'
import { notificationService } from '../services/notificationService'

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  isLoading: false,

  getUnreadCount: () =>
    get().notifications.filter((notification) => !notification.isRead && !notification.is_read)
      .length,

  loadNotifications: async (userId) => {
    set({ isLoading: true })
    const data = await notificationService.fetchNotifications(userId)
    set({ notifications: data, isLoading: false })
  },

  markAsRead: async (notificationId) => {
    await notificationService.markAsRead(notificationId)

    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              isRead: true,
              is_read: true,
            }
          : notification,
      ),
    }))
  },

  pushNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        isRead: true,
        is_read: true,
      })),
    })),
}))
