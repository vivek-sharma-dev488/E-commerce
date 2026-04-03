import { getSupabaseClient } from './supabaseClient'

const round = (value) => Number(value.toFixed(1))

const sumTotalAmount = (orders = []) =>
  orders.reduce((acc, order) => acc + Number(order.total_amount || 0), 0)

const buildCategoryMap = (categories = []) =>
  categories.reduce((acc, category) => {
    acc[category.id] = {
      id: category.id,
      name: category.name,
      slug: category.slug,
    }

    return acc
  }, {})

const normalizeAdminProduct = (item, categoryById = {}) => ({
  id: item.id,
  name: item.name,
  slug: item.slug,
  brand: item.brand || '',
  categoryId: item.category_id,
  category: categoryById[item.category_id]?.slug || '',
  categoryName: categoryById[item.category_id]?.name || '',
  shortDescription: item.short_description || '',
  price: Number(item.price || 0),
  compareAtPrice: Number(item.compare_at_price || 0),
  stock: Number(item.stock || 0),
  sizes: item.sizes || [],
  colors: item.colors || [],
  images: item.images || [],
  isActive: Boolean(item.is_active),
  createdAt: item.created_at,
  updatedAt: item.updated_at,
})

const normalizeAdminCoupon = (item) => ({
  id: item.id,
  code: item.code,
  discountType: item.discount_type,
  value: Number(item.discount_value || 0),
  minAmount: Number(item.minimum_order_amount || 0),
  usageCount: Number(item.usage_count || 0),
  isActive: Boolean(item.is_active),
  startsAt: item.starts_at,
  expiresAt: item.expires_at,
})

export const adminService = {
  async fetchAnalytics() {
    const supabase = getSupabaseClient()

    const [ordersResponse, orderItemsResponse, productsResponse, categoriesResponse, abandonedResponse] =
      await Promise.all([
        supabase
          .from('orders')
          .select('id, user_id, total_amount, created_at, payment_status, status'),
        supabase
          .from('order_items')
          .select('order_id, product_id, product_name, quantity'),
        supabase
          .from('products')
          .select('id, category_id, name, stock, is_active'),
        supabase
          .from('categories')
          .select('id, name'),
        supabase.from('abandoned_carts').select('id', { count: 'exact', head: true }),
      ])

    if (ordersResponse.error) {
      throw new Error(ordersResponse.error.message)
    }

    if (orderItemsResponse.error) {
      throw new Error(orderItemsResponse.error.message)
    }

    if (productsResponse.error) {
      throw new Error(productsResponse.error.message)
    }

    if (categoriesResponse.error) {
      throw new Error(categoriesResponse.error.message)
    }

    const orders = ordersResponse.data || []
    const orderItems = orderItemsResponse.data || []
    const products = productsResponse.data || []
    const categories = categoriesResponse.data || []
    const abandonedCount = abandonedResponse.count || 0

    const paidOrders = orders.filter((order) =>
      ['paid', 'cod'].includes(String(order.payment_status || '').toLowerCase()),
    )

    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const dailySales = paidOrders.filter(
      (order) => new Date(order.created_at).getTime() >= startOfToday.getTime(),
    ).length

    const monthlySales = paidOrders.filter(
      (order) => new Date(order.created_at).getTime() >= startOfMonth.getTime(),
    ).length

    const revenue = sumTotalAmount(paidOrders)

    const refundedOrders = orders.filter((order) => order.payment_status === 'refunded').length

    const uniqueCustomers = new Set(paidOrders.map((order) => order.user_id)).size
    const orderCountByUser = paidOrders.reduce((acc, order) => {
      acc[order.user_id] = (acc[order.user_id] || 0) + 1
      return acc
    }, {})

    const repeatCustomerCount = Object.values(orderCountByUser).filter((count) => count > 1).length

    const repeatCustomers = uniqueCustomers
      ? round((repeatCustomerCount / uniqueCustomers) * 100)
      : 0

    const conversionRate = orders.length ? round((paidOrders.length / orders.length) * 100) : 0

    const cartAbandonment = orders.length
      ? round((abandonedCount / (abandonedCount + orders.length)) * 100)
      : 0

    const refundRate = orders.length ? round((refundedOrders / orders.length) * 100) : 0

    const overview = {
      revenue,
      dailySales,
      monthlySales,
      conversionRate,
      cartAbandonment,
      refundRate,
      repeatCustomers,
      userRetention: repeatCustomers,
    }

    const trendByMonth = {}

    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      trendByMonth[key] = {
        name: date.toLocaleString('en-IN', { month: 'short' }),
        revenue: 0,
        orders: 0,
      }
    }

    paidOrders.forEach((order) => {
      const orderDate = new Date(order.created_at)
      const key = `${orderDate.getFullYear()}-${orderDate.getMonth()}`

      if (!trendByMonth[key]) {
        return
      }

      trendByMonth[key].orders += 1
      trendByMonth[key].revenue += Number(order.total_amount || 0)
    })

    const revenueTrend = Object.values(trendByMonth)

    const productNameById = products.reduce((acc, product) => {
      acc[product.id] = product.name
      return acc
    }, {})

    const topProductsMap = orderItems.reduce((acc, item) => {
      const key = item.product_id || item.product_name || 'Unknown Product'
      const name = productNameById[item.product_id] || item.product_name || 'Unknown Product'

      if (!acc[key]) {
        acc[key] = { name, sales: 0 }
      }

      acc[key].sales += Number(item.quantity || 0)
      return acc
    }, {})

    const topProducts = Object.values(topProductsMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 4)

    const categoryNameById = categories.reduce((acc, category) => {
      acc[category.id] = category.name
      return acc
    }, {})

    const categoryIdByProductId = products.reduce((acc, product) => {
      acc[product.id] = product.category_id
      return acc
    }, {})

    const topCategoriesMap = orderItems.reduce((acc, item) => {
      const categoryId = categoryIdByProductId[item.product_id]
      const categoryName = categoryNameById[categoryId] || 'Uncategorized'

      acc[categoryName] = (acc[categoryName] || 0) + Number(item.quantity || 0)
      return acc
    }, {})

    const totalCategorySales = Object.values(topCategoriesMap).reduce((acc, value) => acc + value, 0)

    const topCategories = Object.entries(topCategoriesMap)
      .map(([name, value]) => ({
        name,
        value: totalCategorySales ? round((value / totalCategorySales) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4)

    const activeProducts = products.filter((product) => product.is_active !== false)
    const lowStockCount = activeProducts.filter((product) => Number(product.stock || 0) <= 10).length
    const outOfStockCount = activeProducts.filter((product) => Number(product.stock || 0) <= 0).length
    const openOrders = orders.filter(
      (order) => !['delivered', 'cancelled'].includes(String(order.status || '').toLowerCase()),
    ).length

    const operations = {
      activeProducts: activeProducts.length,
      lowStockCount,
      outOfStockCount,
      openOrders,
    }

    return {
      overview,
      operations,
      revenueTrend,
      topProducts,
      topCategories,
    }
  },

  async fetchProducts() {
    const supabase = getSupabaseClient()

    const [productsResponse, categoriesResponse] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name, slug'),
    ])

    if (productsResponse.error) {
      throw new Error(productsResponse.error.message)
    }

    if (categoriesResponse.error) {
      throw new Error(categoriesResponse.error.message)
    }

    const categoryById = buildCategoryMap(categoriesResponse.data || [])

    return (productsResponse.data || []).map((item) => normalizeAdminProduct(item, categoryById))
  },

  async upsertProduct(product) {
    const supabase = getSupabaseClient()

    const payload = {
      category_id: product.categoryId,
      name: product.name,
      slug: product.slug,
      brand: product.brand || null,
      short_description: product.shortDescription || null,
      price: Number(product.price || 0),
      compare_at_price:
        product.compareAtPrice === '' || product.compareAtPrice == null
          ? null
          : Number(product.compareAtPrice),
      stock: Number(product.stock || 0),
      sizes: product.sizes || [],
      colors: product.colors || [],
      images: product.images || [],
      is_active: product.isActive ?? true,
    }

    const query = product.id
      ? supabase.from('products').update(payload).eq('id', product.id)
      : supabase.from('products').insert(payload)

    const { data, error } = await query.select('*').single()

    if (error || !data) {
      throw new Error(error?.message || 'Unable to save product')
    }

    const categories = await this.fetchCategories()
    const categoryById = buildCategoryMap(categories)

    return normalizeAdminProduct(data, categoryById)
  },

  async deleteProduct(productId) {
    const supabase = getSupabaseClient()

    const { error } = await supabase.from('products').delete().eq('id', productId)

    if (error) {
      throw new Error(error.message)
    }
  },

  async fetchOrders() {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  },

  async fetchUsers() {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, loyalty_points')

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  },

  async updateUserRole(userId, role) {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select('id, role')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  },

  async updateUserLoyaltyPoints(userId, loyaltyPoints) {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('users')
      .update({ loyalty_points: loyaltyPoints })
      .eq('id', userId)
      .select('id, loyalty_points')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  },

  async fetchCategories() {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, is_active')
      .order('name', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  },

  async createCategory({ name, slug }) {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name,
        slug,
        is_active: true,
      })
      .select('id, name, slug, is_active')
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Unable to create category')
    }

    return data
  },

  async deleteCategory(categoryId) {
    const supabase = getSupabaseClient()

    const { error } = await supabase.from('categories').delete().eq('id', categoryId)

    if (error) {
      throw new Error(error.message)
    }
  },

  async fetchCoupons() {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data || []).map(normalizeAdminCoupon)
  },

  async createCoupon({ code, discountType, value, minAmount }, userId) {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('coupons')
      .insert({
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(value || 0),
        minimum_order_amount: Number(minAmount || 0),
        is_active: true,
        created_by: userId || null,
      })
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Unable to create coupon')
    }

    return normalizeAdminCoupon(data)
  },

  async setCouponActive(couponId, isActive) {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('coupons')
      .update({ is_active: isActive })
      .eq('id', couponId)
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Unable to update coupon status')
    }

    return normalizeAdminCoupon(data)
  },

  async uploadProductImages(files = []) {
    const supabase = getSupabaseClient()

    const uploads = await Promise.all(
      files.map(async (file) => {
        const uniqueId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
        const filePath = `products/${uniqueId}-${file.name}`
        const { error } = await supabase.storage
          .from('product-images')
          .upload(filePath, file)

        if (error) {
          throw error
        }

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath)

        return {
          name: file.name,
          url: data.publicUrl,
          path: filePath,
        }
      }),
    )

    return uploads
  },
}
