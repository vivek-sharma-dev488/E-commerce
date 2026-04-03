import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { SectionTitle } from '../../components/common/SectionTitle'
import { PAYMENT_METHODS } from '../../lib/constants'
import { formatCurrency } from '../../lib/utils'
import { addressService } from '../../services/addressService'
import { orderService } from '../../services/orderService'
import { paymentService } from '../../services/paymentService'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'

export function CheckoutPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const _items = useCartStore((state) => state.items)
  const _couponCode = useCartStore((state) => state.couponCode)
  const _shippingFee = useCartStore((state) => state.shippingFee)
  const getCartItems = useCartStore((state) => state.getCartItems)
  const getSummary = useCartStore((state) => state.getSummary)
  const clearCart = useCartStore((state) => state.clearCart)

  const cartItems = getCartItems()
  const summary = getSummary()

  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.COD)
  const [placingOrder, setPlacingOrder] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadAddresses = async () => {
      const data = await addressService.fetchAddresses(user?.id)

      if (!cancelled) {
        setAddresses(data)
        const defaultAddress = data.find((address) => address.isDefault || address.is_default)
        setSelectedAddressId(defaultAddress?.id || data[0]?.id || '')
      }
    }

    loadAddresses()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId),
    [addresses, selectedAddressId],
  )

  const handlePlaceOrder = async () => {
    if (!cartItems.length) {
      toast.error('Your cart is empty')
      return
    }

    if (!selectedAddress) {
      toast.error('Please select a delivery address')
      return
    }

    try {
      setPlacingOrder(true)

      const { data: createdOrder, error: createOrderError } = await orderService.createOrder({
        user_id: user?.id,
        address_id: selectedAddress.id,
        total_amount: summary.total,
        subtotal: summary.subtotal,
        shipping_fee: summary.shipping,
        tax_amount: summary.tax,
        discount_amount: summary.couponDiscount,
        status: 'ordered',
        payment_status: paymentMethod === PAYMENT_METHODS.COD ? 'cod' : 'pending',
        payment_method: paymentMethod,
        shipping_address: selectedAddress,
        timeline: ['ordered'],
        metadata: {
          source: 'web-checkout',
        },
        items: cartItems.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
          selected_size: item.selectedSize,
          selected_color: item.selectedColor,
          product_name: item.product.name,
          snapshot: {
            name: item.product.name,
            slug: item.product.slug,
            brand: item.product.brand,
            images: item.product.images,
          },
        })),
      })

      if (createOrderError || !createdOrder) {
        throw new Error(createOrderError?.message || 'Unable to create order.')
      }

      const payment = await paymentService.processPayment({
        method: paymentMethod,
        amount: summary.total,
        orderId: createdOrder.id,
        user: {
          name: user?.user_metadata?.full_name,
          email: user?.email,
        },
      })

      if (!payment.success) {
        throw new Error('Payment could not be completed')
      }

      if (paymentMethod === PAYMENT_METHODS.COD) {
        await orderService.updateOrderPayment(createdOrder.id, {
          payment_status: 'cod',
          payment_reference: payment.transactionId,
        })
      }

      if (payment.requiresRedirect && payment.redirectUrl) {
        clearCart()
        toast.success('Redirecting to secure payment page...')
        window.location.assign(payment.redirectUrl)
        return
      }

      clearCart()
      toast.success('Order placed successfully')
      navigate(`/orders/${createdOrder.id}`)
    } catch (error) {
      toast.error(error.message || 'Checkout failed')
    } finally {
      setPlacingOrder(false)
    }
  }

  if (!cartItems.length) {
    return (
      <EmptyState
        action={
          <Button onClick={() => navigate('/catalog')}>
            Shop Products
          </Button>
        }
        description="Add items to cart before proceeding to checkout."
        title="No items for checkout"
      />
    )
  }

  return (
    <div className="space-y-6">
      <SectionTitle subtitle="Secure and fast checkout" title="Checkout" />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Select delivery address</h3>
            <div className="mt-4 space-y-3">
              {addresses.map((address) => (
                <label
                  className={`block cursor-pointer rounded-xl border p-4 ${
                    selectedAddressId === address.id
                      ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/25'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                  key={address.id}
                >
                  <input
                    checked={selectedAddressId === address.id}
                    className="sr-only"
                    name="address"
                    onChange={() => setSelectedAddressId(address.id)}
                    type="radio"
                  />
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{address.name}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {address.line1}, {address.line2}, {address.city}, {address.state} - {address.pincode}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {address.label || 'home'}
                  </p>
                </label>
              ))}
            </div>
            <Button className="mt-4" onClick={() => navigate('/addresses')} variant="outline">
              Manage Addresses
            </Button>
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Payment method</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <button
                className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                  paymentMethod === PAYMENT_METHODS.COD
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200'
                }`}
                onClick={() => setPaymentMethod(PAYMENT_METHODS.COD)}
                type="button"
              >
                Cash on Delivery
              </button>
              <button
                className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                  paymentMethod === PAYMENT_METHODS.UPI
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200'
                }`}
                onClick={() => setPaymentMethod(PAYMENT_METHODS.UPI)}
                type="button"
              >
                UPI / Razorpay
              </button>
              <button
                className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                  paymentMethod === PAYMENT_METHODS.CARD
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200'
                }`}
                onClick={() => setPaymentMethod(PAYMENT_METHODS.CARD)}
                type="button"
              >
                Card / Stripe
              </button>
            </div>
          </Card>
        </div>

        <Card className="h-fit space-y-3 p-5">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Order Summary</h3>
          {cartItems.map((item) => (
            <div className="flex items-center gap-3" key={item.id}>
              <img
                alt={item.product.name}
                className="h-12 w-12 rounded-lg object-cover"
                src={item.product.images[0]}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {item.product.name}
                </p>
                <p className="text-xs text-slate-500">Qty {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {formatCurrency(item.product.price * item.quantity)}
              </p>
            </div>
          ))}

          <div className="space-y-1 border-t border-slate-200 pt-3 text-sm dark:border-slate-700">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Subtotal</span>
              <span>{formatCurrency(summary.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Shipping</span>
              <span>{summary.shipping ? formatCurrency(summary.shipping) : 'Free'}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Tax</span>
              <span>{formatCurrency(summary.tax)}</span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span>Discount</span>
              <span>-{formatCurrency(summary.couponDiscount)}</span>
            </div>
            <div className="flex justify-between pt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
              <span>Total</span>
              <span>{formatCurrency(summary.total)}</span>
            </div>
          </div>

          <Button className="w-full" disabled={placingOrder} onClick={handlePlaceOrder}>
            {placingOrder ? 'Placing order...' : 'Place Order'}
          </Button>
        </Card>
      </div>
    </div>
  )
}
