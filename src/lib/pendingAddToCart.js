const STORAGE_KEY = 'northstar.pendingAddToCart.v1'

export const setPendingAddToCart = (product, payload = {}) => {
  if (!product) {
    return
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        product,
        payload,
        createdAt: Date.now(),
      }),
    )
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}

export const consumePendingAddToCart = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return null
    }

    window.localStorage.removeItem(STORAGE_KEY)
    const parsed = JSON.parse(raw)

    if (!parsed?.product) {
      return null
    }

    return {
      product: parsed.product,
      payload: parsed.payload || {},
    }
  } catch {
    return null
  }
}
