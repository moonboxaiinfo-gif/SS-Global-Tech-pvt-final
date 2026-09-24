create table if not exists public.employee_advances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete set null,
  employee_name text not null,
  payout_type text not null,
  project text not null default '',
  amount numeric(14,2) not null check (amount > 0),
  payout_date date not null default current_date,
  status text not null default 'Deduct from salary',
  created_at timestamptz not null default timezone('utc', now())
);
alter table public.employee_advances enable row level security;
drop policy if exists employee_advances_authenticated_all on public.employee_advances;
create policy employee_advances_authenticated_all on public.employee_advances for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.employee_advances to authenticated;
revoke all on public.employee_advances from anon;
