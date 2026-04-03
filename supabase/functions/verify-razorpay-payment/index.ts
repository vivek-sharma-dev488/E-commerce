
// @ts-nocheck
import { corsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts'
import { requireUser, supabaseAdmin } from '../_shared/supabaseAdmin.ts'

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

const createHmacSha256 = async (secret: string, value: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return toHex(signature)
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return handleOptions()
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  try {
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!razorpayKeySecret) {
      throw new Error('RAZORPAY_KEY_SECRET is required.')
    }

    const user = await requireUser(request)

    const {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = await request.json()

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new Error('Missing required Razorpay verification fields.')
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found.')
    }

    if (order.user_id !== user.id) {
      throw new Error('You are not allowed to verify this payment.')
    }

    const expectedSignature = await createHmacSha256(
      razorpayKeySecret,
      `${razorpayOrderId}|${razorpayPaymentId}`,
    )

    if (expectedSignature !== razorpaySignature) {
      throw new Error('Invalid Razorpay payment signature.')
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('order_id', orderId)
      .eq('provider', 'razorpay')
      .filter('metadata->>razorpay_order_id', 'eq', String(razorpayOrderId))
      .limit(1)
      .maybeSingle()

    if (paymentError) {
      throw new Error(paymentError.message)
    }

    if (payment?.id) {
      await supabaseAdmin
        .from('payments')
        .update({
          provider_payment_id: razorpayPaymentId,
          status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
    }

    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_reference: razorpayPaymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return jsonResponse({
      success: true,
      orderId,
      transactionId: razorpayPaymentId,
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error.' }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  }
})
