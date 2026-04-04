import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  COUPONS,
  DEFAULT_SHIPPING_FEE,
  DEFAULT_TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
} from '../lib/constants'
import { cartService } from '../services/cartService'
import { useAuthStore } from './authStore'

const calculateCouponDiscount = (subtotal, couponCode) => {
  if (!couponCode) {
    return 0
  }

  const coupon = COUPONS.find((item) => item.code === couponCode)

  if (!coupon || subtotal < coupon.minAmount) {
    return 0
  }

  if (coupon.discountType === 'percentage') {
    return Math.round((subtotal * coupon.value) / 100)
  }

  if (coupon.discountType === 'flat') {
    return coupon.value
  }

  return 0
}

const areCartItemsEqual = (currentItems, incomingItems) => {
  if (currentItems === incomingItems) {
    return true
  }

  if (currentItems.length !== incomingItems.length) {
    return false
  }

  return currentItems.every((currentItem, index) => {
    const incomingItem = incomingItems[index]

    if (!incomingItem) {
      return false
    }

    return (
      currentItem.id === incomingItem.id &&
      currentItem.quantity === incomingItem.quantity &&
      currentItem.savedForLater === incomingItem.savedForLater &&
      currentItem.selectedSize === incomingItem.selectedSize &&
      currentItem.selectedColor === incomingItem.selectedColor &&
      currentItem.product?.id === incomingItem.product?.id
    )
  })
}

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      couponCode: '',
      shippingFee: DEFAULT_SHIPPING_FEE,

      addToCart: (product, payload = {}) => {
        const user = useAuthStore.getState().user

        if (!user) {
          return false
        }

        const { selectedSize, selectedColor, quantity = 1 } = payload

        set((state) => {
          const existing = state.items.find(
            (item) =>
              item.product.id === product.id &&
              item.selectedSize === selectedSize &&
              item.selectedColor === selectedColor &&
              !item.savedForLater,
          )

          if (existing) {
            return {
              items: state.items.map((item) =>
                item === existing
                  ? {
                      ...item,
                      quantity: Math.min(item.quantity + quantity, 10),
                    }
                  : item,
              ),
            }
          }

          return {
            items: [
              ...state.items,
              {
                id: `cart-${Date.now()}`,
                product,
                quantity,
                selectedSize: selectedSize || product.sizes?.[0] || 'Standard',
                selectedColor: selectedColor || product.colors?.[0] || 'Default',
                savedForLater: false,
              },
            ],
          }
        })

        return true
      },

      removeFromCart: (itemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        })),

      updateQuantity: (itemId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  quantity: Math.max(1, Math.min(quantity, 10)),
                }
              : item,
          ),
        })),

      toggleSaveForLater: (itemId) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  savedForLater: !item.savedForLater,
                }
              : item,
          ),
        })),

      applyCoupon: (couponCode) => {
        const normalized = couponCode.trim().toUpperCase()
        const coupon = COUPONS.find((item) => item.code === normalized)

        if (!coupon) {
          return { success: false, message: 'Invalid coupon code.' }
        }

        set({ couponCode: normalized })
        return { success: true, message: 'Coupon applied successfully.' }
      },

      clearCoupon: () => set({ couponCode: '' }),

      clearCart: () => set({ items: [], couponCode: '' }),

      getCartItems: () => get().items.filter((item) => !item.savedForLater),

      getSavedItems: () => get().items.filter((item) => item.savedForLater),

      getSummary: () => {
        const cartItems = get().getCartItems()
        const subtotal = cartItems.reduce(
          (acc, item) => acc + item.product.price * item.quantity,
          0,
        )

        const couponDiscount = calculateCouponDiscount(subtotal, get().couponCode)
        const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD
        const shipping = isFreeShipping ? 0 : get().shippingFee
        const tax = Math.round((subtotal - couponDiscount) * DEFAULT_TAX_RATE)
        const total = subtotal + shipping + tax - couponDiscount

        return {
          subtotal,
          shipping,
          tax,
          couponDiscount,
          total,
          isFreeShipping,
          freeShippingRemaining: Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal),
        }
      },

      syncCartToServer: async (userId) => {
        if (!userId) {
          return
        }

        const items = get().items
        await cartService.syncCart(userId, items)
      },

      hydrateFromServer: (serverItems) => {
        if (!Array.isArray(serverItems)) {
          return
        }

        if (areCartItemsEqual(get().items, serverItems)) {
          return
        }

        set({
          items: serverItems,
        })
      },

      saveAbandonedCart: async (userId) => {
        if (!userId) {
          return
        }

        await cartService.saveAbandonedCart(userId, get().items)
      },
    }),
    {
      name: 'northstar-cart-store',
      partialize: (state) => ({
        items: state.items,
        couponCode: state.couponCode,
      }),
    },
  ),
)
