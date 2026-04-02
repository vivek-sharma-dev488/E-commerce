import { getSupabaseClient } from './supabaseClient'

const deliverablePincodes = new Set([
  '110001',
  '122002',
  '160062',
  '400001',
  '560001',
  '700029',
])

export const addressService = {
  async fetchAddresses(userId) {
    if (!userId) {
      return []
    }

    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  },

  async createAddress(address) {
    const supabase = getSupabaseClient()

    return supabase.from('addresses').insert(address).select('*').single()
  },

  async updateAddress(id, payload) {
    const supabase = getSupabaseClient()

    return supabase
      .from('addresses')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()
  },

  async deleteAddress(id) {
    const supabase = getSupabaseClient()

    return supabase.from('addresses').delete().eq('id', id)
  },

  validatePincode(pincode) {
    return /^\d{6}$/.test(String(pincode))
  },

  checkDeliveryAvailability(pincode) {
    const normalized = String(pincode)
    return {
      available: deliverablePincodes.has(normalized),
      etaDays: deliverablePincodes.has(normalized) ? 2 : null,
    }
  },
}
