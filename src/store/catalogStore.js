import { create } from 'zustand'

const initialFilters = {
  query: '',
  category: '',
  priceRange: [0, 10000],
  brand: [],
  size: [],
  color: [],
  availability: '',
  minRating: 0,
  sortBy: 'best_selling',
}

export const useCatalogStore = create((set, get) => ({
  filters: initialFilters,
  viewMode: 'grid',
  recentlyViewedIds: [],

  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    })),

  toggleArrayFilter: (key, value) =>
    set((state) => {
      const current = state.filters[key] || []
      const exists = current.includes(value)

      return {
        filters: {
          ...state.filters,
          [key]: exists ? current.filter((item) => item !== value) : [...current, value],
        },
      }
    }),

  resetFilters: () => set({ filters: initialFilters }),

  setViewMode: (viewMode) => set({ viewMode }),

  addRecentlyViewed: (productId) => {
    const current = get().recentlyViewedIds
    const deduped = [productId, ...current.filter((id) => id !== productId)]

    set({ recentlyViewedIds: deduped.slice(0, 12) })
  },
}))
