import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../../components/common/Button'
import { useAuthStore } from '../../store/authStore'
import { AuthShell } from './AuthShell'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})

export function ForgotPasswordPage() {
  const forgotPassword = useAuthStore((state) => state.forgotPassword)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values) => {
    const { error } = await forgotPassword(values.email)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Password reset link sent to your email')
  }

  return (
    <AuthShell
      subtitle="Enter your email and we will send a secure password reset link."
      title="Forgot password"
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Email
          </label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            placeholder="you@example.com"
            type="email"
            {...register('email')}
          />
          {errors.email ? <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p> : null}
        </div>

        <Button className="w-full" type="submit">
          Send reset link
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
