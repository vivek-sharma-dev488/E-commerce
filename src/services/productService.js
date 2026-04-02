import { getSupabaseClient } from './supabaseClient'

const applyFilters = (items, filters = {}) => {
  const {
    query,
    category,
    priceRange,
    brand,
    size,
    color,
    availability,
    minRating,
    sortBy,
  } = filters

  let result = [...items]

  if (query) {
    const normalizedQuery = query.toLowerCase()
    result = result.filter((item) =>
      `${item.name} ${item.brand}`.toLowerCase().includes(normalizedQuery),
    )
  }

  if (category) {
    result = result.filter((item) => item.category === category)
  }

  if (priceRange?.length === 2) {
    result = result.filter(
      (item) => item.price >= priceRange[0] && item.price <= priceRange[1],
    )
  }

  if (brand?.length) {
    result = result.filter((item) => brand.includes(item.brand))
  }

  if (size?.length) {
    result = result.filter((item) => item.sizes.some((itemSize) => size.includes(itemSize)))
  }

  if (color?.length) {
    result = result.filter((item) =>
      item.colors.some((itemColor) => color.includes(itemColor)),
    )
  }

  if (availability === 'in_stock') {
    result = result.filter((item) => item.stock > 0)
  }

  if (availability === 'out_of_stock') {
    result = result.filter((item) => item.stock <= 0)
  }

  if (minRating) {
    result = result.filter((item) => item.rating >= minRating)
  }

  switch (sortBy) {
    case 'price_asc':
      result.sort((a, b) => a.price - b.price)
      break
    case 'price_desc':
      result.sort((a, b) => b.price - a.price)
      break
    case 'newest':
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      break
    case 'top_rated':
      result.sort((a, b) => b.rating - a.rating)
      break
    case 'best_selling':
      result.sort((a, b) => b.soldCount - a.soldCount)
      break
    default:
      break
  }

  return result
}

const normalizeSupabaseProduct = (item, categoryById = {}) => {
  const createdAt = item.created_at || item.createdAt || new Date().toISOString()

  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    brand: item.brand || 'Unknown',
    category: categoryById[item.category_id]?.slug || item.category || '',
    categoryName: categoryById[item.category_id]?.name || '',
    price: Number(item.price || 0),
    compareAtPrice: Number(item.compare_at_price || 0),
    rating: Number(item.rating || 0),
    reviewCount: Number(item.review_count || 0),
    stock: Number(item.stock || 0),
    soldCount: Number(item.sold_count || 0),
    isNew: Date.now() - new Date(createdAt).getTime() <= 1000 * 60 * 60 * 24 * 30,
    badges: item.badges || [],
    colors: item.colors || [],
    sizes: item.sizes || [],
    shortDescription: item.short_description || '',
    description: item.description || '',
    specifications: item.specifications || {},
    images: item.images || [],
    createdAt,
  }
}

const buildCategoryMap = (categories = []) =>
  categories.reduce((acc, category) => {
    acc[category.id] = {
      slug: category.slug,
      name: category.name,
    }

    return acc
  }, {})

const fetchCategoryMap = async () => {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true)

  if (error) {
    throw new Error(error.message)
  }

  return buildCategoryMap(data || [])
}

export const productService = {
  async fetchProducts(filters = {}) {
    const supabase = getSupabaseClient()

    const [categoryMap, productsResponse] = await Promise.all([
      fetchCategoryMap(),
      supabase
        .from('products')
        .select('*')
        .eq('is_active', true),
    ])

    if (productsResponse.error) {
      throw new Error(productsResponse.error.message)
    }

    const normalized = (productsResponse.data || []).map((item) =>
      normalizeSupabaseProduct(item, categoryMap),
    )

    return applyFilters(normalized, filters)
  },

  async fetchProductBySlug(slug) {
    const supabase = getSupabaseClient()

    const [categoryMap, productResponse] = await Promise.all([
      fetchCategoryMap(),
      supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single(),
    ])

    if (productResponse.error || !productResponse.data) {
      return null
    }

    return normalizeSupabaseProduct(productResponse.data, categoryMap)
  },

  async fetchCategories() {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return (data || []).map((item) => ({
      ...item,
      image: item.image_url,
    }))
  },

  async fetchBrands() {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('products')
      .select('brand')
      .eq('is_active', true)
      .not('brand', 'is', null)

    if (error) {
      throw new Error(error.message)
    }

    return [...new Set((data || []).map((row) => row.brand))]
  },

  async fetchRecommendations(productId) {
    const supabase = getSupabaseClient()
    const categoryMap = await fetchCategoryMap()

    const { data: seed, error: seedError } = await supabase
      .from('products')
      .select('id, category_id, brand')
      .eq('id', productId)
      .single()

    if (seedError || !seed) {
      return []
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .neq('id', productId)
      .or(`category_id.eq.${seed.category_id},brand.eq.${seed.brand}`)
      .order('sold_count', { ascending: false })
      .limit(4)

    if (error) {
      throw new Error(error.message)
    }

    return (data || []).map((item) => normalizeSupabaseProduct(item, categoryMap))
  },

  async fetchRelatedProducts(productId) {
    const supabase = getSupabaseClient()
    const categoryMap = await fetchCategoryMap()

    const { data: seed, error: seedError } = await supabase
      .from('products')
      .select('id, category_id')
      .eq('id', productId)
      .single()

    if (seedError || !seed) {
      return []
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('category_id', seed.category_id)
      .neq('id', productId)
      .order('rating', { ascending: false })
      .limit(4)

    if (error) {
      throw new Error(error.message)
    }

    return (data || []).map((item) => normalizeSupabaseProduct(item, categoryMap))
  },

  async fetchFrequentlyBoughtTogether(productId) {
    const supabase = getSupabaseClient()
    const categoryMap = await fetchCategoryMap()

    const orderIdsResponse = await supabase
      .from('order_items')
      .select('order_id')
      .eq('product_id', productId)
      .limit(100)

    if (orderIdsResponse.error) {
      throw new Error(orderIdsResponse.error.message)
    }

    const orderIds = [...new Set((orderIdsResponse.data || []).map((item) => item.order_id))]

    if (!orderIds.length) {
      return this.fetchRecommendations(productId)
    }

    const pairItemsResponse = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .in('order_id', orderIds)
      .neq('product_id', productId)

    if (pairItemsResponse.error) {
      throw new Error(pairItemsResponse.error.message)
    }

    const scoreByProductId = (pairItemsResponse.data || []).reduce((acc, item) => {
      const score = Number(item.quantity || 1)
      acc[item.product_id] = (acc[item.product_id] || 0) + score
      return acc
    }, {})

    const rankedIds = Object.entries(scoreByProductId)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)
      .slice(0, 4)

    if (!rankedIds.length) {
      return this.fetchRecommendations(productId)
    }

    const productsResponse = await supabase
      .from('products')
      .select('*')
      .in('id', rankedIds)
      .eq('is_active', true)

    if (productsResponse.error) {
      throw new Error(productsResponse.error.message)
    }

    const mapById = (productsResponse.data || []).reduce((acc, item) => {
      acc[item.id] = normalizeSupabaseProduct(item, categoryMap)
      return acc
    }, {})

    return rankedIds.map((id) => mapById[id]).filter(Boolean)
  },

  async fetchReviews(productId) {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, title, comment, helpful_votes, created_at, users:user_id(full_name)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data || []).map((item) => ({
      id: item.id,
      rating: item.rating,
      title: item.title || 'Review',
      comment: item.comment || '',
      helpfulVotes: item.helpful_votes || 0,
      createdAt: item.created_at,
      userName: item.users?.full_name || 'Customer',
    }))
  },

  async fetchQuestions(productId) {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('questions')
      .select('id, question, answer, created_at, users:user_id(full_name)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data || []).map((item) => ({
      id: item.id,
      question: item.question,
      answer: item.answer || 'Answer pending from support team.',
      askedBy: item.users?.full_name || 'Customer',
      createdAt: item.created_at,
    }))
  },

  async fetchRecentlyViewed(productIds = []) {
    if (!productIds.length) {
      return []
    }

    const supabase = getSupabaseClient()
    const categoryMap = await fetchCategoryMap()

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('is_active', true)

    if (error) {
      throw new Error(error.message)
    }

    const mapById = (data || []).reduce((acc, item) => {
      acc[item.id] = normalizeSupabaseProduct(item, categoryMap)
      return acc
    }, {})

    return productIds.map((id) => mapById[id]).filter(Boolean).slice(0, 8)
  },

  async searchSuggestions(query) {
    if (!query) {
      return []
    }

    const supabase = getSupabaseClient()
    const normalized = query.trim()

    const { data, error } = await supabase
      .from('products')
      .select('id, name, slug')
      .eq('is_active', true)
      .ilike('name', `%${normalized}%`)
      .limit(5)

    if (error) {
      throw new Error(error.message)
    }

    return (data || []).map((item) => ({
      id: item.id,
      label: item.name,
      slug: item.slug,
    }))
  },
}
