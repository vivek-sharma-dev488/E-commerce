import { cn } from '../../lib/cn'

const baseClassName =
  'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-60'

const variants = {
  primary:
    'bg-brand-600 text-white shadow hover:bg-brand-700 focus-visible:ring-brand-500',
  secondary:
    'bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white focus-visible:ring-slate-500',
  outline:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 focus-visible:ring-brand-500',
  ghost:
    'text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800 focus-visible:ring-brand-500',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500',
}

export function Button({ className, variant = 'primary', ...props }) {
  return (
    <button
      className={cn(baseClassName, variants[variant] || variants.primary, className)}
      {...props}
    />
  )
}
