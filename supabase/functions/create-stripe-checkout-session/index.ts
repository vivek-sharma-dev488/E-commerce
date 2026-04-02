// @ts-nocheck
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
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
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured.')
    }

    const user = await requireUser(request)

    const {
      orderId,
      amount,
      currency = 'INR',
      returnUrlBase,
    } = await request.json()

    if (!orderId || !amount) {
      throw new Error('orderId and amount are required.')
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, total_amount, payment_status')
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

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const baseUrl = returnUrlBase || Deno.env.get('APP_URL') || 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      payment_method_types: ['card'],
      client_reference_id: String(orderId),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: String(currency).toLowerCase(),
            unit_amount: Math.round(orderAmount * 100),
            product_data: {
              name: `Northstar Order #${orderId}`,
              description: 'Card payment for Northstar Commerce order',
            },
          },
        },
      ],
      metadata: {
        order_id: String(orderId),
        user_id: String(user.id),
      },
      success_url: `${baseUrl}/orders/${orderId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout?order=${orderId}&payment=cancelled`,
    })

    const { error: paymentInsertError } = await supabaseAdmin.from('payments').insert({
      order_id: orderId,
      user_id: user.id,
      provider: 'stripe',
      provider_payment_id: session.id,
      amount: orderAmount,
      currency: String(currency).toUpperCase(),
      status: 'pending',
      method: 'card',
      metadata: {
        stripe_session_id: session.id,
      },
    })

    if (paymentInsertError) {
      throw new Error(paymentInsertError.message)
    }

    await supabaseAdmin
      .from('orders')
      .update({
        payment_method: 'card',
        payment_status: 'pending',
        payment_reference: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return jsonResponse({
      id: session.id,
      sessionId: session.id,
      url: session.url,
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
