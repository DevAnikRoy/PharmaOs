-- Cash sales are committed together with their FEFO batch allocations.
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id),
  request_id uuid not null,
  request_lines jsonb not null,
  payment_method text not null default 'cash' check (payment_method = 'cash'),
  total numeric(12,2) not null check (total >= 0 and total <> 'NaN'::numeric),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default statement_timestamp(),
  unique (pharmacy_id, request_id),
  unique (id, pharmacy_id)
);
create index sales_pharmacy_created_idx on public.sales(pharmacy_id, created_at desc, id);

create table public.sale_lines (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id),
  sale_id uuid not null,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0 and unit_price <> 'NaN'::numeric),
  line_total numeric(12,2) generated always as (quantity * unit_price) stored,
  brand_name_en text not null,
  brand_name_bn text,
  strength text not null,
  form public.medicine_form not null,
  pack_unit public.pack_unit not null,
  pack_quantity integer not null,
  foreign key (sale_id, pharmacy_id) references public.sales(id, pharmacy_id),
  unique (sale_id, product_id),
  unique (id, pharmacy_id)
);
alter table public.stock_batches add constraint stock_batches_id_pharmacy_unique unique (id, pharmacy_id);
create table public.sale_allocations (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id),
  sale_line_id uuid not null,
  batch_id uuid not null,
  quantity integer not null check (quantity > 0),
  -- Capture receipt details and purchase cost at the time of sale.
  batch_number text not null,
  expiry_date date not null,
  purchase_price numeric(12,2) not null,
  foreign key (sale_line_id, pharmacy_id) references public.sale_lines(id, pharmacy_id),
  foreign key (batch_id, pharmacy_id) references public.stock_batches(id, pharmacy_id),
  unique (sale_line_id, batch_id)
);
create index sale_lines_sale_idx on public.sale_lines(sale_id);
create index sale_allocations_line_idx on public.sale_allocations(sale_line_id);
create index sale_allocations_batch_idx on public.sale_allocations(batch_id);

alter table public.sales enable row level security;
alter table public.sale_lines enable row level security;
alter table public.sale_allocations enable row level security;
create policy sales_select_own on public.sales for select to authenticated
  using (pharmacy_id = public.current_pharmacy_id());
create policy sale_lines_select_own on public.sale_lines for select to authenticated
  using (pharmacy_id = public.current_pharmacy_id());
create policy sale_allocations_select_own on public.sale_allocations for select to authenticated
  using (pharmacy_id = public.current_pharmacy_id());
revoke all on public.sales, public.sale_lines, public.sale_allocations from public, anon, authenticated;
grant select on public.sales, public.sale_lines, public.sale_allocations to authenticated;

create function public.complete_cash_sale(p_request_id uuid, p_lines jsonb)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
  item jsonb;
  normalized jsonb;
  existing public.sales%rowtype;
  product public.products%rowtype;
  line record;
  batch record;
  sale_id_value uuid;
  line_id uuid;
  remaining integer;
  taken integer;
  total_value numeric;
  today date := (statement_timestamp() at time zone 'Asia/Dhaka')::date;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  pid := public.current_pharmacy_id();
  if pid is null then raise exception 'No pharmacy for this user'; end if;
  if p_request_id is null then raise exception 'Invalid sale'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then raise exception 'Invalid sale'; end if;
  if jsonb_array_length(p_lines) not between 1 and 100 then raise exception 'Invalid sale'; end if;

  for item in select value from jsonb_array_elements(p_lines) loop
    if jsonb_typeof(item) <> 'object'
      or coalesce(item->>'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(item->'product_id') is distinct from 'string'
      or jsonb_typeof(item->'quantity') is distinct from 'number'
      or coalesce(item->>'quantity', '') !~ '^[0-9]{1,10}$'
      or coalesce(jsonb_typeof(item->'unit_price'), '') not in ('string', 'number')
      or coalesce(item->>'unit_price', '') !~ '^[0-9]{1,10}(\.[0-9]{1,2})?$' then
      raise exception 'Invalid sale';
    end if;
    if (item->>'quantity')::bigint not between 1 and 2147483647
      or (item->>'unit_price')::numeric > 9999999999.99 then
      raise exception 'Invalid sale';
    end if;
  end loop;

  if (select count(distinct (value->>'product_id')::uuid) from jsonb_array_elements(p_lines))
    <> jsonb_array_length(p_lines) then raise exception 'Duplicate medicine'; end if;
  select jsonb_agg(jsonb_build_object('product_id', x.product_id, 'quantity', x.quantity,
    'unit_price', x.unit_price) order by x.product_id), sum(x.quantity::numeric * x.unit_price)
  into normalized, total_value
  from jsonb_to_recordset(p_lines) as x(product_id uuid, quantity integer, unit_price numeric);
  if total_value > 9999999999.99 then raise exception 'Sale total too large'; end if;

  -- Serialize retries before checking prior results. A retry returns the original
  -- receipt even when its batches are now depleted or have since expired.
  perform pg_advisory_xact_lock(hashtextextended('sale:' || pid::text || ':' || p_request_id::text, 0));
  select * into existing from public.sales where pharmacy_id = pid and request_id = p_request_id;
  if found then
    if existing.request_lines <> normalized then raise exception 'Sale reference already used with different details'; end if;
    return existing.id;
  end if;

  insert into public.sales(pharmacy_id, request_id, request_lines, total, created_by)
  values (pid, p_request_id, normalized, total_value, uid) returning id into sale_id_value;

  -- Every sale locks products in the same order, preventing reverse-cart deadlocks.
  -- Wait on competing batch locks rather than skipping them and reporting false shortages.
  for line in select * from jsonb_to_recordset(normalized)
    as x(product_id uuid, quantity integer, unit_price numeric) order by product_id loop
    select * into product from public.products where id = line.product_id;
    if not found then raise exception 'Medicine not found'; end if;
    insert into public.sale_lines(pharmacy_id, sale_id, product_id, quantity, unit_price,
      brand_name_en, brand_name_bn, strength, form, pack_unit, pack_quantity)
    values (pid, sale_id_value, product.id, line.quantity, line.unit_price,
      product.brand_name_en, product.brand_name_bn, product.strength, product.form,
      product.pack_unit, product.pack_quantity) returning id into line_id;
    remaining := line.quantity;
    for batch in
      select * from public.stock_batches
      where pharmacy_id = pid and product_id = line.product_id
        and quantity_remaining > 0 and expiry_date >= today
      order by expiry_date, created_at, id for update
    loop
      taken := least(remaining, batch.quantity_remaining);
      update public.stock_batches set quantity_remaining = quantity_remaining - taken where id = batch.id;
      insert into public.sale_allocations(pharmacy_id, sale_line_id, batch_id, quantity,
        batch_number, expiry_date, purchase_price)
      values (pid, line_id, batch.id, taken, batch.batch_number, batch.expiry_date, batch.purchase_price);
      remaining := remaining - taken;
      exit when remaining = 0;
    end loop;
    if remaining > 0 then raise exception 'Insufficient sellable stock'; end if;
  end loop;
  return sale_id_value;
end;
$$;
revoke all on function public.complete_cash_sale(uuid, jsonb) from public, anon;
grant execute on function public.complete_cash_sale(uuid, jsonb) to authenticated;

-- Aggregate in Postgres so dashboard totals are not truncated by API row limits.
create view public.daily_cash_sales with (security_invoker = true) as
select pharmacy_id, (created_at at time zone 'Asia/Dhaka')::date as sale_date,
  count(*) as sale_count, sum(total) as total
from public.sales group by pharmacy_id, (created_at at time zone 'Asia/Dhaka')::date;
revoke all on public.daily_cash_sales from public, anon;
grant select on public.daily_cash_sales to authenticated;
