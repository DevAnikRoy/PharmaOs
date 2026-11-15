-- Phase 2: shared medicine catalog + per-pharmacy selling price.
-- No stock quantities in this migration.

create type public.medicine_form as enum (
  'tablet',
  'capsule',
  'syrup',
  'suspension',
  'injection',
  'cream',
  'drops',
  'inhaler',
  'other'
);

create type public.pack_unit as enum (
  'strip',
  'box',
  'bottle',
  'vial',
  'tube',
  'piece'
);

create table public.generics (
  id uuid primary key default gen_random_uuid(),
  name_en text not null check (char_length(trim(name_en)) > 0),
  name_bn text,
  created_at timestamptz not null default now()
);

create unique index generics_name_en_lower_idx
  on public.generics (lower(name_en));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  generic_id uuid not null references public.generics (id),
  brand_name_en text not null check (char_length(trim(brand_name_en)) > 0),
  brand_name_bn text,
  strength text not null check (char_length(trim(strength)) > 0),
  form public.medicine_form not null,
  pack_unit public.pack_unit not null,
  pack_quantity integer not null check (pack_quantity > 0),
  manufacturer text,
  created_at timestamptz not null default now()
);

create index products_generic_id_idx on public.products (generic_id);

create unique index products_identity_idx
  on public.products (
    generic_id,
    lower(brand_name_en),
    lower(strength),
    form,
    pack_unit,
    pack_quantity
  );

create table public.pharmacy_prices (
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  selling_price numeric(12, 2) not null check (selling_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (pharmacy_id, product_id)
);

create trigger pharmacy_prices_set_updated_at
  before update on public.pharmacy_prices
  for each row
  execute function public.set_updated_at();

create or replace view public.product_catalog
with (security_invoker = true) as
select
  p.id,
  p.generic_id,
  p.brand_name_en,
  p.brand_name_bn,
  p.strength,
  p.form,
  p.pack_unit,
  p.pack_quantity,
  p.manufacturer,
  g.name_en as generic_name_en,
  g.name_bn as generic_name_bn
from public.products p
join public.generics g on g.id = p.generic_id;

create or replace function public.add_pharmacy_medicine(
  p_generic_name_en text,
  p_generic_name_bn text,
  p_brand_name_en text,
  p_brand_name_bn text,
  p_strength text,
  p_form public.medicine_form,
  p_pack_unit public.pack_unit,
  p_pack_quantity integer,
  p_manufacturer text,
  p_selling_price numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
  gid uuid;
  new_product_id uuid;
  generic_en text := trim(p_generic_name_en);
  brand_en text := trim(p_brand_name_en);
  strength_value text := trim(p_strength);
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select pharmacy_id into pid from public.users where id = uid;
  if pid is null then
    raise exception 'No pharmacy for this user';
  end if;

  if generic_en = '' or brand_en = '' or strength_value = '' then
    raise exception 'Generic, brand, and strength are required';
  end if;

  if p_pack_quantity is null or p_pack_quantity < 1 then
    raise exception 'Pack quantity must be at least 1';
  end if;

  if p_selling_price is null or p_selling_price < 0 then
    raise exception 'Selling price must be zero or more';
  end if;

  select id into gid
  from public.generics
  where lower(name_en) = lower(generic_en);

  if gid is null then
    insert into public.generics (name_en, name_bn)
    values (generic_en, nullif(trim(p_generic_name_bn), ''))
    returning id into gid;
  elsif nullif(trim(p_generic_name_bn), '') is not null then
    update public.generics
    set name_bn = trim(p_generic_name_bn)
    where id = gid and (name_bn is null or name_bn = '');
  end if;

  select id into new_product_id
  from public.products
  where generic_id = gid
    and lower(brand_name_en) = lower(brand_en)
    and lower(strength) = lower(strength_value)
    and form = p_form
    and pack_unit = p_pack_unit
    and pack_quantity = p_pack_quantity;

  if new_product_id is null then
    insert into public.products (
      generic_id,
      brand_name_en,
      brand_name_bn,
      strength,
      form,
      pack_unit,
      pack_quantity,
      manufacturer
    )
    values (
      gid,
      brand_en,
      nullif(trim(p_brand_name_bn), ''),
      strength_value,
      p_form,
      p_pack_unit,
      p_pack_quantity,
      nullif(trim(p_manufacturer), '')
    )
    returning id into new_product_id;
  end if;

  insert into public.pharmacy_prices (pharmacy_id, product_id, selling_price)
  values (pid, new_product_id, p_selling_price)
  on conflict (pharmacy_id, product_id)
  do update set selling_price = excluded.selling_price;

  return new_product_id;
end;
$$;

create or replace function public.set_pharmacy_price(
  p_product_id uuid,
  p_selling_price numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select pharmacy_id into pid from public.users where id = uid;
  if pid is null then
    raise exception 'No pharmacy for this user';
  end if;

  if p_selling_price is null or p_selling_price < 0 then
    raise exception 'Selling price must be zero or more';
  end if;

  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'Medicine not found';
  end if;

  insert into public.pharmacy_prices (pharmacy_id, product_id, selling_price)
  values (pid, p_product_id, p_selling_price)
  on conflict (pharmacy_id, product_id)
  do update set selling_price = excluded.selling_price;
end;
$$;

revoke all on function public.add_pharmacy_medicine(
  text, text, text, text, text, public.medicine_form, public.pack_unit, integer, text, numeric
) from public, anon;
grant execute on function public.add_pharmacy_medicine(
  text, text, text, text, text, public.medicine_form, public.pack_unit, integer, text, numeric
) to authenticated;

revoke all on function public.set_pharmacy_price(uuid, numeric) from public, anon;
grant execute on function public.set_pharmacy_price(uuid, numeric) to authenticated;

alter table public.generics enable row level security;
alter table public.products enable row level security;
alter table public.pharmacy_prices enable row level security;

create policy generics_select_authenticated
  on public.generics
  for select
  to authenticated
  using (true);

create policy products_select_authenticated
  on public.products
  for select
  to authenticated
  using (true);

create policy pharmacy_prices_select_own
  on public.pharmacy_prices
  for select
  to authenticated
  using (pharmacy_id = public.current_pharmacy_id());

revoke all on public.generics from anon, public;
revoke all on public.products from anon, public;
revoke all on public.pharmacy_prices from anon, public;
grant select on public.generics to authenticated;
grant select on public.products to authenticated;
grant select on public.pharmacy_prices to authenticated;
grant select on public.product_catalog to authenticated;

-- Sample shared catalog so substitution search works before a shop adds brands.
-- Prices stay empty until a pharmacy sets them.
insert into public.generics (name_en, name_bn)
values
  ('Paracetamol', 'প্যারাসিটামল'),
  ('Omeprazole', 'ওমেপ্রাজল');

insert into public.products (
  generic_id, brand_name_en, brand_name_bn, strength, form, pack_unit, pack_quantity, manufacturer
)
select g.id, v.brand_en, v.brand_bn, v.strength, v.form::public.medicine_form, v.pack_unit::public.pack_unit, v.qty, v.maker
from public.generics g
join (
  values
    ('Paracetamol', 'Napa', 'নাপা', '500 mg', 'tablet', 'strip', 10, 'Beximco'),
    ('Paracetamol', 'Ace', 'এইস', '500 mg', 'tablet', 'strip', 10, 'Square'),
    ('Paracetamol', 'Reset', 'রিসেট', '500 mg', 'tablet', 'strip', 10, 'Renata'),
    ('Omeprazole', 'Seclo', 'সেক্লো', '20 mg', 'capsule', 'strip', 10, 'Square'),
    ('Omeprazole', 'Losectil', 'লসেকটিল', '20 mg', 'capsule', 'strip', 10, 'Eskayef'),
    ('Omeprazole', 'Odopen', 'ওডোপেন', '20 mg', 'capsule', 'strip', 10, 'Ziska')
) as v(generic_en, brand_en, brand_bn, strength, form, pack_unit, qty, maker)
  on lower(g.name_en) = lower(v.generic_en);
