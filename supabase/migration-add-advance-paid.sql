-- Add advance_paid column if it doesn't exist
alter table public.bookings add column if not exists comment text not null default '';
alter table public.bookings add column if not exists advance_paid numeric(12,2) not null default 0;
