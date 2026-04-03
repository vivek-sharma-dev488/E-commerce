export const APP_NAME = 'Northstar Commerce'

export const FREE_SHIPPING_THRESHOLD = 1999
export const DEFAULT_SHIPPING_FEE = 99
export const DEFAULT_TAX_RATE = 0.18

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  RETAILER: 'retailer',
}

export const ORDER_STATUSES = [
  'ordered',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
]

export const PAYMENT_METHODS = {
  COD: 'cod',
  UPI: 'upi',
  CARD: 'card',
}

export const SORT_OPTIONS = [
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Newest', value: 'newest' },
  { label: 'Top Rated', value: 'top_rated' },
  { label: 'Best Selling', value: 'best_selling' },
]

export const FILTER_OPTIONS = {
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  colors: ['Midnight', 'Ivory', 'Sand', 'Coral', 'Forest', 'Azure'],
  ratings: [4, 3, 2, 1],
  availability: ['in_stock', 'out_of_stock'],
}

export const COUPONS = [
  { code: 'WELCOME10', discountType: 'percentage', value: 10, minAmount: 999 },
  { code: 'FREESHIP', discountType: 'shipping', value: 99, minAmount: 799 },
  { code: 'FLAT300', discountType: 'flat', value: 300, minAmount: 2499 },
]
