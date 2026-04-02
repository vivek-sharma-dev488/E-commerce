// @ts-nocheck
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { corsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

type StripePaymentState = 'pending' | 'paid' | 'failed' | 'refunded' | 'cod'

const findStripePayment = async (orderId: string, sessionId: string) => {
  const byProviderPaymentId = await supabaseAdmin
    .from('payments')
    .select('id, metadata')
    .eq('order_id', orderId)
    .eq('provider', 'stripe')
    .eq('provider_payment_id', sessionId)
    .limit(1)
    .maybeSingle()

  if (!byProviderPaymentId.error && byProviderPaymentId.data) {
    return byProviderPaymentId.data
  }

  const byMetadata = await supabaseAdmin
    .from('payments')
    .select('id, metadata')
    .eq('order_id', orderId)
    .eq('provider', 'stripe')
    .filter('metadata->>stripe_session_id', 'eq', String(sessionId))
    .limit(1)
    .maybeSingle()

  if (byMetadata.error) {
    throw new Error(byMetadata.error.message)
  }

  return byMetadata.data
}

const updateStripePaymentState = async ({
  orderId,
  sessionId,
  paymentIntentId,
  status,
  method,
  eventId,
}: {
  orderId: string
  sessionId: string
  paymentIntentId: string
  status: StripePaymentState
  method: string
  eventId: string
}) => {
  const payment = await findStripePayment(orderId, sessionId)

  const paymentMetadata = {
    ...(payment?.metadata || {}),
    stripe_session_id: sessionId,
    stripe_payment_intent_id: paymentIntentId,
    last_webhook_event_id: eventId,
  }

  if (payment?.id) {
    const { error: paymentUpdateError } = await supabaseAdmin
      .from('payments')
      .update({
        provider_payment_id: paymentIntentId || sessionId,
        status,
        method,
        metadata: paymentMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id)

    if (paymentUpdateError) {
      throw new Error(paymentUpdateError.message)
    }
  }

  const { error: orderUpdateError } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: status,
      payment_method: method,
      payment_reference: paymentIntentId || sessionId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (orderUpdateError) {
    throw new Error(orderUpdateError.message)
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return handleOptions()
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!stripeSecretKey || !stripeWebhookSecret) {
      throw new Error('STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be configured.')
    }

    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      throw new Error('Missing stripe-signature header.')
    }

    const rawBody = await request.text()

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      stripeWebhookSecret,
    )

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded' ||
      event.type === 'checkout.session.async_payment_failed' ||
      event.type === 'checkout.session.expired'
    ) {
      const session = event.data.object as Stripe.Checkout.Session

      const orderId =
        session.client_reference_id ||
        session.metadata?.order_id ||
        null

      if (!orderId) {
        throw new Error('Missing order reference in Stripe checkout session.')
      }

      const sessionId = session.id
      const paymentIntentId =
        typeof session.payment_intent === 'string' && session.payment_intent
          ? session.payment_intent
          : session.id

      const status: StripePaymentState =
        event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded'
          ? 'paid'
          : 'failed'

      await updateStripePaymentState({
        orderId: String(orderId),
        sessionId: String(sessionId),
        paymentIntentId: String(paymentIntentId),
        status,
        method: 'card',
        eventId: event.id,
      })
    }

    return jsonResponse({ received: true, eventType: event.type })
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
