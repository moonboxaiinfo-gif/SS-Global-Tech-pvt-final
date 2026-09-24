-- SS Global Tech Enterprises CRM schema
-- Run this migration in the Supabase SQL Editor or through a privileged migration runner.

create extension if not exists pgcrypto;

do $$ begin
  create type public.crm_record_status as enum ('New', 'Contacted', 'Converted');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text not null,
  company text,
  workspace text not null default 'all' check (workspace in ('all', 'solar', 'steel', 'furniture', 'irrigation')),
  status public.crm_record_status not null default 'New',
  source text,
  owner text,
  opportunity_value_lkr numeric(14, 2) not null default 0 check (opportunity_value_lkr >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text not null,
  company text,
  workspace text not null default 'all' check (workspace in ('all', 'solar', 'steel', 'furniture', 'irrigation')),
  status public.crm_record_status not null default 'New',
  source text,
  owner text,
  opportunity_value_lkr numeric(14, 2) not null default 0 check (opportunity_value_lkr >= 0),
  next_follow_up_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists customers_workspace_status_idx on public.customers (workspace, status);
create index if not exists leads_workspace_status_idx on public.leads (workspace, status);
create index if not exists leads_follow_up_idx on public.leads (next_follow_up_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at before update on public.customers for each row execute function public.set_updated_at();

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads for each row execute function public.set_updated_at();

alter table public.customers enable row level security;
alter table public.leads enable row level security;

-- These policies support the current local/demo frontend using the publishable anon key.
-- Replace them with authenticated-user policies before production launch.
drop policy if exists "Public CRM customers read" on public.customers;
create policy "Public CRM customers read" on public.customers for select to anon, authenticated using (true);
drop policy if exists "Public CRM customers insert" on public.customers;
create policy "Public CRM customers insert" on public.customers for insert to anon, authenticated with check (true);
drop policy if exists "Public CRM customers update" on public.customers;
create policy "Public CRM customers update" on public.customers for update to anon, authenticated using (true) with check (true);

drop policy if exists "Public CRM leads read" on public.leads;
create policy "Public CRM leads read" on public.leads for select to anon, authenticated using (true);
drop policy if exists "Public CRM leads insert" on public.leads;
create policy "Public CRM leads insert" on public.leads for insert to anon, authenticated with check (true);
drop policy if exists "Public CRM leads update" on public.leads;
create policy "Public CRM leads update" on public.leads for update to anon, authenticated using (true) with check (true);
