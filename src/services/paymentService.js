import { PAYMENT_METHODS } from '../lib/constants'
import { getSupabaseClient } from './supabaseClient'

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })

const invokeEdgeFunction = async (name, body) => {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.functions.invoke(name, {
    body,
  })

  if (error) {
    throw new Error(error.message || `Edge function ${name} failed.`)
  }

  if (!data) {
    throw new Error(`Edge function ${name} returned no data.`)
  }

  return data
}

export const paymentService = {
  async processPayment({ method, amount, orderId, user }) {
    if (method === PAYMENT_METHODS.COD) {
      return {
        success: true,
        gateway: 'cod',
        transactionId: `cod_${Date.now()}`,
        amount,
        orderId,
      }
    }

    if (method === PAYMENT_METHODS.CARD) {
      const response = await invokeEdgeFunction('create-stripe-checkout-session', {
        orderId,
        amount,
        currency: 'INR',
      })

      if (!response.url) {
        throw new Error('Stripe checkout session URL was not returned.')
      }

      return {
        success: true,
        gateway: 'stripe',
        transactionId: response.sessionId || response.id,
        amount,
        orderId,
        requiresRedirect: true,
        redirectUrl: response.url,
      }
    }

    if (method === PAYMENT_METHODS.UPI) {
      const loaded = await loadRazorpayScript()

      if (!loaded) {
        throw new Error('Razorpay SDK failed to load.')
      }

      const response = await invokeEdgeFunction('create-razorpay-order', {
        orderId,
        amount,
        currency: 'INR',
      })

      return new Promise((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: response.keyId,
          amount: response.amount,
          currency: response.currency,
          order_id: response.orderId,
          name: 'Northstar Commerce',
          description: `Order ${orderId}`,
          prefill: {
            name: user?.name || 'Customer',
            email: user?.email || 'customer@example.com',
          },
          handler: async (gatewayResponse) => {
            try {
              await invokeEdgeFunction('verify-razorpay-payment', {
                orderId,
                razorpayOrderId: response.orderId,
                razorpayPaymentId: gatewayResponse.razorpay_payment_id,
                razorpaySignature: gatewayResponse.razorpay_signature,
              })

              resolve({
                success: true,
                gateway: 'razorpay',
                transactionId: gatewayResponse.razorpay_payment_id,
                orderId,
                amount,
              })
            } catch (error) {
              reject(error)
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled by user.')),
          },
        })

        razorpay.open()
      })
    }

    throw new Error('Unsupported payment method.')
  },
}
