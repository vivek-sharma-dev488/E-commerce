-- Retailer role + staff RLS patch (run after 20260403_admin_rls_patch.sql)
--
-- Adds a third role `retailer` and treats `admin` + `retailer` as "staff" for
-- order management and product management operations.
--
-- Safe to run multiple times.

-- 1) Add enum value
alter type public.user_role add value if not exists 'retailer';

-- 1b) Retailer self-signup role assignment
-- Allow a user to self-register as `retailer` (but never `admin`) via user metadata.
-- `raw_app_meta_data` is still honored for privileged server-side assignments.
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_auth_user_created();

-- 2) Role helpers
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
      and role::text = 'retailer'
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
      and role::text in ('admin', 'retailer')
  );
$$;

grant execute on function public.is_retailer() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;

-- 3) Policy updates (drop + recreate)

-- abandoned carts (analytics)
drop policy if exists "abandoned_carts_admin_read" on public.abandoned_carts;
create policy "abandoned_carts_admin_read" on public.abandoned_carts
for select using (public.is_staff());

-- orders
drop policy if exists "orders_owner_read" on public.orders;
create policy "orders_owner_read" on public.orders
for select using (auth.uid() = user_id or public.is_staff());

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
for update using (public.is_staff())
with check (public.is_staff());

-- order items
drop policy if exists "order_items_owner_read" on public.order_items;
create policy "order_items_owner_read" on public.order_items
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = auth.uid() or public.is_staff())
  )
);

-- payments (optional but keeps staff operations consistent)
drop policy if exists "payments_owner_read" on public.payments;
create policy "payments_owner_read" on public.payments
for select using (auth.uid() = user_id or public.is_staff());

drop policy if exists "payments_admin_update" on public.payments;
create policy "payments_admin_update" on public.payments
for update using (public.is_staff())
with check (public.is_staff());

-- inventory logs
drop policy if exists "inventory_logs_admin_read" on public.inventory_logs;
create policy "inventory_logs_admin_read" on public.inventory_logs
for select using (public.is_staff());

drop policy if exists "inventory_logs_admin_insert" on public.inventory_logs;
create policy "inventory_logs_admin_insert" on public.inventory_logs
for insert with check (public.is_staff());

-- products / variants management
drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
for all using (public.is_staff())
with check (public.is_staff());

drop policy if exists "variants_admin_write" on public.variants;
create policy "variants_admin_write" on public.variants
for all using (public.is_staff())
with check (public.is_staff());

-- storage: product images
drop policy if exists "product_images_admin_write" on storage.objects;
create policy "product_images_admin_write" on storage.objects
for insert with check (
  bucket_id = 'product-images'
  and public.is_staff()
);

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects
for update using (
  bucket_id = 'product-images'
  and public.is_staff()
)
with check (
  bucket_id = 'product-images'
  and public.is_staff()
);

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete" on storage.objects
for delete using (
  bucket_id = 'product-images'
  and public.is_staff()
);
