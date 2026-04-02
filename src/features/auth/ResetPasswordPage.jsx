import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../../components/common/Button'
import { useAuthStore } from '../../store/authStore'
import { AuthShell } from './AuthShell'

const schema = z
  .object({
    password: z.string().min(6, 'Password should have at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm your password'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const resetPassword = useAuthStore((state) => state.resetPassword)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values) => {
    const { error } = await resetPassword(values.password)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Password updated successfully')
    navigate('/login')
  }

  return (
    <AuthShell
      subtitle="Choose a secure new password for your account."
      title="Reset password"
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            New password
          </label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            type="password"
            {...register('password')}
          />
          {errors.password ? (
            <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Confirm password
          </label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            type="password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? (
            <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword.message}</p>
          ) : null}
        </div>

        <Button className="w-full" type="submit">
          Update password
        </Button>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          Back to{' '}
          <Link className="text-brand-600" to="/login">
            login
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
