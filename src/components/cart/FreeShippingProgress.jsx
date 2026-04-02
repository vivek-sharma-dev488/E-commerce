import { FREE_SHIPPING_THRESHOLD } from '../../lib/constants'
import { formatCurrency } from '../../lib/utils'

export function FreeShippingProgress({ subtotal }) {
  const percentage = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100))
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
        <span>Free shipping progress</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
        {remaining > 0
          ? `Add ${formatCurrency(remaining)} more to unlock free shipping.`
          : 'You have unlocked free shipping.'}
      </p>
    </div>
  )
}
