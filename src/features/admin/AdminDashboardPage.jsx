import {
  BadgePercent,
  ChartNoAxesCombined,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { SalesChart } from '../../components/admin/SalesChart'
import { StatsCard } from '../../components/admin/StatsCard'
import { Card } from '../../components/common/Card'
import { SectionTitle } from '../../components/common/SectionTitle'
import { USER_ROLES } from '../../lib/constants'
import { formatCompactNumber, formatCurrency } from '../../lib/utils'
import { adminService } from '../../services/adminService'
import { useAuthStore } from '../../store/authStore'

export function AdminDashboardPage() {
  const role = useAuthStore((state) => state.role)
  const isRetailer = role === USER_ROLES.RETAILER
  const [analytics, setAnalytics] = useState(null)

  const basePath = role === USER_ROLES.RETAILER ? '/retailer' : '/admin'

  useEffect(() => {
    let cancelled = false

    const loadAnalytics = async () => {
      try {
        const data = await adminService.fetchAnalytics()

        if (!cancelled) {
          setAnalytics(data)
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error.message)
        }
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

  const { overview, operations, revenueTrend, topProducts, topCategories } = analytics

  const title = isRetailer ? 'Retailer Operations Dashboard' : 'Admin Analytics'
  const subtitle = isRetailer
    ? 'Track fulfillment, inventory pressure, and sales movement.'
    : 'Revenue, sales, retention, and conversion intelligence'

  return (
    <div className="space-y-6">
      <SectionTitle
        action={
          <div className="flex gap-2">
            <Link
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
              to={`${basePath}/products`}
            >
              Manage Products
            </Link>
            <Link
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-100"
              to={`${basePath}/orders`}
            >
              Manage Orders
            </Link>
            {!isRetailer ? (
              <Link
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-100"
                to="/admin/users"
              >
                Manage Users
              </Link>
            ) : null}
          </div>
        }
        subtitle={subtitle}
        title={title}
      />

      {isRetailer ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              icon={TrendingUp}
              subtext="Monthly gross revenue"
              title="Revenue"
              value={formatCurrency(overview.revenue)}
            />
            <StatsCard
              icon={ShoppingBag}
              subtext="Orders processed this month"
              title="Monthly Sales"
              value={formatCompactNumber(overview.monthlySales)}
            />
            <StatsCard
              icon={ShoppingCart}
              subtext="Orders pending delivery"
              title="Open Orders"
              value={formatCompactNumber(operations?.openOrders || 0)}
            />
            <StatsCard
              icon={BadgePercent}
              subtext="Products at 10 units or below"
              title="Low Stock"
              value={formatCompactNumber(operations?.lowStockCount || 0)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              icon={ShoppingBag}
              subtext="Total active listings"
              title="Active Products"
              value={formatCompactNumber(operations?.activeProducts || 0)}
            />
            <StatsCard
              icon={ShoppingCart}
              subtext="Items currently unavailable"
              title="Out of Stock"
              value={formatCompactNumber(operations?.outOfStockCount || 0)}
            />
            <StatsCard
              icon={BadgePercent}
              subtext="Refund to order ratio"
              title="Refund Rate"
              value={`${overview.refundRate}%`}
            />
            <StatsCard
              icon={ChartNoAxesCombined}
              subtext="Carts not converted"
              title="Cart Abandonment"
              value={`${overview.cartAbandonment}%`}
            />
          </div>
        </>
      ) : (
        <>
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
        </>
      )}

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
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {isRetailer ? 'Category Demand Mix' : 'Top Categories'}
          </h3>
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
