-- Signup can be safely retried after confirmation or a partial onboarding failure.
create or replace function public.complete_owner_signup(
  pharmacy_name text, owner_full_name text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select pharmacy_id into pid from public.users where id = uid;
  if pid is not null then return pid; end if;
  if pharmacy_name is null or trim(pharmacy_name) = '' then
    raise exception 'Pharmacy name is required';
  end if;
  insert into public.pharmacies (name) values (trim(pharmacy_name)) returning id into pid;
  insert into public.users (id, pharmacy_id, role, full_name)
  values (uid, pid, 'owner', nullif(trim(owner_full_name), ''));
  return pid;
end;
$$;
revoke all on function public.complete_owner_signup(text, text) from public, anon;
grant execute on function public.complete_owner_signup(text, text) to authenticated;

-- One receipt is one purchase lot. Quantities and prices refer to whole catalog packs.
-- Repeated batch numbers are allowed on separate receipts; request_id prevents retries
-- of the same receipt from increasing stock twice.
create table public.stock_batches (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  product_id uuid not null references public.products(id),
  request_id uuid not null,
  batch_number text not null check (char_length(trim(batch_number)) between 1 and 100),
  expiry_date date not null check (isfinite(expiry_date)),
  received_quantity integer not null check (received_quantity > 0),
  quantity_remaining integer not null check (quantity_remaining >= 0 and quantity_remaining <= received_quantity),
  purchase_price numeric(12,2) not null check (purchase_price >= 0 and purchase_price <> 'NaN'::numeric),
  received_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (pharmacy_id, request_id)
);
create index stock_batches_fefo_idx on public.stock_batches
  (pharmacy_id, product_id, expiry_date, created_at, id) where quantity_remaining > 0;
alter table public.stock_batches enable row level security;
create policy stock_batches_select_own on public.stock_batches for select to authenticated
  using (pharmacy_id = public.current_pharmacy_id());
revoke all on public.stock_batches from public, anon, authenticated;
grant select on public.stock_batches to authenticated;

create or replace function public.receive_stock_batch(
  p_product_id uuid, p_request_id uuid, p_batch_number text,
  p_expiry_date date, p_quantity integer, p_purchase_price numeric
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
  existing public.stock_batches%rowtype;
  batch_id uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  pid := public.current_pharmacy_id();
  if pid is null then raise exception 'No pharmacy for this user'; end if;
  if p_request_id is null then raise exception 'Receipt reference is required'; end if;
  if p_batch_number is null or char_length(trim(p_batch_number)) not between 1 and 100 then
    raise exception 'Batch number must contain 1 to 100 characters';
  end if;
  if p_expiry_date is null or not isfinite(p_expiry_date) then
    raise exception 'A finite expiry date is required';
  end if;
  if p_quantity is null or p_quantity < 1 then raise exception 'Quantity must be a positive whole pack count'; end if;
  if p_purchase_price is null or p_purchase_price < 0 or p_purchase_price = 'NaN'::numeric
    or p_purchase_price > 9999999999.99 or p_purchase_price <> round(p_purchase_price, 2) then
    raise exception 'Enter a valid purchase price with at most two decimal places';
  end if;
  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'Medicine not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(pid::text || p_request_id::text, 0));
  select * into existing from public.stock_batches
    where pharmacy_id = pid and request_id = p_request_id;
  if found then
    if existing.product_id is distinct from p_product_id
      or existing.batch_number is distinct from trim(p_batch_number)
      or existing.expiry_date is distinct from p_expiry_date
      or existing.received_quantity is distinct from p_quantity
      or existing.purchase_price is distinct from p_purchase_price then
      raise exception 'Receipt reference already used with different details';
    end if;
    return existing.id;
  end if;

  insert into public.stock_batches (
    pharmacy_id, product_id, request_id, batch_number, expiry_date,
    received_quantity, quantity_remaining, purchase_price, received_by
  ) values (
    pid, p_product_id, p_request_id, trim(p_batch_number), p_expiry_date,
    p_quantity, p_quantity, p_purchase_price, uid
  ) returning id into batch_id;
  return batch_id;
end;
$$;
revoke all on function public.receive_stock_batch(uuid, uuid, text, date, integer, numeric) from public, anon;
grant execute on function public.receive_stock_batch(uuid, uuid, text, date, integer, numeric) to authenticated;

-- The expiry date itself is sellable; it becomes expired the following Dhaka day.
create view public.pharmacy_stock with (security_invoker = true) as
select pharmacy_id, product_id,
  sum(quantity_remaining)::bigint as total_packs,
  coalesce(sum(quantity_remaining) filter (
    where expiry_date >= (now() at time zone 'Asia/Dhaka')::date
  ), 0)::bigint as sellable_packs,
  coalesce(sum(quantity_remaining) filter (
    where expiry_date < (now() at time zone 'Asia/Dhaka')::date
  ), 0)::bigint as expired_packs,
  min(expiry_date) filter (
    where quantity_remaining > 0 and expiry_date >= (now() at time zone 'Asia/Dhaka')::date
  ) as next_expiry
from public.stock_batches group by pharmacy_id, product_id;
revoke all on public.pharmacy_stock from public, anon;
grant select on public.pharmacy_stock to authenticated;
