declare const Deno: {
  env: {
    get(name: string): string | undefined
  }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

declare module 'https://esm.sh/@supabase/supabase-js@2.49.4' {
  export const createClient: any
}

declare module 'https://esm.sh/stripe@14.25.0?target=deno' {
  const Stripe: any
  export default Stripe
}
