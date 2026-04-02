import { BellDot } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { SectionTitle } from '../../components/common/SectionTitle'
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications'
import { formatDate } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'

export function NotificationsPage() {
  const user = useAuthStore((state) => state.user)

  const notifications = useNotificationStore((state) => state.notifications)
  const loadNotifications = useNotificationStore((state) => state.loadNotifications)
  const markAsRead = useNotificationStore((state) => state.markAsRead)
  const markAllRead = useNotificationStore((state) => state.markAllRead)
  const unreadCount = useNotificationStore((state) => state.getUnreadCount())

  useRealtimeNotifications(user?.id)

  useEffect(() => {
    if (user?.id) {
      loadNotifications(user.id)
    }
  }, [user?.id, loadNotifications])

  if (!notifications.length) {
    return (
      <EmptyState
        description="Realtime notifications will appear here for order updates, stock alerts, coupons, and refunds."
        title="No notifications yet"
      />
    )
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        action={
          <Button onClick={markAllRead} variant="outline">
            Mark all as read
          </Button>
        }
        subtitle={`${unreadCount} unread updates`}
        title="Notifications"
      />

      <div className="space-y-3">
        {notifications.map((notification) => {
          const isRead = notification.isRead || notification.is_read

          return (
            <Card
              className={`border-l-4 p-4 ${
                isRead ? 'border-l-slate-300' : 'border-l-brand-600'
              }`}
              key={notification.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <BellDot className="mt-1 h-4 w-4 text-brand-600" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {notification.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {notification.body}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatDate(notification.createdAt || notification.created_at, 'DD MMM YYYY, hh:mm A')}
                    </p>
                  </div>
                </div>
                {!isRead ? (
                  <Button onClick={() => markAsRead(notification.id)} variant="ghost">
                    Mark read
                  </Button>
                ) : null}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
