-- Admin role + RLS patch (run on an existing database)
--
-- This migration avoids re-running the full schema.sql (which fails with
-- "already exists" errors once your schema has been created).
--
-- Safe to run multiple times.

begin;

-- -----------------------------------------------------------------------------
-- 1) Admin helper
-- -----------------------------------------------------------------------------
-- Supabase access tokens include a `role` claim like `anon` / `authenticated`.
-- That is NOT your application role. Use public.users.role instead.
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

-- -----------------------------------------------------------------------------
-- 2) User profile trigger (avoid trusting user-controlled metadata for roles)
-- -----------------------------------------------------------------------------
create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role, referral_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'user'),
    upper(substr(md5(new.id::text), 1, 8))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Keep trigger attached to auth.users and pointing at the latest function.
-- (Postgres doesn't support CREATE TRIGGER IF NOT EXISTS.)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_auth_user_created();

-- -----------------------------------------------------------------------------
-- 3) RLS policies (drop + recreate)
-- -----------------------------------------------------------------------------

-- users

drop policy if exists "users_read_own" on public.users;
create policy "users_read_own" on public.users
for select using (auth.uid() = id or public.is_admin());

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
for update using (auth.uid() = id)
with check (auth.uid() = id and role = 'user');

drop policy if exists "users_update_admin" on public.users;
create policy "users_update_admin" on public.users
for update using (public.is_admin())
with check (public.is_admin());

-- orders

drop policy if exists "orders_owner_read" on public.orders;
create policy "orders_owner_read" on public.orders
for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "orders_owner_insert" on public.orders;
create policy "orders_owner_insert" on public.orders
for insert with check (auth.uid() = user_id);

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
for update using (public.is_admin())
with check (public.is_admin());

-- order_items

drop policy if exists "order_items_owner_read" on public.order_items;
create policy "order_items_owner_read" on public.order_items
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "order_items_owner_insert" on public.order_items;
create policy "order_items_owner_insert" on public.order_items
for insert with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and o.user_id = auth.uid()
  )
);

-- payments

drop policy if exists "payments_owner_read" on public.payments;
create policy "payments_owner_read" on public.payments
for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "payments_owner_insert" on public.payments;
create policy "payments_owner_insert" on public.payments
for insert with check (auth.uid() = user_id);

drop policy if exists "payments_admin_update" on public.payments;
create policy "payments_admin_update" on public.payments
for update using (public.is_admin())
with check (public.is_admin());

-- reviews

drop policy if exists "reviews_owner_update" on public.reviews;
create policy "reviews_owner_update" on public.reviews
for update using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

-- questions

drop policy if exists "questions_owner_or_admin_update" on public.questions;
create policy "questions_owner_or_admin_update" on public.questions
for update using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

-- user_rewards

drop policy if exists "user_rewards_owner_read" on public.user_rewards;
create policy "user_rewards_owner_read" on public.user_rewards
for select using (auth.uid() = user_id or public.is_admin());

-- referrals

drop policy if exists "referrals_owner_read" on public.referrals;
create policy "referrals_owner_read" on public.referrals
for select using (
  auth.uid() = referrer_user_id
  or auth.uid() = referee_user_id
  or public.is_admin()
);

-- notifications

drop policy if exists "notifications_owner_all" on public.notifications;
create policy "notifications_owner_all" on public.notifications
for all using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

-- refunds

drop policy if exists "refund_owner_read_insert" on public.refund_requests;
create policy "refund_owner_read_insert" on public.refund_requests
for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "refund_admin_update" on public.refund_requests;
create policy "refund_admin_update" on public.refund_requests
for update using (public.is_admin())
with check (public.is_admin());

-- replacements

drop policy if exists "replacement_owner_read_insert" on public.replacement_requests;
create policy "replacement_owner_read_insert" on public.replacement_requests
for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "replacement_admin_update" on public.replacement_requests;
create policy "replacement_admin_update" on public.replacement_requests
for update using (public.is_admin())
with check (public.is_admin());

-- inventory logs

drop policy if exists "inventory_logs_admin_read" on public.inventory_logs;
create policy "inventory_logs_admin_read" on public.inventory_logs
for select using (public.is_admin());

drop policy if exists "inventory_logs_admin_insert" on public.inventory_logs;
create policy "inventory_logs_admin_insert" on public.inventory_logs
for insert with check (public.is_admin());

-- coupons

drop policy if exists "coupons_public_read_active" on public.coupons;
create policy "coupons_public_read_active" on public.coupons
for select using (is_active = true or public.is_admin());

drop policy if exists "coupons_admin_write" on public.coupons;
create policy "coupons_admin_write" on public.coupons
for all using (public.is_admin())
with check (public.is_admin());

-- catalog admin

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "variants_admin_write" on public.variants;
create policy "variants_admin_write" on public.variants
for all using (public.is_admin())
with check (public.is_admin());

-- abandoned carts (needed for admin analytics)

drop policy if exists "abandoned_carts_admin_read" on public.abandoned_carts;
create policy "abandoned_carts_admin_read" on public.abandoned_carts
for select using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4) Storage policies (drop + recreate)
-- -----------------------------------------------------------------------------

-- product-images

drop policy if exists "product_images_admin_write" on storage.objects;
create policy "product_images_admin_write" on storage.objects
for insert with check (
  bucket_id = 'product-images'
  and public.is_admin()
);

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects
for update using (
  bucket_id = 'product-images'
  and public.is_admin()
)
with check (
  bucket_id = 'product-images'
  and public.is_admin()
);

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete" on storage.objects
for delete using (
  bucket_id = 'product-images'
  and public.is_admin()
);

-- invoices

drop policy if exists "invoices_owner_read" on storage.objects;
create policy "invoices_owner_read" on storage.objects
for select using (
  bucket_id = 'invoices'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin()
  )
);

drop policy if exists "invoices_admin_write" on storage.objects;
create policy "invoices_admin_write" on storage.objects
for insert with check (
  bucket_id = 'invoices'
  and public.is_admin()
);

commit;
