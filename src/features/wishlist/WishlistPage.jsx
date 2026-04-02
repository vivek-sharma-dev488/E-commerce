import { useEffect, useState } from 'react'
import { Gift, HeartHandshake } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { SectionTitle } from '../../components/common/SectionTitle'
import { ProductCard } from '../../components/product/ProductCard'
import { productService } from '../../services/productService'
import { useCartStore } from '../../store/cartStore'
import { useWishlistStore } from '../../store/wishlistStore'

export function WishlistPage() {
  const wishlistItems = useWishlistStore((state) => state.items)
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist)
  const addToCart = useCartStore((state) => state.addToCart)
  const [customersAlsoBought, setCustomersAlsoBought] = useState([])

  useEffect(() => {
    let cancelled = false

    const loadRecommendations = async () => {
      const wishlistSet = new Set(wishlistItems.map((item) => item.id))
      const seedProductId = wishlistItems[0]?.id

      try {
        const recommendationSource = seedProductId
          ? await productService.fetchFrequentlyBoughtTogether(seedProductId)
          : await productService.fetchProducts({ sortBy: 'best_selling' })

        if (!cancelled) {
          setCustomersAlsoBought(
            recommendationSource
              .filter((item) => !wishlistSet.has(item.id))
              .slice(0, 4),
          )
        }
      } catch {
        if (!cancelled) {
          setCustomersAlsoBought([])
        }
      }
    }

    loadRecommendations()

    return () => {
      cancelled = true
    }
  }, [wishlistItems])

  const copyReferralCode = async () => {
    await navigator.clipboard.writeText('VIVEK-REFER-15')
    toast.success('Referral code copied')
  }

  if (!wishlistItems.length) {
    return (
      <EmptyState
        action={
          <Link className="inline-flex rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white" to="/catalog">
            Browse Catalog
          </Link>
        }
        description="Save products to compare and buy later."
        title="Wishlist is empty"
      />
    )
  }

  return (
    <div className="space-y-8">
      <SectionTitle subtitle="Your saved favourites" title="Wishlist" />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex items-start gap-3 p-4">
          <Gift className="mt-1 h-5 w-5 text-brand-600" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Referral Rewards</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Share your code and both users get 15% off up to Rs. 500.
            </p>
            <Button className="mt-3" onClick={copyReferralCode} variant="outline">
              Copy referral code: VIVEK-REFER-15
            </Button>
          </div>
        </Card>

        <Card className="flex items-start gap-3 p-4">
          <HeartHandshake className="mt-1 h-5 w-5 text-brand-600" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Loyalty Points</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              You currently have 280 points. Earn 1 point for every Rs. 100 spent.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {wishlistItems.map((item) => (
          <div className="relative" key={item.id}>
            <ProductCard product={item} />
            <div className="absolute inset-x-3 bottom-3 flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  addToCart(item)
                  toast.success('Added to cart')
                }}
                type="button"
              >
                Add to Cart
              </Button>
              <Button onClick={() => toggleWishlist(item)} type="button" variant="outline">
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      <section>
        <SectionTitle subtitle="People with similar tastes" title="Customers Also Bought" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {customersAlsoBought.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  )
}
