import { Grid2X2, List, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState } from '../../components/common/EmptyState'
import { SectionTitle } from '../../components/common/SectionTitle'
import { FiltersPanel } from '../../components/product/FiltersPanel'
import { ProductCard } from '../../components/product/ProductCard'
import { useDebounce } from '../../hooks/useDebounce'
import { productService } from '../../services/productService'
import { useCatalogStore } from '../../store/catalogStore'

const ITEMS_PER_PAGE = 8

export function CatalogPage() {
  const [searchParams] = useSearchParams()
  const filters = useCatalogStore((state) => state.filters)
  const setFilter = useCatalogStore((state) => state.setFilter)
  const toggleArrayFilter = useCatalogStore((state) => state.toggleArrayFilter)
  const resetFilters = useCatalogStore((state) => state.resetFilters)
  const viewMode = useCatalogStore((state) => state.viewMode)
  const setViewMode = useCatalogStore((state) => state.setViewMode)

  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [suggestions, setSuggestions] = useState([])

  const debouncedQuery = useDebounce(filters.query, 250)

  useEffect(() => {
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy')

    if (category) {
      setFilter('category', category)
    }

    if (sortBy) {
      setFilter('sortBy', sortBy)
    }
  }, [searchParams, setFilter])

  useEffect(() => {
    let cancelled = false

    const loadFiltersData = async () => {
      const availableBrands = await productService.fetchBrands()

      if (!cancelled) {
        setBrands(availableBrands)
      }
    }

    loadFiltersData()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadProducts = async () => {
      setIsLoading(true)
      const data = await productService.fetchProducts(filters)

      if (!cancelled) {
        setProducts(data)
        setIsLoading(false)
      }
    }

    loadProducts()

    return () => {
      cancelled = true
    }
  }, [filters])

  useEffect(() => {
    let cancelled = false

    const loadSuggestions = async () => {
      if (debouncedQuery.length <= 1) {
        if (!cancelled) {
          setSuggestions([])
        }
        return
      }

      const data = await productService.searchSuggestions(debouncedQuery)

      if (!cancelled) {
        setSuggestions(data)
      }
    }

    loadSuggestions()

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  const visibleProducts = useMemo(() => products.slice(0, page * ITEMS_PER_PAGE), [products, page])
  const hasMore = visibleProducts.length < products.length

  return (
    <div className="space-y-6">
      <SectionTitle
        subtitle="Browse trending styles, gadgets, and essentials"
        title="Product Catalog"
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900"
          onChange={(event) => setFilter('query', event.target.value)}
          placeholder="Search with live suggestions"
          value={filters.query}
        />

        {suggestions.length ? (
          <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900">
            {suggestions.map((suggestion) => (
              <Link
                className="block border-b border-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 last:border-none dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800"
                key={suggestion.id}
                onClick={() => {
                  setFilter('query', '')
                  setSuggestions([])
                }}
                to={`/product/${suggestion.slug}`}
              >
                {suggestion.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
        <aside>
          <FiltersPanel
            brands={brands}
            filters={filters}
            onReset={resetFilters}
            onSetFilter={(key, value) => {
              setPage(1)
              setFilter(key, value)
            }}
            onToggleArrayFilter={(key, value) => {
              setPage(1)
              toggleArrayFilter(key, value)
            }}
          />
        </aside>

        <section className="space-y-5">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-300">{products.length} items found</p>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                className={`px-3 py-2 text-sm ${
                  viewMode === 'grid'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
                onClick={() => setViewMode('grid')}
                type="button"
              >
                <Grid2X2 className="h-4 w-4" />
              </button>
              <button
                className={`px-3 py-2 text-sm ${
                  viewMode === 'list'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
                onClick={() => setViewMode('list')}
                type="button"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  className="h-80 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
                  key={index}
                />
              ))}
            </div>
          ) : null}

          {!isLoading && !visibleProducts.length ? (
            <EmptyState
              description="No products match your filters. Try resetting or broadening your search."
              title="No products found"
            />
          ) : null}

          {!isLoading && visibleProducts.length ? (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid gap-5 md:grid-cols-2 xl:grid-cols-3'
                  : 'space-y-3'
              }
            >
              {visibleProducts.map((product) =>
                viewMode === 'grid' ? (
                  <ProductCard key={product.id} product={product} />
                ) : (
                  <div
                    className="grid items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[140px_1fr_auto]"
                    key={product.id}
                  >
                    <img
                      alt={product.name}
                      className="h-24 w-full rounded-xl object-cover"
                      src={product.images[0]}
                    />
                    <div>
                      <Link to={`/product/${product.slug}`}>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {product.name}
                        </h3>
                      </Link>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{product.shortDescription}</p>
                    </div>
                    <Link
                      className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                      to={`/product/${product.slug}`}
                    >
                      View
                    </Link>
                  </div>
                ),
              )}
            </div>
          ) : null}

          {hasMore && !isLoading ? (
            <div className="flex justify-center">
              <button
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                Load More
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
