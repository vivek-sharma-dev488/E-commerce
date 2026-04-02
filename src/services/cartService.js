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

export const cartService = {
  async fetchCart(userId) {
    if (!userId) {
      return []
    }

    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('cart_items')
      .select('id, quantity, saved_for_later, selected_size, selected_color, product:products(*)')
      .eq('user_id', userId)

    if (error) {
      throw new Error(error.message)
    }

    return (data || [])
      .map((item) => {
        if (!item.product) {
          return null
        }

        const product = normalizeProduct(item.product)

        return {
          id: item.id,
          quantity: item.quantity,
          savedForLater: item.saved_for_later,
          selectedSize: item.selected_size || product.sizes[0] || 'Standard',
          selectedColor: item.selected_color || product.colors[0] || 'Default',
          product,
        }
      })
      .filter(Boolean)
  },

  async syncCart(userId, items = []) {
    if (!userId) {
      return { data: [], error: null }
    }

    const supabase = getSupabaseClient()

    await supabase.from('cart_items').delete().eq('user_id', userId)

    if (!items.length) {
      return { data: [], error: null }
    }

    const payload = items.map((item) => ({
      user_id: userId,
      product_id: item.product.id,
      quantity: item.quantity,
      selected_size: item.selectedSize,
      selected_color: item.selectedColor,
      saved_for_later: item.savedForLater,
    }))

    return supabase.from('cart_items').insert(payload).select('*')
  },

  async saveAbandonedCart(userId, items = []) {
    if (!userId) {
      return { data: null, error: null }
    }

    const supabase = getSupabaseClient()

    return supabase.from('abandoned_carts').upsert(
      {
        user_id: userId,
        items,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
  },
}
