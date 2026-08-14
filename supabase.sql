-- Altius IVF Tracker — Supabase database setup
-- Run this entire script in Supabase SQL Editor.
--
-- This version keeps the complete patient tracker object in JSONB so the
-- existing GitHub Pages application can sync without a build system.
-- The table is protected by Supabase Auth + Row Level Security.
--
-- IMPORTANT: Do NOT use a service_role/secret key in the browser.

create table if not exists public.patients (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete restrict,
  patient_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patients_updated_at_idx on public.patients(updated_at desc);
create index if not exists patients_owner_id_idx on public.patients(owner_id);

alter table public.patients enable row level security;

grant select, insert, update, delete on public.patients to authenticated;

-- All authenticated clinic staff can work with the clinic's patient tracker.
-- Do NOT enable public/anonymous access.
drop policy if exists "Authenticated staff can view patients" on public.patients;
create policy "Authenticated staff can view patients"
on public.patients for select
to authenticated
using (true);

drop policy if exists "Authenticated staff can create patients" on public.patients;
create policy "Authenticated staff can create patients"
on public.patients for insert
to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "Authenticated staff can update patients" on public.patients;
create policy "Authenticated staff can update patients"
on public.patients for update
to authenticated
using (true)
with check ((select auth.uid()) = owner_id);

drop policy if exists "Authenticated staff can delete patients" on public.patients;
create policy "Authenticated staff can delete patients"
on public.patients for delete
to authenticated
using (true);

-- Optional: keep updated_at current whenever a row changes.
create or replace function public.set_patients_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists patients_set_updated_at on public.patients;
create trigger patients_set_updated_at
before update on public.patients
for each row execute function public.set_patients_updated_at();
