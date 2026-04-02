import { Card } from '../common/Card'

export function StatsCard({ title, value, subtext, icon: Icon }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {value}
          </h3>
          {subtext ? (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtext}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className="rounded-xl bg-brand-100 p-2 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </Card>
  )
}
