import { PackageSearch } from 'lucide-react'

export function EmptyState({
  title = 'Nothing to show yet',
  description = 'Try adjusting filters or adding new data.',
  action,
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <PackageSearch className="mx-auto h-10 w-10 text-slate-400" />
      <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
