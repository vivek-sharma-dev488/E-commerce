// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in edge functions.')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

export const requireUser = async (request: Request) => {
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '').trim()
    : null

  if (!token) {
    throw new Error('Missing bearer token.')
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    throw new Error('Unauthorized request.')
  }

  return data.user
}
