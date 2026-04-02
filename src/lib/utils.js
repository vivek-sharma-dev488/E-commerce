import dayjs from 'dayjs'

export const formatCurrency = (amount, currency = 'INR', locale = 'en-IN') =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)

export const formatCompactNumber = (value, locale = 'en-IN') =>
  new Intl.NumberFormat(locale, { notation: 'compact' }).format(value)

export const formatDate = (value, pattern = 'DD MMM YYYY') =>
  dayjs(value).format(pattern)

export const calculateDiscount = (price, compareAtPrice) => {
  if (!compareAtPrice || compareAtPrice <= price) {
    return 0
  }

  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
}

export const getDeliveryEstimate = (days = 4) =>
  dayjs().add(days, 'day').format('ddd, DD MMM')

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
