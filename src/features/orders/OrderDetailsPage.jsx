import { Clock3, Download, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useParams } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { SectionTitle } from '../../components/common/SectionTitle'
import { ORDER_STATUSES } from '../../lib/constants'
import { formatCurrency, formatDate } from '../../lib/utils'
import { orderService } from '../../services/orderService'

const statusLabelMap = {
  ordered: 'Ordered',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export function OrderDetailsPage() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadOrder = async () => {
      const data = await orderService.fetchOrderById(orderId)

      if (!cancelled) {
        setOrder(data)
      }
    }

    loadOrder()

    const subscription = orderService.subscribeToOrder(orderId, (updatedOrder) => {
      setOrder((state) => ({ ...state, ...updatedOrder }))
      toast.success('Live order tracking updated')
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [orderId])

  const currentStatus = order?.currentStatus || order?.status || 'ordered'
  const currentStatusIndex = ORDER_STATUSES.indexOf(currentStatus)

  const returnEligibilityText = useMemo(() => {
    if (!order?.returnEligibleTill && !order?.return_eligible_till) {
      return 'Not available'
    }

    const eligibleDate = new Date(order.returnEligibleTill || order.return_eligible_till)
    const now = new Date()

    if (eligibleDate <= now) {
      return 'Return window closed'
    }

    const diffMs = eligibleDate.getTime() - now.getTime()
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return `${days} day(s) left for return eligibility`
  }, [order])

  if (!order) {
    return <EmptyState title="Order not found" />
  }

  return (
    <div className="space-y-6">
      <SectionTitle subtitle="Realtime tracking with Supabase channels" title={`Order #${order.id}`} />

      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Placed On</p>
            <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">
              {formatDate(order.createdAt || order.created_at)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total</p>
            <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(order.total || order.total_amount)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Return Window</p>
            <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">
              {returnEligibilityText}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="mb-3 flex items-center gap-2">
            <Truck className="h-4 w-4 text-brand-600" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Order Timeline</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {ORDER_STATUSES.map((status, index) => (
              <div
                className={`rounded-lg border px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.15em] ${
                  index <= currentStatusIndex
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-300'
                }`}
                key={status}
              >
                {statusLabelMap[status]}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Current status: <span className="font-semibold">{statusLabelMap[currentStatus]}</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="mb-2 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-brand-600" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Shipping Address</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {order.shippingAddress || order.shipping_address?.line1 || 'Address unavailable'}
          </p>
        </div>

        <Button onClick={() => window.open(order.invoiceUrl || '#', '_blank')} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Invoice
        </Button>
      </Card>
    </div>
  )
}
