-- Down da village: bookings, member access, and roles
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  property text not null check (property = 'Down da village'),
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
  comment text not null default '',
  payment_status text not null default 'Pending',
  payment_method text,
  paid_to text,
  settlement_status text not null default 'Pending',
  checked_out boolean not null default false,
  created_at timestamptz not null default now(),
  constraint valid_stay check (check_out > check_in)
);

alter table public.bookings add column if not exists comment text not null default '';

create index if not exists bookings_dates_idx on public.bookings (check_in, check_out);
create index if not exists bookings_room_idx on public.bookings (room_number, check_in, check_out);

alter table public.bookings drop constraint if exists bookings_property_check;
-- Consolidate legacy property records into the single Down da village inventory.
update public.bookings set property = 'Down da village' where property <> 'Down da village';
alter table public.bookings add constraint bookings_property_check
  check (property = 'Down da village');

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

create table if not exists public.water_bottle_entries (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  room_number text not null default '',
  quantity integer not null default 1 check (quantity > 0),
  amount numeric(12,2) not null default 0,
  entry_date date not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.water_bottle_stock (
  id uuid primary key default gen_random_uuid(),
  supplied_quantity integer not null default 0 check (supplied_quantity >= 0),
  issued_quantity integer not null default 0 check (issued_quantity >= 0),
  remaining_quantity integer not null default 0 check (remaining_quantity >= 0),
  notes text not null default '',
  entry_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists water_bottle_entries_date_idx on public.water_bottle_entries (entry_date, created_at desc);
create index if not exists water_bottle_stock_updated_at_idx on public.water_bottle_stock (updated_at desc);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null default '',
  full_name text not null default '',
  action text not null,
  details text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists cash_handover_entries_date_idx on public.cash_handover_entries (entry_date, created_at desc);
create index if not exists expenses_date_idx on public.expenses (entry_date, created_at desc);
create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);

-- Ensure required columns exist (in case of migrations)
alter table public.bookings add column if not exists stay_status text default 'reserved';
alter table public.bookings add column if not exists checked_in_at timestamptz;
alter table public.bookings add column if not exists checked_out_at timestamptz;
alter table public.bookings add column if not exists advance_paid numeric(12,2) not null default 0;

-- Add constraint for valid stay status (ignore error if already exists)
do $$
begin
  alter table public.bookings add constraint valid_stay_status 
    check (stay_status in ('reserved', 'checked_in', 'checked_out', 'cancelled'));
exception when duplicate_object then
  null;
end $$;

-- Policy: Allow authenticated users to update stay status (including to cancelled)
drop policy if exists "Allow authenticated to cancel bookings" on public.bookings;
create policy "Allow authenticated to cancel bookings"
  on public.bookings for update
  using (true)
  with check (stay_status in ('reserved', 'checked_in', 'checked_out', 'cancelled'));

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

-- Enable RLS on bookings table
alter table public.bookings enable row level security;

-- Policy: Allow authenticated users to read all bookings
drop policy if exists "Allow authenticated users to read bookings" on public.bookings;
create policy "Allow authenticated users to read bookings"
  on public.bookings for select
  using (true);

-- Policy: Allow authenticated users to create bookings
drop policy if exists "Allow authenticated users to create bookings" on public.bookings;
create policy "Allow authenticated users to create bookings"
  on public.bookings for insert
  with check (true);

-- Policy: Allow authenticated users to update bookings
drop policy if exists "Allow authenticated users to update bookings" on public.bookings;
create policy "Allow authenticated users to update bookings"
  on public.bookings for update
  using (true)
  with check (true);

-- Policy: Allow authenticated users to delete bookings
drop policy if exists "Allow authenticated users to delete bookings" on public.bookings;
create policy "Allow authenticated users to delete bookings"
  on public.bookings for delete
  using (true);

-- Enable RLS on other tables
alter table public.cash_handover_entries enable row level security;
drop policy if exists "Allow authenticated to read cash handover" on public.cash_handover_entries;
create policy "Allow authenticated to read cash handover"
  on public.cash_handover_entries for select using (true);
drop policy if exists "Allow authenticated to insert cash handover" on public.cash_handover_entries;
create policy "Allow authenticated to insert cash handover"
  on public.cash_handover_entries for insert with check (true);
drop policy if exists "Allow authenticated to update cash handover" on public.cash_handover_entries;
create policy "Allow authenticated to update cash handover"
  on public.cash_handover_entries for update using (true) with check (true);
drop policy if exists "Allow authenticated to delete cash handover" on public.cash_handover_entries;
create policy "Allow authenticated to delete cash handover"
  on public.cash_handover_entries for delete using (true);

alter table public.expenses enable row level security;
drop policy if exists "Allow authenticated to read expenses" on public.expenses;
create policy "Allow authenticated to read expenses"
  on public.expenses for select using (true);
drop policy if exists "Allow authenticated to insert expenses" on public.expenses;
create policy "Allow authenticated to insert expenses"
  on public.expenses for insert with check (true);
drop policy if exists "Allow authenticated to update expenses" on public.expenses;
create policy "Allow authenticated to update expenses"
  on public.expenses for update using (true) with check (true);
drop policy if exists "Allow authenticated to delete expenses" on public.expenses;
create policy "Allow authenticated to delete expenses"
  on public.expenses for delete using (true);

alter table public.water_bottle_entries enable row level security;
drop policy if exists "Allow authenticated to read water bottle entries" on public.water_bottle_entries;
create policy "Allow authenticated to read water bottle entries"
  on public.water_bottle_entries for select using (true);
drop policy if exists "Allow authenticated to insert water bottle entries" on public.water_bottle_entries;
create policy "Allow authenticated to insert water bottle entries"
  on public.water_bottle_entries for insert with check (true);
drop policy if exists "Allow authenticated to update water bottle entries" on public.water_bottle_entries;
create policy "Allow authenticated to update water bottle entries"
  on public.water_bottle_entries for update using (true) with check (true);
drop policy if exists "Allow authenticated to delete water bottle entries" on public.water_bottle_entries;
create policy "Allow authenticated to delete water bottle entries"
  on public.water_bottle_entries for delete using (true);

alter table public.water_bottle_stock enable row level security;
drop policy if exists "Allow authenticated to read water bottle stock" on public.water_bottle_stock;
create policy "Allow authenticated to read water bottle stock"
  on public.water_bottle_stock for select using (true);
drop policy if exists "Allow authenticated to insert water bottle stock" on public.water_bottle_stock;
create policy "Allow authenticated to insert water bottle stock"
  on public.water_bottle_stock for insert with check ((select app_security.is_admin()));
drop policy if exists "Allow authenticated to update water bottle stock" on public.water_bottle_stock;
create policy "Allow authenticated to update water bottle stock"
  on public.water_bottle_stock for update using ((select app_security.is_admin())) with check ((select app_security.is_admin()));
drop policy if exists "Allow authenticated to delete water bottle stock" on public.water_bottle_stock;
create policy "Allow authenticated to delete water bottle stock"
  on public.water_bottle_stock for delete using ((select app_security.is_admin()));

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
grant select, insert, update, delete on public.water_bottle_entries to authenticated;
grant select, insert, update, delete on public.water_bottle_stock to authenticated;
grant select, insert on public.activity_logs to authenticated;
grant select, update on public.profiles to authenticated;

create or replace function public.log_activity_entry(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_action text,
  p_details text,
  p_created_at timestamptz default now()
)
returns public.activity_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_row public.activity_logs;
begin
  insert into public.activity_logs (user_id, email, full_name, action, details, created_at)
  values (
    p_user_id,
    coalesce(p_email, ''),
    coalesce(p_full_name, ''),
    p_action,
    coalesce(p_details, ''),
    coalesce(p_created_at, now())
  )
  returning * into inserted_row;

  return inserted_row;
end;
$$;

grant execute on function public.log_activity_entry(uuid, text, text, text, text, timestamptz) to authenticated;

alter table public.bookings enable row level security;
alter table public.cash_handover_entries enable row level security;
alter table public.expenses enable row level security;
alter table public.profiles enable row level security;
alter table public.activity_logs enable row level security;

-- Remove the original unauthenticated prototype policy if it was previously installed.
drop policy if exists "temporary admin prototype access" on public.bookings;
drop policy if exists "Active members manage bookings" on public.bookings;
drop policy if exists "Active members manage cash handover entries" on public.cash_handover_entries;
drop policy if exists "Active members manage expenses" on public.expenses;

drop policy if exists "Members see own profile or admins see all" on public.profiles;
create policy "Members see own profile or admins see all" on public.profiles
  for select to authenticated
  using (id = auth.uid() or (select app_security.is_admin()));

drop policy if exists "Admins manage member access" on public.profiles;
create policy "Admins manage member access" on public.profiles
  for update to authenticated
  using ((select app_security.is_admin()))
  with check ((select app_security.is_admin()));

drop policy if exists "Admins view activity logs" on public.activity_logs;
create policy "Admins view activity logs" on public.activity_logs
  for select to authenticated
  using ((select app_security.is_admin()));

drop policy if exists "Members can create activity logs" on public.activity_logs;
create policy "Members can create activity logs" on public.activity_logs
  for insert to authenticated
  with check (user_id = auth.uid() or (select app_security.is_admin()));
