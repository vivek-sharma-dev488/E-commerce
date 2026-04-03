import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { SectionTitle } from '../../components/common/SectionTitle'
import { USER_ROLES } from '../../lib/constants'
import { adminService } from '../../services/adminService'

export function UsersManagementPage() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    let cancelled = false

    const loadUsers = async () => {
      const data = await adminService.fetchUsers()

      if (!cancelled) {
        setUsers(data)
      }
    }

    loadUsers()

    return () => {
      cancelled = true
    }
  }, [])

  const updateRole = async (userId, nextRole) => {
    const previousUser = users.find((user) => user.id === userId)
    const previousRole = previousUser?.role

    setUsers((state) =>
      state.map((user) =>
        user.id === userId
          ? {
              ...user,
              role: nextRole,
            }
          : user,
      ),
    )

    try {
      await adminService.updateUserRole(userId, nextRole)
      toast.success('User role updated')
    } catch (error) {
      setUsers((state) =>
        state.map((user) =>
          user.id === userId
            ? {
                ...user,
                role: previousRole,
              }
            : user,
        ),
      )

      toast.error(error.message)
    }
  }

  const grantLoyaltyBonus = async (userId) => {
    const previousUser = users.find((user) => user.id === userId)
    const previousPoints = Number(previousUser?.loyalty_points || 0)
    const nextPoints = previousPoints + 100

    setUsers((state) =>
      state.map((user) =>
        user.id === userId
          ? {
              ...user,
              loyalty_points: nextPoints,
            }
          : user,
      ),
    )

    try {
      await adminService.updateUserLoyaltyPoints(userId, nextPoints)
      toast.success('Loyalty bonus granted')
    } catch (error) {
      setUsers((state) =>
        state.map((user) =>
          user.id === userId
            ? {
                ...user,
                loyalty_points: previousPoints,
              }
            : user,
        ),
      )

      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-5">
      <SectionTitle subtitle="Role control and customer health" title="User Management" />

      {users.map((user) => (
        <Card className="space-y-3 p-4" key={user.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{user.email}</p>
              <p className="text-xs text-slate-500">ID: {user.id}</p>
            </div>
            <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
              {user.role}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              onChange={(event) => updateRole(user.id, event.target.value)}
              value={user.role}
            >
              <option value={USER_ROLES.USER}>user</option>
              <option value={USER_ROLES.ADMIN}>admin</option>
              <option value={USER_ROLES.RETAILER}>retailer</option>
            </select>
            <Button onClick={() => grantLoyaltyBonus(user.id)} variant="outline">
              +100 Loyalty Points
            </Button>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300">
            Loyalty points: <span className="font-semibold">{user.loyalty_points || 0}</span>
          </p>
        </Card>
      ))}
    </div>
  )
}
