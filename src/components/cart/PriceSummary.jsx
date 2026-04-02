import { formatCurrency } from '../../lib/utils'
import { Button } from '../common/Button'
import { Card } from '../common/Card'

export function PriceSummary({ summary, onCheckout }) {
  return (
    <Card className="space-y-4 p-5">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Order Summary</h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-slate-600 dark:text-slate-300">
          <span>Subtotal</span>
          <span>{formatCurrency(summary.subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-600 dark:text-slate-300">
          <span>Shipping</span>
          <span>{summary.shipping > 0 ? formatCurrency(summary.shipping) : 'Free'}</span>
        </div>
        <div className="flex justify-between text-slate-600 dark:text-slate-300">
          <span>Tax</span>
          <span>{formatCurrency(summary.tax)}</span>
        </div>
        <div className="flex justify-between text-emerald-600">
          <span>Discount</span>
          <span>-{formatCurrency(summary.couponDiscount)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-lg font-semibold dark:border-slate-700">
        <span>Total</span>
        <span>{formatCurrency(summary.total)}</span>
      </div>

      <Button className="w-full" disabled={summary.total <= 0} onClick={onCheckout}>
        Proceed to Checkout
      </Button>
    </Card>
  )
}
