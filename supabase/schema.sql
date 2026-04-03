-- Northstar Commerce Supabase schema
-- Run in Supabase SQL editor or migration files.

create extension if not exists pgcrypto;

-- ============================================================================
-- Enums
-- ============================================================================

create type public.user_role as enum ('user', 'admin', 'retailer');
create type public.order_status as enum (
  'ordered',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled'
);
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'cod');
create type public.refund_status as enum ('requested', 'approved', 'rejected', 'completed');
create type public.notification_type as enum (
  'order_update',
  'back_in_stock',
  'coupon',
  'flash_sale',
  'refund',
  'cart_reminder'
);

-- ============================================================================
-- Utility trigger
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- Users / Profiles
-- ============================================================================

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'user',
  loyalty_points integer not null default 0,
  referral_code text unique,
  referred_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_users_role on public.users (role);
create index idx_users_created_at on public.users (created_at desc);

create trigger trg_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role public.user_role;
  requested_role text;
  privileged_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', '');
  privileged_role := coalesce(new.raw_app_meta_data ->> 'role', '');

  assigned_role := 'user'::public.user_role;

  if requested_role = 'retailer' then
    assigned_role := 'retailer'::public.user_role;
  end if;

  if privileged_role = 'admin' then
    assigned_role := 'admin'::public.user_role;
  elsif privileged_role = 'retailer' then
    assigned_role := 'retailer'::public.user_role;
  end if;

  insert into public.users (id, email, full_name, role, referral_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    assigned_role,
    upper(substr(md5(new.id::text), 1, 8))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_auth_user_created();

-- ============================================================================
-- Catalog
-- ============================================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null,
  slug text not null unique,
  brand text,
  short_description text,
  description text,
  specifications jsonb not null default '{}'::jsonb,
  price numeric(12, 2) not null check (price >= 0),
  compare_at_price numeric(12, 2) check (compare_at_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  sold_count integer not null default 0,
  rating numeric(2, 1) not null default 0,
  review_count integer not null default 0,
  images text[] not null default '{}',
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  badges text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_category_id on public.products (category_id);
create index idx_products_slug on public.products (slug);
create index idx_products_brand on public.products (brand);
create index idx_products_price on public.products (price);
create index idx_products_created_at on public.products (created_at desc);
create index idx_products_stock on public.products (stock);

create trigger trg_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

create table public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text unique,
  size text,
  color text,
  mrp numeric(12, 2),
  sale_price numeric(12, 2),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_variants_product_id on public.variants (product_id);
create index idx_variants_sku on public.variants (sku);

create trigger trg_variants_updated_at
before update on public.variants
for each row
execute function public.set_updated_at();

-- ============================================================================
-- Cart / Wishlist / Recently Viewed
-- ============================================================================

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.variants (id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  selected_size text,
  selected_color text,
  saved_for_later boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, variant_id, saved_for_later)
);

create index idx_cart_items_user_id on public.cart_items (user_id);
create index idx_cart_items_user_saved on public.cart_items (user_id, saved_for_later);

create trigger trg_cart_items_updated_at
before update on public.cart_items
for each row
execute function public.set_updated_at();

create table public.abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  restored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_abandoned_carts_updated_at
before update on public.abandoned_carts
for each row
execute function public.set_updated_at();

create table public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index idx_wishlist_user_id on public.wishlist (user_id);

create table public.recently_viewed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index idx_recently_viewed_user_viewed_at on public.recently_viewed (user_id, viewed_at desc);

-- ============================================================================
-- Orders / Payments
-- ============================================================================

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  country text not null default 'India',
  phone text,
  label text not null default 'home',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_addresses_user_id on public.addresses (user_id);
create index idx_addresses_pincode on public.addresses (pincode);

create trigger trg_addresses_updated_at
before update on public.addresses
for each row
execute function public.set_updated_at();

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  address_id uuid references public.addresses (id) on delete set null,
  status public.order_status not null default 'ordered',
  payment_status public.payment_status not null default 'pending',
  payment_method text,
  payment_reference text,
  subtotal numeric(12, 2) not null default 0,
  shipping_fee numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  shipping_address jsonb not null default '{}'::jsonb,
  estimated_delivery_at timestamptz,
  delivered_at timestamptz,
  return_eligible_till timestamptz,
  timeline jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_user_id on public.orders (user_id);
create index idx_orders_status on public.orders (status);
create index idx_orders_created_at on public.orders (created_at desc);
create index idx_orders_payment_status on public.orders (payment_status);

create trigger trg_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.variants (id) on delete set null,
  product_name text not null,
  sku text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null,
  selected_size text,
  selected_color text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_order_items_order_id on public.order_items (order_id);
create index idx_order_items_product_id on public.order_items (product_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  provider text not null,
  provider_payment_id text,
  amount numeric(12, 2) not null,
  currency text not null default 'INR',
  status public.payment_status not null default 'pending',
  method text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payments_order_id on public.payments (order_id);
create index idx_payments_user_id on public.payments (user_id);
create index idx_payments_status on public.payments (status);

create trigger trg_payments_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

-- ============================================================================
-- Engagement
-- ============================================================================

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  title text,
  comment text,
  helpful_votes integer not null default 0,
  is_verified_purchase boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, order_id)
);

create index idx_reviews_product_id on public.reviews (product_id);
create index idx_reviews_user_id on public.reviews (user_id);
create index idx_reviews_rating on public.reviews (rating);

create trigger trg_reviews_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();

create table public.review_helpful_votes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (review_id, user_id)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  question text not null,
  answer text,
  answered_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_questions_product_id on public.questions (product_id);
create index idx_questions_user_id on public.questions (user_id);

create trigger trg_questions_updated_at
before update on public.questions
for each row
execute function public.set_updated_at();

create table public.user_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  points integer not null default 0,
  lifetime_points integer not null default 0,
  tier text not null default 'bronze',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_rewards_updated_at
before update on public.user_rewards
for each row
execute function public.set_updated_at();

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.users (id) on delete cascade,
  referee_user_id uuid references public.users (id) on delete set null,
  referral_code text not null,
  reward_points integer not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_referrals_referrer on public.referrals (referrer_user_id);

create trigger trg_referrals_updated_at
before update on public.referrals
for each row
execute function public.set_updated_at();

-- ============================================================================
-- Promotions / Refunds / Notifications / Inventory
-- ============================================================================

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'flat', 'shipping')),
  discount_value numeric(12, 2) not null,
  minimum_order_amount numeric(12, 2) not null default 0,
  max_discount_amount numeric(12, 2),
  starts_at timestamptz,
  expires_at timestamptz,
  usage_limit integer,
  usage_count integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_coupons_code on public.coupons (code);
create index idx_coupons_active_dates on public.coupons (is_active, starts_at, expires_at);

create trigger trg_coupons_updated_at
before update on public.coupons
for each row
execute function public.set_updated_at();

create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  reason text not null,
  details text,
  status public.refund_status not null default 'requested',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_refund_requests_order_id on public.refund_requests (order_id);
create index idx_refund_requests_status on public.refund_requests (status);

create trigger trg_refund_requests_updated_at
before update on public.refund_requests
for each row
execute function public.set_updated_at();

create table public.replacement_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  reason text not null,
  details text,
  status public.refund_status not null default 'requested',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_replacement_requests_order_id on public.replacement_requests (order_id);

create trigger trg_replacement_requests_updated_at
before update on public.replacement_requests
for each row
execute function public.set_updated_at();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_created on public.notifications (user_id, created_at desc);
create index idx_notifications_unread on public.notifications (user_id, is_read);

create table public.inventory_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.variants (id) on delete set null,
  changed_by uuid references public.users (id) on delete set null,
  old_stock integer,
  new_stock integer,
  reason text,
  created_at timestamptz not null default now()
);

create index idx_inventory_logs_product_id on public.inventory_logs (product_id);
create index idx_inventory_logs_created_at on public.inventory_logs (created_at desc);

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.cart_items enable row level security;
alter table public.abandoned_carts enable row level security;
alter table public.wishlist enable row level security;
alter table public.recently_viewed enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.review_helpful_votes enable row level security;
alter table public.questions enable row level security;
alter table public.user_rewards enable row level security;
alter table public.referrals enable row level security;
alter table public.coupons enable row level security;
alter table public.refund_requests enable row level security;
alter table public.replacement_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.inventory_logs enable row level security;

-- Admin helper
-- Supabase access tokens include `role` like `anon`/`authenticated` (not your app's user role).
-- Use the role stored in public.users for admin access checks.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.is_retailer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'retailer'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role in ('admin', 'retailer')
  );
$$;

grant execute on function public.is_retailer() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;

-- Public read catalog
create policy "catalog_read_categories" on public.categories
for select using (is_active = true);

create policy "catalog_read_products" on public.products
for select using (is_active = true);

create policy "catalog_read_variants" on public.variants
for select using (true);

-- users table
create policy "users_read_own" on public.users
for select using (auth.uid() = id or public.is_admin());

create policy "users_update_own" on public.users
for update using (auth.uid() = id)
with check (auth.uid() = id and role = 'user');

create policy "users_update_admin" on public.users
for update using (public.is_admin())
with check (public.is_admin());

-- user-owned data
create policy "cart_items_owner_all" on public.cart_items
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "abandoned_carts_owner_all" on public.abandoned_carts
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "abandoned_carts_admin_read" on public.abandoned_carts
for select using (public.is_staff());

create policy "wishlist_owner_all" on public.wishlist
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "recently_viewed_owner_all" on public.recently_viewed
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "addresses_owner_all" on public.addresses
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "orders_owner_read" on public.orders
for select using (auth.uid() = user_id or public.is_staff());

create policy "orders_owner_insert" on public.orders
for insert with check (auth.uid() = user_id);

create policy "orders_admin_update" on public.orders
for update using (public.is_staff())
with check (public.is_staff());

create policy "order_items_owner_read" on public.order_items
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = auth.uid() or public.is_staff())
  )
);

create policy "order_items_owner_insert" on public.order_items
for insert with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and o.user_id = auth.uid()
  )
);

create policy "payments_owner_read" on public.payments
for select using (auth.uid() = user_id or public.is_staff());

create policy "payments_owner_insert" on public.payments
for insert with check (auth.uid() = user_id);

create policy "payments_admin_update" on public.payments
for update using (public.is_staff())
with check (public.is_staff());

create policy "reviews_public_read" on public.reviews
for select using (true);

create policy "reviews_owner_insert" on public.reviews
for insert with check (auth.uid() = user_id);

create policy "reviews_owner_update" on public.reviews
for update using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "review_votes_owner_all" on public.review_helpful_votes
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "questions_public_read" on public.questions
for select using (true);

create policy "questions_owner_insert" on public.questions
for insert with check (auth.uid() = user_id);

create policy "questions_owner_or_admin_update" on public.questions
for update using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "user_rewards_owner_read" on public.user_rewards
for select using (auth.uid() = user_id or public.is_admin());

create policy "referrals_owner_read" on public.referrals
for select using (
  auth.uid() = referrer_user_id
  or auth.uid() = referee_user_id
  or public.is_admin()
);

create policy "notifications_owner_all" on public.notifications
for all using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "refund_owner_read_insert" on public.refund_requests
for select using (auth.uid() = user_id or public.is_admin());

create policy "refund_owner_insert" on public.refund_requests
for insert with check (auth.uid() = user_id);

create policy "refund_admin_update" on public.refund_requests
for update using (public.is_admin())
with check (public.is_admin());

create policy "replacement_owner_read_insert" on public.replacement_requests
for select using (auth.uid() = user_id or public.is_admin());

create policy "replacement_owner_insert" on public.replacement_requests
for insert with check (auth.uid() = user_id);

create policy "replacement_admin_update" on public.replacement_requests
for update using (public.is_admin())
with check (public.is_admin());

create policy "inventory_logs_admin_read" on public.inventory_logs
for select using (public.is_staff());

create policy "inventory_logs_admin_insert" on public.inventory_logs
for insert with check (public.is_staff());

create policy "coupons_public_read_active" on public.coupons
for select using (is_active = true or public.is_admin());

create policy "coupons_admin_write" on public.coupons
for all using (public.is_admin())
with check (public.is_admin());

create policy "categories_admin_write" on public.categories
for all using (public.is_admin())
with check (public.is_admin());

create policy "products_admin_write" on public.products
for all using (public.is_staff())
with check (public.is_staff());

create policy "variants_admin_write" on public.variants
for all using (public.is_staff())
with check (public.is_staff());

-- ============================================================================
-- Realtime subscriptions
-- ============================================================================

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.refund_requests;
alter publication supabase_realtime add table public.replacement_requests;
alter publication supabase_realtime add table public.inventory_logs;
alter publication supabase_realtime add table public.cart_items;

-- ============================================================================
-- Storage buckets
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('avatars', 'avatars', true),
  ('invoices', 'invoices', false)
on conflict (id) do nothing;

create policy "product_images_public_read" on storage.objects
for select using (bucket_id = 'product-images');

create policy "product_images_admin_write" on storage.objects
for insert with check (
  bucket_id = 'product-images'
  and public.is_staff()
);

create policy "product_images_admin_update" on storage.objects
for update using (
  bucket_id = 'product-images'
  and public.is_staff()
)
with check (
  bucket_id = 'product-images'
  and public.is_staff()
);

create policy "product_images_admin_delete" on storage.objects
for delete using (
  bucket_id = 'product-images'
  and public.is_staff()
);

create policy "avatars_public_read" on storage.objects
for select using (bucket_id = 'avatars');

create policy "avatars_owner_write" on storage.objects
for insert with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatars_owner_update" on storage.objects
for update using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "invoices_owner_read" on storage.objects
for select using (
  bucket_id = 'invoices'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin()
  )
);

create policy "invoices_admin_write" on storage.objects
for insert with check (
  bucket_id = 'invoices'
  and public.is_admin()
);
