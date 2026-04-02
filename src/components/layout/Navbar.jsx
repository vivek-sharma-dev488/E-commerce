import { useEffect, useState } from 'react'
import {
  Heart,
  LayoutDashboard,
  LogOut,
  MoonStar,
  Search,
  ShoppingCart,
  SunMedium,
  UserCircle,
} from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { APP_NAME, USER_ROLES } from '../../lib/constants'
import { productService } from '../../services/productService'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { useCatalogStore } from '../../store/catalogStore'
import { useWishlistStore } from '../../store/wishlistStore'
import { Button } from '../common/Button'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Catalog', to: '/catalog' },
  { label: 'Flash Sale', to: '/catalog?sortBy=best_selling' },
  { label: 'My Orders', to: '/orders' },
]

export function Navbar({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const role = useAuthStore((state) => state.role)
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const cartCount = useCartStore((state) => state.getCartItems().length)
  const wishlistCount = useWishlistStore((state) => state.items.length)
  const setFilter = useCatalogStore((state) => state.setFilter)

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    let cancelled = false

    const loadSuggestions = async () => {
      if (query.trim().length <= 1) {
        if (!cancelled) {
          setSuggestions([])
        }
        return
      }

      const data = await productService.searchSuggestions(query)

      if (!cancelled) {
        setSuggestions(data)
      }
    }

    loadSuggestions()

    return () => {
      cancelled = true
    }
  }, [query])

  const onSearchSubmit = (event) => {
    event.preventDefault()
    setFilter('query', query)
    navigate('/catalog')
    setSuggestions([])
  }

  const handleSuggestionClick = (slug) => {
    setQuery('')
    setSuggestions([])
    navigate(`/product/${slug}`)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-950/75">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 md:px-6">
        <Link className="shrink-0" to="/">
          <p className="font-heading text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {APP_NAME}
          </p>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-600">Commerce OS</p>
        </Link>

        <form className="relative hidden flex-1 md:block" onSubmit={onSearchSubmit}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-700 outline-none ring-brand-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Search products, brands, categories"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          {suggestions.length ? (
            <div className="absolute mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900">
              {suggestions.map((suggestion) => (
                <button
                  className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 last:border-none dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800"
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion.slug)}
                  type="button"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          ) : null}
        </form>

        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm font-medium ${
                  isActive
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`
              }
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={toggleTheme}
            type="button"
          >
            {theme === 'dark' ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
          </button>

          <Link
            className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            to="/wishlist"
          >
            <Heart className="h-5 w-5" />
            {wishlistCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">
                {wishlistCount}
              </span>
            ) : null}
          </Link>

          <Link
            className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            to="/cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">
                {cartCount}
              </span>
            ) : null}
          </Link>

          {role === USER_ROLES.ADMIN ? (
            <Link
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              to="/admin"
            >
              <LayoutDashboard className="h-5 w-5" />
            </Link>
          ) : null}

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                to="/addresses"
                title="Profile"
              >
                <UserCircle className="h-5 w-5" />
              </Link>
              <Button className="px-3 py-2" onClick={handleSignOut} variant="outline">
                <LogOut className="mr-1 h-4 w-4" />
                Logout
              </Button>
            </div>
          ) : (
            <Button className="hidden md:inline-flex" onClick={() => navigate('/login')}>
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
