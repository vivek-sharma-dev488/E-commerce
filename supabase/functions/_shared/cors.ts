export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature, x-razorpay-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const handleOptions = () =>
  new Response('ok', {
    headers: corsHeaders,
  })

export const jsonResponse = (
  data: Record<string, unknown>,
  status = 200,
) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
