-- SS Global Tech Enterprises ERP core schema
-- Execute in the Supabase SQL Editor with a privileged dashboard session.
-- This migration is designed to be safe to re-run and preserves the richer CRM fields already prepared.

create extension if not exists pgcrypto;

-- Customers and leads already have richer CRM columns in the prior migration.
-- Add the requested core columns when the tables already exist.
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text not null,
  company text,
  status text not null default 'New',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.customers add column if not exists name text;
alter table public.customers add column if not exists email text;
alter table public.customers add column if not exists phone text;
alter table public.customers add column if not exists company text;
alter table public.customers add column if not exists status text default 'New';
alter table public.customers add column if not exists created_at timestamptz default timezone('utc', now());

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text,
  status text not null default 'New',
  priority text not null default 'Medium',
  value numeric(14, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.leads add column if not exists name text;
alter table public.leads add column if not exists source text;
alter table public.leads add column if not exists status text default 'New';
alter table public.leads add column if not exists priority text default 'Medium';
alter table public.leads add column if not exists value numeric(14, 2) default 0;
alter table public.leads add column if not exists created_at timestamptz default timezone('utc', now());

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text,
  department text,
  salary numeric(14, 2) not null default 0 check (salary >= 0),
  join_date date,
  status text not null default 'Active' check (status in ('Active', 'Inactive', 'On Leave')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid references public.customers(id) on delete set null,
  start_date date,
  deadline date,
  status text not null default 'Planning' check (status in ('Planning', 'In Progress', 'Completed', 'On Hold')),
  total_budget numeric(14, 2) not null default 0 check (total_budget >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  status text not null default 'unpaid' check (status in ('paid', 'unpaid')),
  due_date date,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  date date not null default current_date,
  description text,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists customers_status_idx on public.customers (status);
create index if not exists leads_status_priority_idx on public.leads (status, priority);
create index if not exists projects_client_idx on public.projects (client_id);
create index if not exists projects_status_idx on public.projects (status);
create index if not exists invoices_project_idx on public.invoices (project_id);
create index if not exists invoices_status_due_date_idx on public.invoices (status, due_date);
create index if not exists expenses_project_idx on public.expenses (project_id);
create index if not exists expenses_date_idx on public.expenses (date);

create or replace function public.erp_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at before update on public.employees for each row execute function public.erp_set_updated_at();
drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute function public.erp_set_updated_at();

-- Authenticated-only RLS. Anonymous browser requests have no table access.
-- Authenticated users may read and insert records. Update/delete are intentionally
-- not granted here; add narrower role-based policies when those workflows are ready.

alter table public.customers enable row level security;
alter table public.leads enable row level security;
alter table public.employees enable row level security;
alter table public.projects enable row level security;
alter table public.invoices enable row level security;
alter table public.expenses enable row level security;

grant usage on schema public to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['customers', 'leads', 'employees', 'projects', 'invoices', 'expenses'] loop
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('revoke all on table public.%I from authenticated', table_name);
    execute format('grant select, insert on table public.%I to authenticated', table_name);

    -- Remove the previous permissive/demo policy names if this migration is rerun.
    execute format('drop policy if exists %I on public.%I', 'ERP public read ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'ERP public insert ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'ERP public update ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'ERP authenticated read ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'ERP authenticated insert ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'Public CRM customers read', table_name);
    execute format('drop policy if exists %I on public.%I', 'Public CRM customers insert', table_name);
    execute format('drop policy if exists %I on public.%I', 'Public CRM customers update', table_name);
    execute format('drop policy if exists %I on public.%I', 'Public CRM leads read', table_name);
    execute format('drop policy if exists %I on public.%I', 'Public CRM leads insert', table_name);
    execute format('drop policy if exists %I on public.%I', 'Public CRM leads update', table_name);

    execute format('create policy %I on public.%I for select to authenticated using (true)', 'ERP authenticated read ' || table_name, table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (true)', 'ERP authenticated insert ' || table_name, table_name);
  end loop;
end $$;
