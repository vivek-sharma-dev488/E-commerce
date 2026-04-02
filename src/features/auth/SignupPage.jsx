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
    fullName: z.string().min(2, 'Enter your name'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Password should have at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm your password'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export function SignupPage() {
  const navigate = useNavigate()
  const signUp = useAuthStore((state) => state.signUp)
  const isLoading = useAuthStore((state) => state.isLoading)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values) => {
    const { error } = await signUp(values)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Signup successful. Verify your email to continue.')
    navigate('/')
  }

  return (
    <AuthShell
      subtitle="Create your account to unlock loyalty points, personalized recommendations, and faster checkout."
      title="Create account"
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Full name
          </label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            placeholder="Vivek Gaur"
            type="text"
            {...register('fullName')}
          />
          {errors.fullName ? (
            <p className="mt-1 text-xs text-rose-600">{errors.fullName.message}</p>
          ) : null}
        </div>

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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Password
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
        </div>

        <Button className="w-full" disabled={isLoading} type="submit">
          {isLoading ? 'Creating...' : 'Create account'}
        </Button>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          Already have an account?{' '}
          <Link className="text-brand-600" to="/login">
            Login
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
