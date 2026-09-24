-- SS Global Tech Enterprises — operations and payroll persistence
-- Run after the core ERP and authenticated RLS migrations.
-- Frontend writes require a signed-in Supabase user.

begin;

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  workspace text not null check (workspace in ('solar', 'steel', 'furniture', 'irrigation')),
  unit_of_measure text not null check (unit_of_measure in ('Units/PCS', 'Meters', 'Feet', 'KG', 'Liters', 'Boxes')),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  stock_quantity numeric(14,3) not null default 0 check (stock_quantity >= 0),
  low_stock_alert numeric(14,3) not null default 0 check (low_stock_alert >= 0),
  warehouse text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  movement_type text not null check (movement_type in ('in', 'out', 'adjustment')),
  quantity numeric(14,3) not null check (quantity > 0),
  project_id uuid references public.projects(id) on delete set null,
  reference text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_no text not null unique,
  workspace text not null check (workspace in ('solar', 'steel', 'furniture', 'irrigation', 'all')),
  customer_name text not null,
  phone text,
  site_address text,
  quotation_date date not null default current_date,
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  service_charges numeric(14,2) not null default 0 check (service_charges >= 0),
  discount_type text not null default 'amount' check (discount_type in ('amount', 'percent')),
  discount_value numeric(14,2) not null default 0 check (discount_value >= 0),
  grand_total numeric(14,2) not null default 0 check (grand_total >= 0),
  payment_terms text,
  validity_days integer not null default 14 check (validity_days > 0),
  status text not null default 'Draft' check (status in ('Draft', 'Sent', 'Approved', 'Converted', 'Rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  item_name text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  line_total numeric(14,2) not null default 0 check (line_total >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subcontracts (
  id uuid primary key default gen_random_uuid(),
  partner text not null check (partner in ('Hayleys', 'Deep Tech')),
  po_number text not null,
  project_title text not null,
  location text not null,
  scope text not null check (scope in ('Material Only', 'Material + Labor')),
  agreed_amount numeric(14,2) not null check (agreed_amount >= 0),
  advance_paid numeric(14,2) not null default 0 check (advance_paid >= 0 and advance_paid <= agreed_amount),
  retention_percent numeric(5,2) not null default 0 check (retention_percent between 0 and 100),
  retention_amount numeric(14,2) generated always as (round(agreed_amount * retention_percent / 100, 2)) stored,
  material_cost numeric(14,2) not null default 0 check (material_cost >= 0),
  labor_cost numeric(14,2) not null default 0 check (labor_cost >= 0),
  status text not null default 'Active' check (status in ('Draft', 'Active', 'Completed', 'Cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subcontract_claims (
  id uuid primary key default gen_random_uuid(),
  subcontract_id uuid not null references public.subcontracts(id) on delete cascade,
  label text not null,
  percent numeric(5,2) not null default 0 check (percent between 0 and 100),
  amount numeric(14,2) not null default 0 check (amount >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0 and paid_amount <= amount),
  status text not null default 'Draft' check (status in ('Draft', 'Submitted', 'Partially Paid', 'Paid')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payroll_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  batch_date date not null default current_date,
  bank_name text,
  status text not null default 'Draft' check (status in ('Draft', 'Queued', 'Paid', 'Cancelled')),
  worker_count integer not null default 0 check (worker_count >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  executed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payroll_batch_entries (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.payroll_batches(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  employee_name text not null,
  bank_name text,
  branch_code text,
  account_number text,
  gross_amount numeric(14,2) not null default 0 check (gross_amount >= 0),
  advance_deduction numeric(14,2) not null default 0 check (advance_deduction >= 0),
  net_payable numeric(14,2) not null default 0 check (net_payable >= 0),
  payment_reference text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists inventory_items_workspace_idx on public.inventory_items (workspace);
create index if not exists inventory_movements_item_idx on public.inventory_movements (item_id, created_at desc);
create index if not exists quotations_status_idx on public.quotations (status, quotation_date desc);
create index if not exists quotation_items_quote_idx on public.quotation_items (quotation_id);
create index if not exists subcontracts_partner_idx on public.subcontracts (partner, status);
create index if not exists subcontract_claims_contract_idx on public.subcontract_claims (subcontract_id);
create index if not exists payroll_batches_status_idx on public.payroll_batches (status, batch_date desc);
create index if not exists payroll_entries_batch_idx on public.payroll_batch_entries (batch_id);

create or replace function public.erp_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;

do $$
begin
  execute 'drop trigger if exists inventory_items_set_updated_at on public.inventory_items';
  execute 'create trigger inventory_items_set_updated_at before update on public.inventory_items for each row execute function public.erp_set_updated_at()';
  execute 'drop trigger if exists quotations_set_updated_at on public.quotations';
  execute 'create trigger quotations_set_updated_at before update on public.quotations for each row execute function public.erp_set_updated_at()';
  execute 'drop trigger if exists subcontracts_set_updated_at on public.subcontracts';
  execute 'create trigger subcontracts_set_updated_at before update on public.subcontracts for each row execute function public.erp_set_updated_at()';
  execute 'drop trigger if exists payroll_batches_set_updated_at on public.payroll_batches';
  execute 'create trigger payroll_batches_set_updated_at before update on public.payroll_batches for each row execute function public.erp_set_updated_at()';
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['inventory_items','inventory_movements','quotations','quotation_items','subcontracts','subcontract_claims','payroll_batches','payroll_batch_entries'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('drop policy if exists %I on public.%I', 'ERP authenticated read ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'ERP authenticated insert ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'ERP authenticated update ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'ERP authenticated delete ' || table_name, table_name);
    execute format('create policy %I on public.%I for select to authenticated using (true)', 'ERP authenticated read ' || table_name, table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (true)', 'ERP authenticated insert ' || table_name, table_name);
    execute format('create policy %I on public.%I for update to authenticated using (true) with check (true)', 'ERP authenticated update ' || table_name, table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (true)', 'ERP authenticated delete ' || table_name, table_name);
  end loop;
end $$;

commit;
