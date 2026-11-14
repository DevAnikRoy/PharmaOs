-- PharmaOS foundation: pharmacies + app users + RLS

create type public.user_role as enum ('owner', 'staff');

create table public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  role public.user_role not null default 'owner',
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_pharmacy_id_idx on public.users (pharmacy_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pharmacies_set_updated_at
  before update on public.pharmacies
  for each row
  execute function public.set_updated_at();

create trigger users_set_updated_at
  before update on public.users
  for each row
  execute function public.set_updated_at();

create or replace function public.current_pharmacy_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select pharmacy_id from public.users where id = auth.uid();
$$;

revoke all on function public.current_pharmacy_id() from public;
grant execute on function public.current_pharmacy_id() to authenticated;

create or replace function public.complete_owner_signup(
  pharmacy_name text,
  owner_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_pharmacy_id uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.users where id = uid) then
    raise exception 'User already has a pharmacy profile';
  end if;

  if pharmacy_name is null or trim(pharmacy_name) = '' then
    raise exception 'Pharmacy name is required';
  end if;

  insert into public.pharmacies (name)
  values (trim(pharmacy_name))
  returning id into new_pharmacy_id;

  insert into public.users (id, pharmacy_id, role, full_name)
  values (uid, new_pharmacy_id, 'owner', nullif(trim(owner_full_name), ''));

  return new_pharmacy_id;
end;
$$;

revoke all on function public.complete_owner_signup(text, text) from public;
grant execute on function public.complete_owner_signup(text, text) to authenticated;

alter table public.pharmacies enable row level security;
alter table public.users enable row level security;

create policy pharmacies_select_same_tenant
  on public.pharmacies
  for select
  to authenticated
  using (id = public.current_pharmacy_id());

create policy users_select_self
  on public.users
  for select
  to authenticated
  using (id = auth.uid());

create policy users_select_same_tenant
  on public.users
  for select
  to authenticated
  using (pharmacy_id = public.current_pharmacy_id());