-- SS Global Tech: real cash / petty cash / bank ledger
-- Run this file in Supabase SQL Editor after the existing ERP migrations.

create extension if not exists pgcrypto;

create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_type text not null check (account_type in ('Cash', 'Bank')),
  workspace text not null default 'All Workspaces',
  opening_balance numeric(14,2) not null default 0 check (opening_balance >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (name, workspace)
);

create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.finance_accounts(id) on delete cascade,
  entry_type text not null check (entry_type in ('Income', 'Expense', 'Transfer')),
  direction text not null check (direction in ('In', 'Out')),
  amount numeric(14,2) not null check (amount > 0),
  description text not null,
  entry_date date not null default current_date,
  counterpart_account_id uuid references public.finance_accounts(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists finance_entries_account_date_idx on public.finance_entries (account_id, entry_date desc);
create index if not exists finance_entries_type_idx on public.finance_entries (entry_type, entry_date desc);

alter table public.finance_accounts enable row level security;
alter table public.finance_entries enable row level security;

drop policy if exists finance_accounts_authenticated_all on public.finance_accounts;
drop policy if exists finance_entries_authenticated_all on public.finance_entries;
create policy finance_accounts_authenticated_all on public.finance_accounts for all to authenticated using (true) with check (true);
create policy finance_entries_authenticated_all on public.finance_entries for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.finance_accounts to authenticated;
grant select, insert, update, delete on public.finance_entries to authenticated;
revoke all on public.finance_accounts from anon;
revoke all on public.finance_entries from anon;

-- Optional first-time setup examples. Keep these commented so no fake balance is inserted.
-- insert into public.finance_accounts (name, account_type, workspace, opening_balance)
-- values ('Cash in Hand', 'Cash', 'All Workspaces', 0), ('Petty Cash', 'Cash', 'All Workspaces', 0), ('Main Bank Account', 'Bank', 'All Workspaces', 0);
