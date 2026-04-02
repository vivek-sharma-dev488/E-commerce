import { Heart, Share2, ShoppingBag, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../../components/common/Badge'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { SectionTitle } from '../../components/common/SectionTitle'
import { ProductCard } from '../../components/product/ProductCard'
import { ProductGallery } from '../../components/product/ProductGallery'
import { formatCurrency, formatDate, getDeliveryEstimate } from '../../lib/utils'
import { productService } from '../../services/productService'
import { useCartStore } from '../../store/cartStore'
import { useCatalogStore } from '../../store/catalogStore'
import { useWishlistStore } from '../../store/wishlistStore'

export function ProductDetailsPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const addToCart = useCartStore((state) => state.addToCart)
  const addRecentlyViewed = useCatalogStore((state) => state.addRecentlyViewed)
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist)
  const hasItem = useWishlistStore((state) => state.hasItem)

  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [recommendedProducts, setRecommendedProducts] = useState([])
  const [frequentlyBoughtProducts, setFrequentlyBoughtProducts] = useState([])
  const [productReviews, setProductReviews] = useState([])
  const [productQuestions, setProductQuestions] = useState([])
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [helpfulVotes, setHelpfulVotes] = useState({})

  useEffect(() => {
    let cancelled = false

    const loadProduct = async () => {
      try {
        const data = await productService.fetchProductBySlug(slug)

        if (!data) {
          if (!cancelled) {
            setProduct(null)
          }
          return
        }

        const [related, recommended, frequentlyBought, reviews, questions] =
          await Promise.all([
            productService.fetchRelatedProducts(data.id),
            productService.fetchRecommendations(data.id),
            productService.fetchFrequentlyBoughtTogether(data.id),
            productService.fetchReviews(data.id),
            productService.fetchQuestions(data.id),
          ])

        if (!cancelled) {
          setProduct(data)
          setRelatedProducts(related)
          setRecommendedProducts(recommended)
          setFrequentlyBoughtProducts(frequentlyBought)
          setProductReviews(reviews)
          setProductQuestions(questions)
          setSelectedSize(data?.sizes?.[0] || 'Standard')
          setSelectedColor(data?.colors?.[0] || 'Default')
          addRecentlyViewed(data.id)
        }
      } catch {
        if (!cancelled) {
          setProduct(null)
        }
      }
    }

    loadProduct()

    return () => {
      cancelled = true
    }
  }, [slug, addRecentlyViewed])

  const isWishlisted = product ? hasItem(product.id) : false

  const handleAddToCart = () => {
    if (!product) {
      return
    }

    addToCart(product, {
      selectedSize,
      selectedColor,
      quantity: 1,
    })

    toast.success('Added to cart')
  }

  const handleBuyNow = () => {
    handleAddToCart()
    navigate('/checkout')
  }

  const handleShare = async () => {
    if (!product) {
      return
    }

    const url = window.location.href

    if (navigator.share) {
      await navigator.share({
        title: product.name,
        text: product.shortDescription,
        url,
      })
      return
    }

    await navigator.clipboard.writeText(url)
    toast.success('Product link copied')
  }

  const handleBackInStockAlert = () => {
    toast.success('You will receive a back-in-stock alert.')
  }

  const voteHelpful = (reviewId) => {
    setHelpfulVotes((state) => ({
      ...state,
      [reviewId]: (state[reviewId] || 0) + 1,
    }))
  }

  if (!product) {
    return (
      <EmptyState
        description="The product you are looking for might be unavailable."
        title="Product not found"
      />
    )
  }

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr]">
        <ProductGallery alt={product.name} images={product.images} />

        <div className="space-y-5">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              {product.badges?.map((badge) => (
                <Badge key={badge} type={badge} />
              ))}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {product.brand}
            </p>
            <h1 className="mt-2 font-heading text-3xl font-semibold text-slate-900 dark:text-slate-100">
              {product.name}
            </h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{product.description}</p>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
              <Star className="h-3.5 w-3.5 fill-current" />
              {product.rating}
            </span>
            <span>{product.reviewCount} ratings</span>
          </div>

          <div className="space-y-1">
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(product.price)}
            </p>
            <p className="text-sm text-slate-500 line-through">
              {formatCurrency(product.compareAtPrice)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Size
              </p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      selectedSize === size
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                    }`}
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    type="button"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Color
              </p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <button
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      selectedColor === color
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                    }`}
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    type="button"
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Card className="space-y-2 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Stock:</span>{' '}
              {product.stock > 0 ? `${product.stock} units available` : 'Out of stock'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Delivery by:</span>{' '}
              {getDeliveryEstimate()}
            </p>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button disabled={product.stock <= 0} onClick={handleAddToCart}>
              <ShoppingBag className="mr-2 h-4 w-4" />
              Add to Cart
            </Button>
            <Button disabled={product.stock <= 0} onClick={handleBuyNow} variant="secondary">
              Buy Now
            </Button>
            <Button
              onClick={() => {
                toggleWishlist(product)
                toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist')
              }}
              variant="outline"
            >
              <Heart className={`mr-2 h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
              Wishlist
            </Button>
            <Button onClick={handleShare} variant="ghost">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            {product.stock <= 0 ? (
              <Button onClick={handleBackInStockAlert} variant="outline">
                Notify Me
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle subtitle="Everything you need to know" title="Specifications" />
          <dl className="space-y-2 text-sm">
            {Object.entries(product.specifications).map(([label, value]) => (
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800" key={label}>
                <dt className="text-slate-500 dark:text-slate-300">{label}</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-5">
          <SectionTitle subtitle="Community feedback" title="Reviews and Ratings" />
          <div className="space-y-3">
            {productReviews.map((review) => (
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700" key={review.id}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{review.title}</p>
                  <p className="text-xs text-slate-500">{formatDate(review.createdAt)}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">by {review.userName}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{review.comment}</p>
                <button
                  className="mt-3 text-xs font-semibold text-brand-600"
                  onClick={() => voteHelpful(review.id)}
                  type="button"
                >
                  Helpful ({review.helpfulVotes + (helpfulVotes[review.id] || 0)})
                </button>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle subtitle="Ask before you buy" title="User Q&A" />
        <div className="space-y-3">
          {productQuestions.map((item) => (
            <Card className="p-4" key={item.id}>
              <p className="font-medium text-slate-900 dark:text-slate-100">Q: {item.question}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">A: {item.answer}</p>
              <p className="mt-2 text-xs text-slate-500">Asked by {item.askedBy}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle subtitle="Similar products" title="Related Products" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {relatedProducts.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle subtitle="Algorithmic picks" title="Recommended Products" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {recommendedProducts.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          subtitle="Frequently purchased together"
          title="Frequently Bought Together"
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {frequentlyBoughtProducts.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Looking for more details? Contact support or share this product with your friends.
        </p>
        <div className="mt-3 flex gap-3">
          <Link className="text-sm font-semibold text-brand-600" to="/orders">
            View shipping policies
          </Link>
          <Link className="text-sm font-semibold text-brand-600" to="/catalog">
            Continue shopping
          </Link>
        </div>
      </section>
    </div>
  )
}
