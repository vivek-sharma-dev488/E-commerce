import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { SectionTitle } from '../../components/common/SectionTitle'
import { ProductCard } from '../../components/product/ProductCard'
import { productService } from '../../services/productService'
import { useCatalogStore } from '../../store/catalogStore'

const heroSlides = [
  {
    id: 'hero-1',
    title: 'Future-ready fashion for everyday movement',
    subtitle:
      'Fresh seasonal collection with breathable fabrics and timeless silhouettes.',
    cta: 'Shop New Arrivals',
    image:
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1800&auto=format&fit=crop',
  },
  {
    id: 'hero-2',
    title: 'Flash deals built for fast checkout',
    subtitle:
      'Activate limited-time offers across top categories and best sellers.',
    cta: 'Grab Deals',
    image:
      'https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1800&auto=format&fit=crop',
  },
  {
    id: 'hero-3',
    title: 'Realtime commerce, premium experience',
    subtitle:
      'Modern buying journeys with personalized recommendations and loyalty rewards.',
    cta: 'Explore Catalog',
    image:
      'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=1800&auto=format&fit=crop',
  },
]

export function HomePage() {
  const navigate = useNavigate()
  const recentlyViewedIds = useCatalogStore((state) => state.recentlyViewedIds)

  const [activeHeroIndex, setActiveHeroIndex] = useState(0)
  const [allProducts, setAllProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [recentlyViewed, setRecentlyViewed] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadHomeData = async () => {
      try {
        const [productsData, categoriesData, brandsData] = await Promise.all([
          productService.fetchProducts({}),
          productService.fetchCategories(),
          productService.fetchBrands(),
        ])

        if (!cancelled) {
          setAllProducts(productsData)
          setCategories(categoriesData)
          setBrands(brandsData)
        }
      } catch {
        if (!cancelled) {
          setAllProducts([])
          setCategories([])
          setBrands([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadHomeData()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadRecentlyViewed = async () => {
      if (!recentlyViewedIds.length) {
        setRecentlyViewed([])
        return
      }

      try {
        const items = await productService.fetchRecentlyViewed(recentlyViewedIds)

        if (!cancelled) {
          setRecentlyViewed(items)
        }
      } catch {
        if (!cancelled) {
          setRecentlyViewed([])
        }
      }
    }

    loadRecentlyViewed()

    return () => {
      cancelled = true
    }
  }, [recentlyViewedIds])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % heroSlides.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  const featuredProducts = useMemo(() => allProducts.slice(0, 4), [allProducts])
  const trendingProducts = useMemo(
    () => allProducts.filter((product) => product.badges.includes('trending')).slice(0, 4),
    [allProducts],
  )
  const bestSellers = useMemo(
    () => [...allProducts].sort((a, b) => b.soldCount - a.soldCount).slice(0, 4),
    [allProducts],
  )
  const flashSaleProducts = useMemo(
    () =>
      [...allProducts]
        .sort(
          (a, b) =>
            (b.compareAtPrice - b.price) -
            (a.compareAtPrice - a.price),
        )
        .slice(0, 4),
    [allProducts],
  )
  const recommended = useMemo(
    () => [...allProducts].sort((a, b) => b.rating - a.rating).slice(0, 4),
    [allProducts],
  )

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
  }

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        {heroSlides.map((slide, index) => (
          <div
            className={`grid transition-opacity duration-700 md:grid-cols-2 ${
              activeHeroIndex === index ? 'relative opacity-100' : 'absolute inset-0 opacity-0'
            }`}
            key={slide.id}
          >
            <div className="space-y-4 p-8 md:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-600">
                Seasonal Campaign
              </p>
              <h1 className="font-heading text-4xl font-semibold leading-tight text-slate-900 dark:text-slate-100 md:text-5xl">
                {slide.title}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 md:text-base">
                {slide.subtitle}
              </p>
              <div className="flex items-center gap-3">
                <Button onClick={() => navigate('/catalog')}>{slide.cta}</Button>
                <Button onClick={() => navigate('/catalog?sortBy=best_selling')} variant="outline">
                  Explore Deals
                </Button>
              </div>
            </div>
            <img
              alt={slide.title}
              className="h-80 w-full object-cover md:h-full"
              src={slide.image}
            />
          </div>
        ))}

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
          {heroSlides.map((slide, index) => (
            <button
              className={`h-2 rounded-full transition-all ${
                index === activeHeroIndex ? 'w-8 bg-brand-600' : 'w-2 bg-white/70'
              }`}
              key={slide.id}
              onClick={() => setActiveHeroIndex(index)}
              type="button"
            />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          subtitle="Discover curated categories"
          title="Product Categories"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <div key={category.id}>
              <Link to={`/catalog?category=${category.slug}`}>
                <Card className="group overflow-hidden p-0">
                  <img
                    alt={category.name}
                    className="h-40 w-full object-cover transition duration-500 group-hover:scale-105"
                    src={
                      category.image ||
                      category.image_url ||
                      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1400&auto=format&fit=crop'
                    }
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {category.name}
                    </h3>
                  </div>
                </Card>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle subtitle="Editor picks this week" title="Featured Products" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle subtitle="Trending now" title="Trending Products" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {trendingProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-brand-600 to-cyan-600 p-8 text-white dark:border-slate-700">
        <SectionTitle
          subtitle="Limited stock, limited time"
          title="Flash Sale"
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {flashSaleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle subtitle="Most purchased by customers" title="Best Sellers" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle subtitle="Powered by browsing behavior" title="Recommended For You" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {recommended.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle subtitle="Your recent product views" title="Recently Viewed" />
        {recentlyViewed.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {recentlyViewed.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Recently viewed products will appear here as you browse.
            </p>
          </Card>
        )}
      </section>

      <section>
        <SectionTitle subtitle="Brands customers trust" title="Top Brands" />
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {brands.map((brand) => (
            <Card className="text-center" key={brand}>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{brand}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
