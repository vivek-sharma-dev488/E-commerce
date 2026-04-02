// @ts-nocheck
import { corsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts'
import { requireUser, supabaseAdmin } from '../_shared/supabaseAdmin.ts'

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return handleOptions()
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  try {
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required.')
    }

    const user = await requireUser(request)

    const {
      orderId,
      amount,
      currency = 'INR',
    } = await request.json()

    if (!orderId || !amount) {
      throw new Error('orderId and amount are required.')
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, total_amount')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found.')
    }

    if (order.user_id !== user.id) {
      throw new Error('You are not allowed to pay for this order.')
    }

    const orderAmount = Number(order.total_amount || 0)
    const requestedAmount = Number(amount || 0)

    if (Math.abs(orderAmount - requestedAmount) > 1) {
      throw new Error('Order amount mismatch.')
    }

    const authHeader = `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`

    const gatewayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(orderAmount * 100),
        currency: String(currency).toUpperCase(),
        receipt: String(orderId),
        notes: {
          order_id: String(orderId),
          user_id: String(user.id),
        },
      }),
    })

    if (!gatewayResponse.ok) {
      const gatewayError = await gatewayResponse.text()
      throw new Error(`Razorpay order creation failed: ${gatewayError}`)
    }

    const gatewayOrder = await gatewayResponse.json()

    const { error: paymentInsertError } = await supabaseAdmin.from('payments').insert({
      order_id: orderId,
      user_id: user.id,
      provider: 'razorpay',
      provider_payment_id: null,
      amount: orderAmount,
      currency: String(currency).toUpperCase(),
      status: 'pending',
      method: 'upi',
      metadata: {
        razorpay_order_id: gatewayOrder.id,
      },
    })

    if (paymentInsertError) {
      throw new Error(paymentInsertError.message)
    }

    await supabaseAdmin
      .from('orders')
      .update({
        payment_method: 'upi',
        payment_status: 'pending',
        payment_reference: gatewayOrder.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return jsonResponse({
      keyId: razorpayKeyId,
      orderId: gatewayOrder.id,
      amount: gatewayOrder.amount,
      currency: gatewayOrder.currency,
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
