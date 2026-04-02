import { getSupabaseClient } from './supabaseClient'

const normalizeProduct = (item) => ({
  id: item.id,
  slug: item.slug,
  name: item.name,
  brand: item.brand || 'Unknown',
  price: Number(item.price || 0),
  compareAtPrice: Number(item.compare_at_price || 0),
  rating: Number(item.rating || 0),
  reviewCount: Number(item.review_count || 0),
  stock: Number(item.stock || 0),
  soldCount: Number(item.sold_count || 0),
  badges: item.badges || [],
  colors: item.colors || [],
  sizes: item.sizes || [],
  shortDescription: item.short_description || '',
  description: item.description || '',
  specifications: item.specifications || {},
  images: item.images || [],
})

const normalizeOrder = (order) => ({
  ...order,
  currentStatus: order.currentStatus || order.status,
  items: (order.order_items || []).map((item) => ({
    productId: item.product_id,
    quantity: item.quantity,
    price: Number(item.unit_price || 0),
  })),
})

export const orderService = {
  async fetchOrders(userId) {
    if (!userId) {
      return []
    }

    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data || []).map(normalizeOrder)
  },

  async fetchOrderById(orderId) {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single()

    if (error || !data) {
      return null
    }

    return normalizeOrder(data)
  },

  async createOrder(payload) {
    const supabase = getSupabaseClient()
    const { items = [], ...orderPayload } = payload

    const { data: createdOrder, error: orderError } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select('*')
      .single()

    if (orderError || !createdOrder) {
      return { data: null, error: orderError }
    }

    let createdItems = []

    if (items.length) {
      const rows = items.map((item) => ({
        order_id: createdOrder.id,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_name: item.product_name || 'Product',
        sku: item.sku || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        selected_size: item.selected_size || null,
        selected_color: item.selected_color || null,
        snapshot: item.snapshot || {},
      }))

      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .insert(rows)
        .select('*')

      if (orderItemsError) {
        return { data: null, error: orderItemsError }
      }

      createdItems = orderItems || []
    }

    return {
      data: normalizeOrder({
        ...createdOrder,
        order_items: createdItems,
      }),
      error: null,
    }
  },

  async updateOrderStatus(orderId, status) {
    const supabase = getSupabaseClient()

    return supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select('*')
      .single()
  },

  async updateOrderPayment(orderId, payload) {
    const supabase = getSupabaseClient()

    return supabase
      .from('orders')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('*')
      .single()
  },

  async requestRefund(orderId, reason, userId, details = '') {
    const supabase = getSupabaseClient()

    return supabase.from('refund_requests').insert({
      order_id: orderId,
      user_id: userId,
      reason,
      details,
      status: 'requested',
    })
  },

  async requestReplacement(orderId, reason, userId, details = '') {
    const supabase = getSupabaseClient()

    return supabase.from('replacement_requests').insert({
      order_id: orderId,
      user_id: userId,
      reason,
      details,
      status: 'requested',
    })
  },

  async reorder(order) {
    const supabase = getSupabaseClient()

    const orderItems = order?.order_items || []

    if (!orderItems.length) {
      return []
    }

    const productIds = [...new Set(orderItems.map((item) => item.product_id).filter(Boolean))]

    if (!productIds.length) {
      return []
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('is_active', true)

    if (error) {
      throw new Error(error.message)
    }

    const productsById = (data || []).reduce((acc, item) => {
      acc[item.id] = normalizeProduct(item)
      return acc
    }, {})

    return orderItems
      .map((item) => {
        const product = productsById[item.product_id]

        if (!product) {
          return null
        }

        return {
          product,
          quantity: item.quantity,
          selectedSize: item.selected_size || product.sizes[0],
          selectedColor: item.selected_color || product.colors[0],
          savedForLater: false,
        }
      })
      .filter(Boolean)
  },

  subscribeToOrder(orderId, onUpdate) {
    if (!orderId) {
      return {
        unsubscribe: () => {},
      }
    }

    const supabase = getSupabaseClient()

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          onUpdate(payload.new)
        },
      )
      .subscribe()

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel)
      },
    }
  },
}
