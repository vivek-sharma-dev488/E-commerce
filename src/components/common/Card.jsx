import { cn } from '../../lib/cn'

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-soft backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/70',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
