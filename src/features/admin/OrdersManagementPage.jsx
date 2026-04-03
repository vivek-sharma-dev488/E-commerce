import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Card } from '../../components/common/Card'
import { SectionTitle } from '../../components/common/SectionTitle'
import { ORDER_STATUSES, USER_ROLES } from '../../lib/constants'
import { formatCurrency, formatDate } from '../../lib/utils'
import { adminService } from '../../services/adminService'
import { orderService } from '../../services/orderService'
import { useAuthStore } from '../../store/authStore'

export function OrdersManagementPage() {
  const role = useAuthStore((state) => state.role)
  const isRetailer = role === USER_ROLES.RETAILER
  const [orders, setOrders] = useState([])

  useEffect(() => {
    let cancelled = false

    const loadOrders = async () => {
      try {
        const data = await adminService.fetchOrders()

        if (!cancelled) {
          setOrders(data)
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error.message)
        }
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

  const title = isRetailer ? 'Order Fulfillment Console' : 'Order Operations'
  const subtitle = isRetailer
    ? 'Process order pipelines and keep dispatch status accurate.'
    : 'Manage order lifecycle and shipment status across the platform.'

  return (
    <div className="space-y-5">
      <SectionTitle subtitle={subtitle} title={title} />

      {!orders.length ? (
        <Card className="p-5">
          <p className="text-sm text-slate-500">No orders available right now.</p>
        </Card>
      ) : null}

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
              <p className="text-xs text-slate-500">Payment: {order.payment_status || 'pending'}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-1">
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
          </div>
        </Card>
      ))}
    </div>
  )
}
