import Papa from 'papaparse'
import { getSupabaseClient } from './supabaseClient'

const round = (value) => Number(value.toFixed(1))

const sumTotalAmount = (orders = []) =>
  orders.reduce((acc, order) => acc + Number(order.total_amount || 0), 0)

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
          .select('id, category_id, name'),
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

    return {
      overview,
      revenueTrend,
      topProducts,
      topCategories,
    }
  },

  async fetchProducts() {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase.from('products').select('*')

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  },

  async fetchOrders() {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase.from('orders').select('*')

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

  async fetchCategories() {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase.from('categories').select('*')

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  },

  async uploadProductImages(files = []) {
    const supabase = getSupabaseClient()

    const uploads = await Promise.all(
      files.map(async (file) => {
        const filePath = `products/${Date.now()}-${file.name}`
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

  parseCsv(csvText) {
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    })

    if (parsed.errors?.length) {
      const firstError = parsed.errors[0]
      throw new Error(`CSV parse error at row ${firstError.row}: ${firstError.message}`)
    }

    return parsed.data
  },
}
