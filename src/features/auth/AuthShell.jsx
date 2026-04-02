import { Link } from 'react-router-dom'

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="mx-auto grid min-h-[75vh] max-w-5xl items-center gap-8 md:grid-cols-2">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
          Northstar Commerce
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold text-slate-900 dark:text-white">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>

      <div className="hidden rounded-3xl border border-slate-200 bg-white/70 p-8 dark:border-slate-700 dark:bg-slate-900/70 md:block">
        <h2 className="font-heading text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Commerce engine for modern teams
        </h2>
        <ul className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <li>Realtime order updates and notification center</li>
          <li>Role-based user and admin access control</li>
          <li>Scalable Supabase-first architecture</li>
          <li>Optimized mobile and desktop checkout flows</li>
        </ul>
        <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
          Need admin access? <Link className="text-brand-600" to="/admin/login">Sign in here</Link>
        </p>
      </div>
    </div>
  )
}
