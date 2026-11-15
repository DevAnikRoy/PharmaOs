-- Rename the local variable so it does not clash with pharmacy_prices.product_id.

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
