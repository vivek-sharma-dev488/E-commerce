import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { SectionTitle } from '../../components/common/SectionTitle'
import { ORDER_STATUSES } from '../../lib/constants'
import { formatCurrency, formatDate } from '../../lib/utils'
import { adminService } from '../../services/adminService'
import { orderService } from '../../services/orderService'
import { useAuthStore } from '../../store/authStore'

export function OrdersManagementPage() {
  const user = useAuthStore((state) => state.user)
  const [orders, setOrders] = useState([])

  useEffect(() => {
    let cancelled = false

    const loadOrders = async () => {
      const data = await adminService.fetchOrders()

      if (!cancelled) {
        setOrders(data)
      }
    }

    loadOrders()

    return () => {
      cancelled = true
    }
  }, [])

  const updateStatus = async (orderId, status) => {
    const { error } = await orderService.updateOrderStatus(orderId, status)

    if (error) {
      toast.error(error.message)
      return
    }

    setOrders((state) =>
      state.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status,
              currentStatus: status,
            }
          : order,
      ),
    )

    toast.success('Order status updated')
  }

  const handleRefund = async (orderId) => {
    const { error } = await orderService.requestRefund(
      orderId,
      'Admin initiated refund',
      user?.id,
    )

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Refund request logged')
  }

  const handleReplacement = async (orderId) => {
    const { error } = await orderService.requestReplacement(
      orderId,
      'Admin initiated replacement',
      user?.id,
    )

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Replacement request logged')
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        subtitle="Order status, refunds, and replacement workflows"
        title="Order Operations"
      />

      {orders.map((order) => (
        <Card className="space-y-3 p-4" key={order.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Order #{order.id}</h3>
              <p className="text-sm text-slate-500">{formatDate(order.createdAt || order.created_at)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Total</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(order.total || order.total_amount)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              onChange={(event) => updateStatus(order.id, event.target.value)}
              value={order.currentStatus || order.status}
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll('_', ' ')}
                </option>
              ))}
              <option value="cancelled">cancelled</option>
            </select>
            <Button onClick={() => handleRefund(order.id)} variant="outline">
              Refund
            </Button>
            <Button onClick={() => handleReplacement(order.id)} variant="outline">
              Replacement
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
