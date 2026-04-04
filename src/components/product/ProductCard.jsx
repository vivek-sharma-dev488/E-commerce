import { Heart, ShoppingCart, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { setPendingAddToCart } from '../../lib/pendingAddToCart'
import { calculateDiscount, formatCurrency } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { useWishlistStore } from '../../store/wishlistStore'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'
import { Card } from '../common/Card'

export function ProductCard({ product }) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const isLoading = useAuthStore((state) => state.isLoading)
  const addToCart = useCartStore((state) => state.addToCart)
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist)
  const hasItem = useWishlistStore((state) => state.hasItem)

  const discount = calculateDiscount(product.price, product.compareAtPrice)
  const isWishlisted = hasItem(product.id)

  const handleAddToCart = () => {
    if (!isInitialized || isLoading) {
      toast('Please wait...')
      return
    }

    if (!user) {
      setPendingAddToCart(product)
      toast.error('Please login to add items to cart')
      navigate('/login', { state: { from: location } })
      return
    }

    addToCart(product)
    toast.success('Added to cart')
  }

  return (
    <Card className="group overflow-hidden p-0">
      <div className="relative">
        <Link to={`/product/${product.slug}`}>
          <img
            alt={product.name}
            className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
            src={product.images[0]}
          />
        </Link>

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {product.badges?.slice(0, 2).map((badge) => (
            <Badge key={badge} type={badge} />
          ))}
        </div>

        <button
          aria-label="Toggle wishlist"
          className="absolute right-3 top-3 rounded-full bg-white/85 p-2 text-slate-700 shadow hover:bg-white dark:bg-slate-900/80 dark:text-slate-100"
          onClick={() => toggleWishlist(product)}
          type="button"
        >
          <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current text-rose-600' : ''}`} />
        </button>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {product.brand}
          </p>
          <Link to={`/product/${product.slug}`}>
            <h3 className="mt-1 line-clamp-2 text-base font-semibold text-slate-900 transition group-hover:text-brand-600 dark:text-slate-100">
              {product.name}
            </h3>
          </Link>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
            <Star className="h-3.5 w-3.5 fill-current" />
            {product.rating}
          </span>
          <span>({product.reviewCount}) reviews</span>
        </div>

        <div className="flex items-baseline gap-2">
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(product.price)}
          </p>
          {product.compareAtPrice ? (
            <p className="text-sm text-slate-400 line-through">
              {formatCurrency(product.compareAtPrice)}
            </p>
          ) : null}
          {discount > 0 ? (
            <span className="text-sm font-semibold text-emerald-600">{discount}% off</span>
          ) : null}
        </div>

        <Button
          className="w-full"
          disabled={product.stock <= 0}
          onClick={handleAddToCart}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
        </Button>
      </div>
    </Card>
  )
}
