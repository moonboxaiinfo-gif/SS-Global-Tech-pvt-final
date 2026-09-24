-- SS Global Tech Enterprises — authenticated-only RLS
-- Run after the six ERP tables already exist.
-- Authenticated users can SELECT and INSERT. Anonymous users have no table access.
-- UPDATE and DELETE remain blocked until narrower role-based policies are added.

begin;

alter table public.customers enable row level security;
alter table public.leads enable row level security;
alter table public.employees enable row level security;
alter table public.projects enable row level security;
alter table public.invoices enable row level security;
alter table public.expenses enable row level security;

grant usage on schema public to authenticated;

revoke all on table public.customers from anon, authenticated;
revoke all on table public.leads from anon, authenticated;
revoke all on table public.employees from anon, authenticated;
revoke all on table public.projects from anon, authenticated;
revoke all on table public.invoices from anon, authenticated;
revoke all on table public.expenses from anon, authenticated;

grant select, insert on table public.customers to authenticated;
grant select, insert on table public.leads to authenticated;
grant select, insert on table public.employees to authenticated;
grant select, insert on table public.projects to authenticated;
grant select, insert on table public.invoices to authenticated;
grant select, insert on table public.expenses to authenticated;

-- Remove previous permissive/demo policies if they exist.
drop policy if exists "ERP public read customers" on public.customers;
drop policy if exists "ERP public insert customers" on public.customers;
drop policy if exists "ERP public update customers" on public.customers;
drop policy if exists "Public CRM customers read" on public.customers;
drop policy if exists "Public CRM customers insert" on public.customers;
drop policy if exists "Public CRM customers update" on public.customers;
drop policy if exists "ERP authenticated read customers" on public.customers;
drop policy if exists "ERP authenticated insert customers" on public.customers;

drop policy if exists "ERP public read leads" on public.leads;
drop policy if exists "ERP public insert leads" on public.leads;
drop policy if exists "ERP public update leads" on public.leads;
drop policy if exists "Public CRM leads read" on public.leads;
drop policy if exists "Public CRM leads insert" on public.leads;
drop policy if exists "Public CRM leads update" on public.leads;
drop policy if exists "ERP authenticated read leads" on public.leads;
drop policy if exists "ERP authenticated insert leads" on public.leads;

drop policy if exists "ERP public read employees" on public.employees;
drop policy if exists "ERP public insert employees" on public.employees;
drop policy if exists "ERP public update employees" on public.employees;
drop policy if exists "ERP authenticated read employees" on public.employees;
drop policy if exists "ERP authenticated insert employees" on public.employees;

drop policy if exists "ERP public read projects" on public.projects;
drop policy if exists "ERP public insert projects" on public.projects;
drop policy if exists "ERP public update projects" on public.projects;
drop policy if exists "ERP authenticated read projects" on public.projects;
drop policy if exists "ERP authenticated insert projects" on public.projects;

drop policy if exists "ERP public read invoices" on public.invoices;
drop policy if exists "ERP public insert invoices" on public.invoices;
drop policy if exists "ERP public update invoices" on public.invoices;
drop policy if exists "ERP authenticated read invoices" on public.invoices;
drop policy if exists "ERP authenticated insert invoices" on public.invoices;

drop policy if exists "ERP public read expenses" on public.expenses;
drop policy if exists "ERP public insert expenses" on public.expenses;
drop policy if exists "ERP public update expenses" on public.expenses;
drop policy if exists "ERP authenticated read expenses" on public.expenses;
drop policy if exists "ERP authenticated insert expenses" on public.expenses;

create policy "ERP authenticated read customers" on public.customers for select to authenticated using (true);
create policy "ERP authenticated insert customers" on public.customers for insert to authenticated with check (true);
create policy "ERP authenticated read leads" on public.leads for select to authenticated using (true);
create policy "ERP authenticated insert leads" on public.leads for insert to authenticated with check (true);
create policy "ERP authenticated read employees" on public.employees for select to authenticated using (true);
create policy "ERP authenticated insert employees" on public.employees for insert to authenticated with check (true);
create policy "ERP authenticated read projects" on public.projects for select to authenticated using (true);
create policy "ERP authenticated insert projects" on public.projects for insert to authenticated with check (true);
create policy "ERP authenticated read invoices" on public.invoices for select to authenticated using (true);
create policy "ERP authenticated insert invoices" on public.invoices for insert to authenticated with check (true);
create policy "ERP authenticated read expenses" on public.expenses for select to authenticated using (true);
create policy "ERP authenticated insert expenses" on public.expenses for insert to authenticated with check (true);

commit;
