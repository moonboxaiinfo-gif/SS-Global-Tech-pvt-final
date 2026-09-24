create table if not exists public.item_warranties (
  id text primary key,
  project_id text null references public.projects(id) on delete cascade,
  invoice_id text null references public.invoices(id) on delete cascade,
  workspace text not null default 'solar' check (workspace = 'solar'),
  project_source text not null default 'SS Global Direct' check (project_source = 'SS Global Direct'),
  customer_name text not null,
  customer_phone text not null default '',
  item_name text not null,
  supplier_name text not null,
  serial_number text not null,
  supplier_warranty_expiry date not null,
  customer_warranty_expiry date not null,
  created_at timestamptz not null default now()
);

create index if not exists item_warranties_serial_idx on public.item_warranties (serial_number);
create index if not exists item_warranties_customer_idx on public.item_warranties (customer_name);
create index if not exists item_warranties_supplier_idx on public.item_warranties (supplier_name);

alter table public.item_warranties enable row level security;
drop policy if exists item_warranties_authenticated_select on public.item_warranties;
drop policy if exists item_warranties_authenticated_insert on public.item_warranties;
drop policy if exists item_warranties_authenticated_update on public.item_warranties;
drop policy if exists item_warranties_authenticated_delete on public.item_warranties;
create policy item_warranties_authenticated_select on public.item_warranties for select to authenticated using (true);
create policy item_warranties_authenticated_insert on public.item_warranties for insert to authenticated with check (workspace = 'solar' and project_source = 'SS Global Direct');
create policy item_warranties_authenticated_update on public.item_warranties for update to authenticated using (true) with check (workspace = 'solar' and project_source = 'SS Global Direct');
create policy item_warranties_authenticated_delete on public.item_warranties for delete to authenticated using (true);
