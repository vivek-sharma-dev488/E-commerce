import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { SectionTitle } from '../../components/common/SectionTitle'
import { formatCurrency, formatDate } from '../../lib/utils'
import { orderService } from '../../services/orderService'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'

export function MyOrdersPage() {
  const user = useAuthStore((state) => state.user)
  const addToCart = useCartStore((state) => state.addToCart)
  const [orders, setOrders] = useState([])

  useEffect(() => {
    let cancelled = false

    const loadOrders = async () => {
      const data = await orderService.fetchOrders(user?.id)

      if (!cancelled) {
        setOrders(data)
      }
    }

    loadOrders()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const handleCancelOrder = async (orderId) => {
    const { error } = await orderService.updateOrderStatus(orderId, 'cancelled')

    if (error) {
      toast.error(error.message)
      return
    }

    setOrders((state) =>
      state.map((order) =>
        order.id === orderId
          ? {
              ...order,
              currentStatus: 'cancelled',
            }
          : order,
      ),
    )

    toast.success('Order cancellation requested')
  }

  const handleRefundRequest = async (orderId) => {
    const { error } = await orderService.requestRefund(
      orderId,
      'Item did not match expectations',
      user?.id,
    )

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Refund request submitted')
  }

  const handleReplacementRequest = async (orderId) => {
    const { error } = await orderService.requestReplacement(
      orderId,
      'Need size replacement',
      user?.id,
    )

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Replacement request submitted')
  }

  const handleReorder = async (order) => {
    const reorderItems = await orderService.reorder(order)

    reorderItems.forEach((item) => addToCart(item.product, item))

    toast.success('Items added to cart')
  }

  if (!orders.length) {
    return (
      <EmptyState
        description="No orders yet. Place your first order from the catalog."
        title="No order history"
      />
    )
  }

  return (
    <div className="space-y-5">
      <SectionTitle subtitle="Track, manage, and reorder" title="My Orders" />

      {orders.map((order) => (
        <Card className="space-y-4" key={order.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Order #{order.id}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Placed on {formatDate(order.createdAt || order.created_at)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Status</p>
              <p className="font-semibold capitalize text-brand-600">
                {(order.currentStatus || order.status || '').replaceAll('_', ' ')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleReorder(order)} variant="outline">
              Reorder
            </Button>
            <Button onClick={() => handleCancelOrder(order.id)} variant="outline">
              Cancel
            </Button>
            <Button onClick={() => handleReplacementRequest(order.id)} variant="outline">
              Replacement Request
            </Button>
            <Button onClick={() => handleRefundRequest(order.id)} variant="outline">
              Refund Request
            </Button>
            <Button onClick={() => window.open(order.invoiceUrl || '#', '_blank')} variant="ghost">
              Download Invoice
            </Button>
            <Link
              className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
              to={`/orders/${order.id}`}
            >
              View Details
            </Link>
          </div>

          <div className="text-sm text-slate-600 dark:text-slate-300">
            <p>
              Total: <span className="font-semibold">{formatCurrency(order.total || order.total_amount)}</span>
            </p>
            <p className="mt-1">Shipping to: {order.shippingAddress || order.shipping_address?.line1}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}
