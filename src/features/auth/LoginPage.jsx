import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../../components/common/Button'
import { useAuthStore } from '../../store/authStore'
import { AuthShell } from './AuthShell'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must have at least 6 characters'),
})

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const signIn = useAuthStore((state) => state.signIn)
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle)
  const isLoading = useAuthStore((state) => state.isLoading)

  const fallbackRedirect =
    location.pathname === '/admin/login'
      ? '/admin'
      : location.pathname === '/retailer/login'
        ? '/retailer'
        : '/'

  const isRetailerLogin = location.pathname === '/retailer/login'
  const signupPath = isRetailerLogin ? '/retailer/signup' : '/signup'
  const signupLabel = isRetailerLogin ? 'Create retailer account' : 'Create account'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values) => {
    const { error } = await signIn(values)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Welcome back')
    navigate(location.state?.from?.pathname || fallbackRedirect)
  }

  const handleGoogleSignIn = async () => {
    const redirectTarget = location.state?.from?.pathname || fallbackRedirect
    const { error } = await signInWithGoogle(redirectTarget)

    if (error) {
      toast.error(error.message)
    }
  }

  return (
    <AuthShell
      subtitle="Sign in to manage orders, rewards, addresses, wishlist, and cart sync."
      title="Welcome back"
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

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Password
          </label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            placeholder="Enter password"
            type="password"
            {...register('password')}
          />
          {errors.password ? (
            <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>
          ) : null}
        </div>

        <Button className="w-full" disabled={isLoading} type="submit">
          {isLoading ? 'Signing in...' : 'Login'}
        </Button>

        <Button className="w-full" onClick={handleGoogleSignIn} type="button" variant="outline">
          Continue with Google
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Link className="text-brand-600" to="/forgot-password">
            Forgot password?
          </Link>
          <Link className="text-brand-600" to={signupPath}>
            {signupLabel}
          </Link>
        </div>
      </form>
    </AuthShell>
  )
}
