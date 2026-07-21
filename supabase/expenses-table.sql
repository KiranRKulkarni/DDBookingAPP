create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  property text null,
  description text not null,
  amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expenses add column if not exists property text;

alter table public.expenses enable row level security;

create policy if not exists "Allow authenticated users to read expenses" on public.expenses
for select using (auth.role() = 'authenticated');

create policy if not exists "Allow authenticated users to insert expenses" on public.expenses
for insert with check (auth.role() = 'authenticated');

create policy if not exists "Allow authenticated users to update expenses" on public.expenses
for update using (auth.role() = 'authenticated');

create policy if not exists "Allow authenticated users to delete expenses" on public.expenses
for delete using (auth.role() = 'authenticated');
