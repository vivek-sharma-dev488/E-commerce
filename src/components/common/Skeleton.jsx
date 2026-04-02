import { cn } from '../../lib/cn'

export function Skeleton({ className }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800',
        className,
      )}
      aria-hidden="true"
    />
  )
}
