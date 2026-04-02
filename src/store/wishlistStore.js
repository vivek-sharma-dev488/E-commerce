import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],

      toggleWishlist: (product) => {
        const exists = get().items.some((item) => item.id === product.id)

        if (exists) {
          set((state) => ({
            items: state.items.filter((item) => item.id !== product.id),
          }))
          return false
        }

        set((state) => ({
          items: [product, ...state.items],
        }))
        return true
      },

      hasItem: (productId) => get().items.some((item) => item.id === productId),

      clearWishlist: () => set({ items: [] }),
    }),
    {
      name: 'northstar-wishlist-store',
    },
  ),
)
