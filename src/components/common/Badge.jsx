import { cn } from '../../lib/cn'

const badgeClassMap = {
  bestseller: 'bg-amber-500/15 text-amber-700 dark:text-amber-200',
  best_selling: 'bg-amber-500/15 text-amber-700 dark:text-amber-200',
  trending: 'bg-sky-500/15 text-sky-700 dark:text-sky-200',
  limited_stock: 'bg-rose-500/15 text-rose-700 dark:text-rose-200',
  out_of_stock: 'bg-slate-500/15 text-slate-600 dark:text-slate-200',
  new: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200',
}

export function Badge({ className, label, type = 'new' }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
        badgeClassMap[type] || badgeClassMap.new,
        className,
      )}
    >
      {label || type.replaceAll('_', ' ')}
    </span>
  )
}
