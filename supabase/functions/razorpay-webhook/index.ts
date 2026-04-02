// @ts-nocheck
import { corsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

type PaymentState = 'pending' | 'paid' | 'failed' | 'refunded' | 'cod'

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

const findRazorpayPayment = async (
  orderId: string,
  gatewayOrderId: string,
) => {
  const byGatewayOrderId = await supabaseAdmin
    .from('payments')
    .select('id, metadata')
    .eq('order_id', orderId)
    .eq('provider', 'razorpay')
    .filter('metadata->>razorpay_order_id', 'eq', String(gatewayOrderId))
    .limit(1)
    .maybeSingle()

  if (byGatewayOrderId.error) {
    throw new Error(byGatewayOrderId.error.message)
  }

  if (byGatewayOrderId.data) {
    return byGatewayOrderId.data
  }

  const byOrder = await supabaseAdmin
    .from('payments')
    .select('id, metadata')
    .eq('order_id', orderId)
    .eq('provider', 'razorpay')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (byOrder.error) {
    throw new Error(byOrder.error.message)
  }

  return byOrder.data
}

const updateRazorpayPaymentState = async ({
  orderId,
  gatewayOrderId,
  gatewayPaymentId,
  paymentStatus,
  method,
  amount,
  eventId,
  eventName,
}: {
  orderId: string
  gatewayOrderId: string
  gatewayPaymentId: string
  paymentStatus: PaymentState
  method: string
  amount: number
  eventId: string
  eventName: string
}) => {
  const payment = await findRazorpayPayment(orderId, gatewayOrderId)

  const metadata = {
    ...(payment?.metadata || {}),
    razorpay_order_id: gatewayOrderId,
    razorpay_payment_id: gatewayPaymentId,
    last_webhook_event: eventName,
    last_webhook_event_id: eventId,
  }

  if (payment?.id) {
    const { error: paymentUpdateError } = await supabaseAdmin
      .from('payments')
      .update({
        provider_payment_id: gatewayPaymentId || gatewayOrderId,
        status: paymentStatus,
        method,
        amount,
        metadata,
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
      payment_status: paymentStatus,
      payment_method: method,
      payment_reference: gatewayPaymentId || gatewayOrderId,
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
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')

    if (!webhookSecret) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET is required.')
    }

    const signature = request.headers.get('x-razorpay-signature')

    if (!signature) {
      throw new Error('Missing x-razorpay-signature header.')
    }

    const rawBody = await request.text()
    const expectedSignature = await createHmacSha256(webhookSecret, rawBody)

    if (expectedSignature !== signature) {
      throw new Error('Invalid Razorpay webhook signature.')
    }

    const payload = JSON.parse(rawBody)
    const eventName = String(payload?.event || '')

    const paymentEntity = payload?.payload?.payment?.entity || {}
    const orderEntity = payload?.payload?.order?.entity || {}

    const appOrderId =
      paymentEntity?.notes?.order_id ||
      orderEntity?.notes?.order_id ||
      orderEntity?.receipt ||
      null

    if (!appOrderId) {
      return jsonResponse({ received: true, ignored: true, reason: 'Missing order reference.' })
    }

    const gatewayOrderId = String(paymentEntity?.order_id || orderEntity?.id || '')
    const gatewayPaymentId = String(paymentEntity?.id || gatewayOrderId)

    const amountPaise = Number(paymentEntity?.amount || orderEntity?.amount || 0)
    const amount = Number.isFinite(amountPaise) ? amountPaise / 100 : 0

    let paymentStatus: PaymentState = 'pending'

    if (['payment.captured', 'order.paid'].includes(eventName)) {
      paymentStatus = 'paid'
    } else if (['payment.failed'].includes(eventName)) {
      paymentStatus = 'failed'
    } else if (['refund.processed', 'payment.refunded'].includes(eventName)) {
      paymentStatus = 'refunded'
    } else {
      return jsonResponse({ received: true, ignored: true, eventType: eventName })
    }

    await updateRazorpayPaymentState({
      orderId: String(appOrderId),
      gatewayOrderId,
      gatewayPaymentId,
      paymentStatus,
      method: paymentEntity?.method || 'upi',
      amount,
      eventId: String(payload?.payload?.payment?.entity?.id || payload?.created_at || Date.now()),
      eventName,
    })

    return jsonResponse({ received: true, eventType: eventName })
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
