import {
  BadgePercent,
  ChartNoAxesCombined,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SalesChart } from '../../components/admin/SalesChart'
import { StatsCard } from '../../components/admin/StatsCard'
import { Card } from '../../components/common/Card'
import { SectionTitle } from '../../components/common/SectionTitle'
import { formatCompactNumber, formatCurrency } from '../../lib/utils'
import { adminService } from '../../services/adminService'

export function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadAnalytics = async () => {
      const data = await adminService.fetchAnalytics()

      if (!cancelled) {
        setAnalytics(data)
      }
    }

    loadAnalytics()

    return () => {
      cancelled = true
    }
  }, [])

  if (!analytics) {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
  }

  const { overview, revenueTrend, topProducts, topCategories } = analytics

  return (
    <div className="space-y-6">
      <SectionTitle
        action={
          <div className="flex gap-2">
            <Link
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
              to="/admin/products"
            >
              Manage Products
            </Link>
            <Link
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-100"
              to="/admin/orders"
            >
              Manage Orders
            </Link>
          </div>
        }
        subtitle="Revenue, sales, retention, and conversion intelligence"
        title="Admin Analytics"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          icon={TrendingUp}
          subtext="Monthly gross revenue"
          title="Revenue"
          value={formatCurrency(overview.revenue)}
        />
        <StatsCard
          icon={ShoppingCart}
          subtext="Orders processed today"
          title="Daily Sales"
          value={formatCompactNumber(overview.dailySales)}
        />
        <StatsCard
          icon={ShoppingBag}
          subtext="Orders processed this month"
          title="Monthly Sales"
          value={formatCompactNumber(overview.monthlySales)}
        />
        <StatsCard
          icon={Users}
          subtext="% returning customers"
          title="Repeat Customers"
          value={`${overview.repeatCustomers}%`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          icon={ChartNoAxesCombined}
          subtext="Sessions to purchase"
          title="Conversion Rate"
          value={`${overview.conversionRate}%`}
        />
        <StatsCard
          icon={BadgePercent}
          subtext="Carts not converted"
          title="Cart Abandonment"
          value={`${overview.cartAbandonment}%`}
        />
        <StatsCard
          icon={BadgePercent}
          subtext="Refund to order ratio"
          title="Refund Rate"
          value={`${overview.refundRate}%`}
        />
        <StatsCard
          icon={Users}
          subtext="Active cohort health"
          title="User Retention"
          value={`${overview.userRetention}%`}
        />
      </div>

      <SalesChart data={revenueTrend} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-5">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Top Products</h3>
          {topProducts.map((product) => (
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800" key={product.name}>
              <p className="text-sm text-slate-700 dark:text-slate-200">{product.name}</p>
              <p className="text-sm font-semibold text-brand-600">
                {formatCompactNumber(product.sales)} sold
              </p>
            </div>
          ))}
        </Card>

        <Card className="space-y-3 p-5">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Top Categories</h3>
          {topCategories.map((category) => (
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800" key={category.name}>
              <p className="text-sm text-slate-700 dark:text-slate-200">{category.name}</p>
              <p className="text-sm font-semibold text-brand-600">{category.value}% share</p>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
