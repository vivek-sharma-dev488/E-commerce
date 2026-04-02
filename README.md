# Northstar Commerce

Modern full-stack e-commerce starter built with React, Tailwind CSS, React Router, Zustand, and Supabase.

This project includes:

- User and admin auth flows
- Product catalog and detail pages
- Cart, save for later, coupon logic, and checkout
- Orders with timeline tracking and realtime-ready updates
- Address management with pincode validation and delivery checks
- Wishlist, reviews, Q&A, referral and loyalty engagement blocks
- Admin dashboard, analytics, inventory alerts, coupon management, CSV upload
- Supabase schema with foreign keys, indexes, RLS policies, realtime publications, and storage buckets

## Tech Stack

- React + Vite
- Tailwind CSS
- React Router
- Zustand
- Supabase (Auth, Postgres, Storage, Realtime)
- Recharts
- Stripe and Razorpay secure payment flow via Supabase Edge Functions

## Quick Start

1. Install dependencies

	npm install

2. Create environment file

	Copy `.env.example` to `.env` and fill values.

3. Start development server

	npm run dev

4. Build for production

	npm run build

5. Lint

	npm run lint

## Environment Variables

Defined in `.env.example`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Supabase Edge Function secrets required for payments:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `APP_URL` (for Stripe checkout return/cancel URLs)

## Supabase Setup

1. Create a new Supabase project.
2. Run SQL from `supabase/schema.sql` in SQL editor.
3. Enable Google provider under Auth settings if needed.
4. Set site URL and redirect URLs:

	- `http://localhost:5173`
	- `http://localhost:5173/reset-password`

5. Add storage bucket policies (already included in SQL).

6. Configure edge function secrets:

	`supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... RAZORPAY_WEBHOOK_SECRET=... APP_URL=...`

7. Deploy payment edge functions:

	- `supabase functions deploy create-stripe-checkout-session`
	- `supabase functions deploy create-razorpay-order`
	- `supabase functions deploy verify-razorpay-payment`
	- `supabase functions deploy stripe-webhook`
	- `supabase functions deploy razorpay-webhook`

8. Configure provider webhook URLs:

	- Stripe: `https://<project-ref>.functions.supabase.co/stripe-webhook`
	- Razorpay: `https://<project-ref>.functions.supabase.co/razorpay-webhook`

## Architecture

Project is feature-driven and component-based:

- `src/app`: providers and route orchestration
- `src/components`: reusable UI building blocks
- `src/features`: page-level domain modules
- `src/hooks`: shared hooks
- `src/services`: API and backend integrations
- `src/store`: Zustand stores
- `src/lib`: constants and utilities
- `src/routes`: protected and admin route guards
- `supabase`: SQL schema and backend setup

## Core Routes

- `/`
- `/catalog`
- `/product/:slug`
- `/login`, `/signup`, `/forgot-password`, `/reset-password`
- `/cart`, `/checkout`
- `/orders`, `/orders/:orderId`
- `/wishlist`, `/addresses`, `/notifications`
- `/admin`, `/admin/products`, `/admin/orders`, `/admin/users`

## Production Notes

- Route-level lazy loading is enabled for scalable bundle strategy.
- Toasts, loading states, empty states, and error boundary are included.
- Tailwind theme supports dark mode and modern glass-like cards.
- Payment creation and verification for Stripe/Razorpay is handled server-side in Supabase Edge Functions.

## Interview-Ready Discussion Points

- RLS-first Supabase schema design
- Auth lifecycle with role-aware guarded routing
- Secure server-side payment intent/order creation and webhook reconciliation
- Scalable folder architecture for rapid feature growth
- Realtime notification and order tracking subscription flow
