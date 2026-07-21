-- DD Cottages: bookings, member access, and roles
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  property text not null check (property in ('DD Cottages', 'DD Villa', 'DD Serenity Cottages')),
  room_number text not null,
  guest_name text not null,
  mobile text,
  source text not null default 'Direct',
  check_in date not null,
  check_out date not null,
  adults integer not null default 1 check (adults > 0),
  children integer not null default 0 check (children >= 0),
  gross_amount numeric(12,2) not null default 0,
  extra_charges numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  commission numeric(12,2) not null default 0,
  tds numeric(12,2) not null default 0,
  payment_status text not null default 'Pending',
  payment_method text,
  paid_to text,
  settlement_status text not null default 'Pending',
  checked_out boolean not null default false,
  created_at timestamptz not null default now(),
  constraint valid_stay check (check_out > check_in)
);

create index if not exists bookings_dates_idx on public.bookings (check_in, check_out);
create index if not exists bookings_room_idx on public.bookings (room_number, check_in, check_out);

alter table public.bookings drop constraint if exists bookings_property_check;
alter table public.bookings add constraint bookings_property_check
  check (property in ('DD Cottages', 'DD Villa', 'DD Serenity Cottages'));

create table if not exists public.cash_handover_entries (
  id uuid primary key default gen_random_uuid(),
  handover_to text not null,
  amount numeric(12,2) not null default 0,
  notes text not null default '',
  entry_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  property text,
  description text not null,
  amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cash_handover_entries_date_idx on public.cash_handover_entries (entry_date, created_at desc);
create index if not exists expenses_date_idx on public.expenses (entry_date, created_at desc);

-- Actual reception state. Existing bookings remain reserved until checked in.
alter table public.bookings add column if not exists stay_status text not null default 'reserved'
  check (stay_status in ('reserved', 'checked_in', 'checked_out', 'cancelled'));
alter table public.bookings add column if not exists checked_in_at timestamptz;
alter table public.bookings add column if not exists checked_out_at timestamptz;
alter table public.bookings add column if not exists checked_out boolean not null default false;
alter table public.bookings add column if not exists advance_paid numeric(12,2) not null default 0;

-- One-time room renumbering: converts existing 01–15 records to 101–115.
update public.bookings
set room_number = (100 + room_number::integer)::text
where room_number ~ '^0?[1-9]$|^1[0-5]$'
  and room_number::integer between 1 and 15;

-- A profile is created automatically each time someone registers through Supabase Auth.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('admin', 'staff')),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  created_at timestamptz not null default now()
);

create schema if not exists app_security;
revoke all on schema app_security from public;
grant usage on schema app_security to authenticated;

create or replace function app_security.is_active_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active');
$$;

create or replace function app_security.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active');
$$;

revoke all on function app_security.is_active_member() from public;
revoke all on function app_security.is_admin() from public;
grant execute on function app_security.is_active_member() to authenticated;
grant execute on function app_security.is_admin() to authenticated;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.create_profile_for_new_user();

-- Explicit Data API permissions. RLS below decides what rows are available.
grant select, insert, update, delete on public.bookings to authenticated;
grant select, insert, update, delete on public.cash_handover_entries to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
grant select, update on public.profiles to authenticated;

alter table public.bookings enable row level security;
alter table public.cash_handover_entries enable row level security;
alter table public.expenses enable row level security;
alter table public.profiles enable row level security;

-- Remove the original unauthenticated prototype policy if it was previously installed.
drop policy if exists "temporary admin prototype access" on public.bookings;
drop policy if exists "Active members manage bookings" on public.bookings;
create policy "Active members manage bookings" on public.bookings
  for all to authenticated
  using ((select app_security.is_active_member()))
  with check ((select app_security.is_active_member()));

drop policy if exists "Members see own profile or admins see all" on public.profiles;
create policy "Members see own profile or admins see all" on public.profiles
  for select to authenticated
  using (id = auth.uid() or (select app_security.is_admin()));

drop policy if exists "Active members manage cash handover entries" on public.cash_handover_entries;
create policy "Active members manage cash handover entries" on public.cash_handover_entries
  for all to authenticated
  using ((select app_security.is_active_member()))
  with check ((select app_security.is_active_member()));

drop policy if exists "Active members manage expenses" on public.expenses;
create policy "Active members manage expenses" on public.expenses
  for all to authenticated
  using ((select app_security.is_active_member()))
  with check ((select app_security.is_active_member()));

drop policy if exists "Admins manage member access" on public.profiles;
create policy "Admins manage member access" on public.profiles
  for update to authenticated
  using ((select app_security.is_admin()))
  with check ((select app_security.is_admin()));