import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { CartItemRow } from '../../components/cart/CartItemRow'
import { FreeShippingProgress } from '../../components/cart/FreeShippingProgress'
import { PriceSummary } from '../../components/cart/PriceSummary'
import { Button } from '../../components/common/Button'
import { EmptyState } from '../../components/common/EmptyState'
import { SectionTitle } from '../../components/common/SectionTitle'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'

export function CartPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const items = useCartStore((state) => state.items)
  const _couponCode = useCartStore((state) => state.couponCode)
  const _shippingFee = useCartStore((state) => state.shippingFee)
  const getCartItems = useCartStore((state) => state.getCartItems)
  const getSavedItems = useCartStore((state) => state.getSavedItems)
  const getSummary = useCartStore((state) => state.getSummary)
  const removeFromCart = useCartStore((state) => state.removeFromCart)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const toggleSaveForLater = useCartStore((state) => state.toggleSaveForLater)
  const applyCoupon = useCartStore((state) => state.applyCoupon)
  const clearCoupon = useCartStore((state) => state.clearCoupon)
  const syncCartToServer = useCartStore((state) => state.syncCartToServer)
  const saveAbandonedCart = useCartStore((state) => state.saveAbandonedCart)

  const cartItems = getCartItems()
  const savedItems = getSavedItems()
  const summary = getSummary()

  const [couponInput, setCouponInput] = useState('')

  useEffect(() => {
    if (user?.id) {
      syncCartToServer(user.id)
    }
  }, [items, user?.id, syncCartToServer])

  useEffect(() => {
    const onBeforeUnload = () => {
      if (user?.id && items.length) {
        saveAbandonedCart(user.id)
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [items, user?.id, saveAbandonedCart])

  const handleApplyCoupon = () => {
    const result = applyCoupon(couponInput)

    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.message)
    }
  }

  if (!cartItems.length && !savedItems.length) {
    return (
      <EmptyState
        action={
          <Button onClick={() => navigate('/catalog')}>
            Continue Shopping
          </Button>
        }
        description="Browse products and add items to start checkout."
        title="Your cart is empty"
      />
    )
  }

  return (
    <div className="space-y-6">
      <SectionTitle subtitle="Review, update, and checkout" title="Shopping Cart" />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <FreeShippingProgress subtotal={summary.subtotal} />

          {cartItems.length ? (
            <div className="space-y-3">
              {cartItems.map((item) => (
                <CartItemRow
                  item={item}
                  key={item.id}
                  onRemove={removeFromCart}
                  onToggleSave={toggleSaveForLater}
                  onUpdateQuantity={updateQuantity}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              description="No active cart items. Move saved products back into cart."
              title="No active items"
            />
          )}

          {savedItems.length ? (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Saved for later</h3>
              {savedItems.map((item) => (
                <CartItemRow
                  item={item}
                  key={item.id}
                  onRemove={removeFromCart}
                  onToggleSave={toggleSaveForLater}
                  onUpdateQuantity={updateQuantity}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Apply coupon</p>
            <div className="mt-3 flex gap-2">
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                onChange={(event) => setCouponInput(event.target.value)}
                placeholder="Enter coupon code"
                value={couponInput}
              />
              <Button onClick={handleApplyCoupon} type="button" variant="outline">
                Apply
              </Button>
            </div>
            <button
              className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
              onClick={clearCoupon}
              type="button"
            >
              Clear coupon
            </button>
          </div>

          <PriceSummary summary={summary} onCheckout={() => navigate('/checkout')} />
        </div>
      </div>
    </div>
  )
}
