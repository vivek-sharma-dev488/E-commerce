import { Minus, Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { Button } from '../common/Button'

export function CartItemRow({ item, onUpdateQuantity, onRemove, onToggleSave }) {
  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[100px_1fr_auto] md:items-center">
      <img
        alt={item.product.name}
        className="h-24 w-full rounded-xl object-cover"
        src={item.product.images[0]}
      />

      <div className="space-y-2">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {item.product.name}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-300">
          {item.selectedColor} | {item.selectedSize}
        </p>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {formatCurrency(item.product.price)} each
        </p>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700">
          <button
            className="p-2 text-slate-600 dark:text-slate-200"
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            type="button"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-10 text-center text-sm">{item.quantity}</span>
          <button
            className="p-2 text-slate-600 dark:text-slate-200"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            type="button"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {formatCurrency(item.product.price * item.quantity)}
        </p>

        <div className="flex items-center gap-2">
          <Button onClick={() => onToggleSave(item.id)} variant="ghost">
            {item.savedForLater ? 'Move to Cart' : 'Save for Later'}
          </Button>
          <Button onClick={() => onRemove(item.id)} variant="danger">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
