-- SS Global Tech — Supabase SQL Editor bundle
-- Run this entire file once in Supabase SQL Editor.
-- It uses the canonical ERP schema first; do not separately run the legacy 20260818_create_erp_core.sql.



-- ============================================================
-- 01 — Canonical ERP base schema
-- Source: supabase/migrations/20260826_complete_erp_schema.sql
-- ============================================================
-- SS Global Tech Multi-Company ERP
-- Complete Supabase/PostgreSQL schema for Solar Energy, Irrigation, Iron Work, and Furniture.
-- This script is intentionally destructive: it removes the listed legacy/partial ERP tables.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Safe reset of legacy/partial ERP tables
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.bank_transactions CASCADE;
DROP TABLE IF EXISTS public.payroll CASCADE;
DROP TABLE IF EXISTS public.commercial_line_items CASCADE;
DROP TABLE IF EXISTS public.quotations_invoices CASCADE;
DROP TABLE IF EXISTS public.project_expenses CASCADE;
DROP TABLE IF EXISTS public.solar_warranty_items CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

DROP TYPE IF EXISTS public.bank_transaction_type CASCADE;
DROP TYPE IF EXISTS public.payroll_status CASCADE;
DROP TYPE IF EXISTS public.payment_status CASCADE;
DROP TYPE IF EXISTS public.commercial_document_type CASCADE;
DROP TYPE IF EXISTS public.project_status CASCADE;
DROP TYPE IF EXISTS public.project_source CASCADE;
DROP TYPE IF EXISTS public.workspace_type CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- -----------------------------------------------------------------------------
-- 2. Shared enums and utility functions
-- -----------------------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM (
  'Owner',
  'Manager',
  'Accountant',
  'Technician'
);

CREATE TYPE public.workspace_type AS ENUM (
  'Solar Energy',
  'Irrigation',
  'Iron Work',
  'Furniture'
);

CREATE TYPE public.project_source AS ENUM (
  'Hayleys',
  'Deep Tech',
  'SS Global Direct',
  'Direct'
);

CREATE TYPE public.project_status AS ENUM (
  'Planning',
  'In Progress',
  'Completed',
  'On Hold'
);

CREATE TYPE public.commercial_document_type AS ENUM (
  'Quotation',
  'Invoice'
);

CREATE TYPE public.payment_status AS ENUM (
  'Unpaid',
  'Partially Paid',
  'Paid',
  'Overdue',
  'Cancelled'
);

CREATE TYPE public.payroll_status AS ENUM (
  'Draft',
  'Approved',
  'Paid',
  'Cancelled'
);

CREATE TYPE public.bank_transaction_type AS ENUM (
  'Income',
  'Expense',
  'Transfer'
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. Authentication profiles and shared employee master
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  role public.app_role NOT NULL DEFAULT 'Technician',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_email_nonempty CHECK (length(trim(email)) > 3)
);

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  nic_number text UNIQUE,
  assigned_workspace public.workspace_type,
  job_title text,
  skills text[] NOT NULL DEFAULT '{}',
  daily_wage numeric(14,2) NOT NULL DEFAULT 0 CHECK (daily_wage >= 0),
  basic_salary numeric(14,2) NOT NULL DEFAULT 0 CHECK (basic_salary >= 0),
  bank_name text,
  bank_branch_name text,
  bank_branch_code text,
  bank_account_number text,
  bank_account_name text,
  join_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Automatically create a safe Technician profile when a Supabase Auth user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''), split_part(NEW.email, '@', 1)),
    lower(NEW.email),
    'Technician'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_auth_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET email = lower(NEW.email), updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_auth_user_email();

-- -----------------------------------------------------------------------------
-- 4. Clients, projects, expenses, and Solar warranty tracking
-- -----------------------------------------------------------------------------
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace public.workspace_type,
  name text NOT NULL,
  company_name text,
  email text,
  phone text,
  whatsapp_phone text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace public.workspace_type NOT NULL,
  source public.project_source NOT NULL DEFAULT 'Direct',
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_name text NOT NULL,
  description text,
  customer_name text NOT NULL,
  customer_phone text,
  customer_whatsapp text,
  location text,
  target_start_date date,
  deadline date,
  status public.project_status NOT NULL DEFAULT 'Planning',
  agreed_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (agreed_price >= 0),
  customer_advance_paid numeric(14,2) NOT NULL DEFAULT 0 CHECK (customer_advance_paid >= 0),
  budget numeric(14,2) NOT NULL DEFAULT 0 CHECK (budget >= 0),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_advance_not_above_price CHECK (customer_advance_paid <= agreed_price),
  CONSTRAINT projects_deadline_after_start CHECK (deadline IS NULL OR target_start_date IS NULL OR deadline >= target_start_date),
  CONSTRAINT projects_solar_source_check CHECK (
    (workspace = 'Solar Energy' AND source IN ('Hayleys', 'Deep Tech', 'SS Global Direct', 'Direct'))
    OR (workspace <> 'Solar Energy' AND source = 'Direct')
  )
);

CREATE TABLE public.project_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  workspace public.workspace_type NOT NULL,
  category text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  description text,
  expense_date date NOT NULL DEFAULT current_date,
  payment_method text NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Bank', 'Card', 'Credit')),
  receipt_url text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.solar_warranty_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  supplier_name text NOT NULL,
  serial_number text NOT NULL UNIQUE,
  warranty_period_months integer NOT NULL CHECK (warranty_period_months > 0),
  installation_date date NOT NULL DEFAULT current_date,
  supplier_warranty_expiry_date date,
  customer_warranty_expiry_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT solar_warranty_supplier_expiry CHECK (
    supplier_warranty_expiry_date IS NULL OR supplier_warranty_expiry_date >= installation_date
  ),
  CONSTRAINT solar_warranty_customer_expiry CHECK (
    customer_warranty_expiry_date IS NULL OR customer_warranty_expiry_date >= installation_date
  )
);

-- Enforce that warranty records can only belong to SS Global Direct Solar projects.
CREATE OR REPLACE FUNCTION public.validate_solar_warranty_project()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  project_row public.projects;
BEGIN
  SELECT * INTO project_row FROM public.projects WHERE id = NEW.project_id;
  IF project_row.id IS NULL OR project_row.workspace <> 'Solar Energy' OR project_row.source <> 'SS Global Direct' THEN
    RAISE EXCEPTION 'Warranty items require a Solar Energy / SS Global Direct project';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_solar_warranty_project_before_write
  BEFORE INSERT OR UPDATE ON public.solar_warranty_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_solar_warranty_project();

-- -----------------------------------------------------------------------------
-- 5. Workspace-scoped inventory and commercial documents
-- -----------------------------------------------------------------------------
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace public.workspace_type NOT NULL,
  item_name text NOT NULL,
  sku text,
  description text,
  unit_of_measure text NOT NULL DEFAULT 'Units/PCS' CHECK (unit_of_measure IN ('Units/PCS', 'Meters', 'Feet', 'KG', 'Liters', 'Boxes')),
  unit_cost_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost_price >= 0),
  unit_selling_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_selling_price >= 0),
  quantity numeric(14,3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  low_stock_alert_level numeric(14,3) NOT NULL DEFAULT 0 CHECK (low_stock_alert_level >= 0),
  warehouse_location text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_workspace_item_name_unique UNIQUE (workspace, item_name),
  CONSTRAINT inventory_sku_unique UNIQUE (sku)
);

CREATE TABLE public.quotations_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type public.commercial_document_type NOT NULL,
  document_number text NOT NULL UNIQUE,
  workspace public.workspace_type NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  customer_whatsapp text,
  customer_address text,
  issue_date date NOT NULL DEFAULT current_date,
  due_date date,
  terms text,
  prepared_by text,
  subtotal numeric(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  amount_paid numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  balance_due numeric(14,2) NOT NULL DEFAULT 0 CHECK (balance_due >= 0),
  payment_status public.payment_status NOT NULL DEFAULT 'Unpaid',
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_due_date_after_issue CHECK (due_date IS NULL OR due_date >= issue_date),
  CONSTRAINT commercial_paid_not_above_total CHECK (amount_paid <= total_amount)
);

CREATE TABLE public.commercial_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.quotations_invoices(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  workspace public.workspace_type NOT NULL,
  item_name text NOT NULL,
  description text,
  quantity numeric(14,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_selling_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_selling_price >= 0),
  unit_buying_cost numeric(14,2) CHECK (unit_buying_cost IS NULL OR unit_buying_cost >= 0),
  line_discount numeric(14,2) NOT NULL DEFAULT 0 CHECK (line_discount >= 0),
  line_total numeric(14,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 6. Payroll and bank transaction ledger
-- -----------------------------------------------------------------------------
CREATE TABLE public.payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  workspace public.workspace_type,
  period_start date NOT NULL,
  period_end date NOT NULL,
  days_worked numeric(8,2) NOT NULL DEFAULT 0 CHECK (days_worked >= 0),
  basic_salary numeric(14,2) NOT NULL DEFAULT 0 CHECK (basic_salary >= 0),
  allowances numeric(14,2) NOT NULL DEFAULT 0 CHECK (allowances >= 0),
  deductions numeric(14,2) NOT NULL DEFAULT 0 CHECK (deductions >= 0),
  net_salary numeric(14,2) GENERATED ALWAYS AS (basic_salary + allowances - deductions) STORED,
  status public.payroll_status NOT NULL DEFAULT 'Draft',
  payment_date date,
  bank_name text,
  bank_branch_name text,
  bank_branch_code text,
  bank_account_number text,
  bank_account_name text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payroll_period_valid CHECK (period_end >= period_start),
  CONSTRAINT payroll_deductions_not_above_gross CHECK (deductions <= basic_salary + allowances),
  CONSTRAINT payroll_paid_requires_date CHECK (status <> 'Paid' OR payment_date IS NOT NULL),
  CONSTRAINT payroll_period_unique UNIQUE (employee_id, period_start, period_end)
);

CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace public.workspace_type NOT NULL,
  transaction_type public.bank_transaction_type NOT NULL,
  account_name text NOT NULL,
  transaction_date date NOT NULL DEFAULT current_date,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  category text NOT NULL,
  description text,
  reference_number text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.quotations_invoices(id) ON DELETE SET NULL,
  payroll_id uuid REFERENCES public.payroll(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  reconciled boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bank_reference_per_account UNIQUE (account_name, reference_number)
);

-- -----------------------------------------------------------------------------
-- 7. Updated-at triggers
-- -----------------------------------------------------------------------------
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER employees_set_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER project_expenses_set_updated_at BEFORE UPDATE ON public.project_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER solar_warranty_items_set_updated_at BEFORE UPDATE ON public.solar_warranty_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER inventory_items_set_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER quotations_invoices_set_updated_at BEFORE UPDATE ON public.quotations_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER commercial_line_items_set_updated_at BEFORE UPDATE ON public.commercial_line_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER payroll_set_updated_at BEFORE UPDATE ON public.payroll FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bank_transactions_set_updated_at BEFORE UPDATE ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 8. Foreign-key and operational indexes
-- -----------------------------------------------------------------------------
CREATE INDEX employees_profile_id_idx ON public.employees(profile_id);
CREATE INDEX employees_workspace_idx ON public.employees(assigned_workspace);
CREATE INDEX projects_client_id_idx ON public.projects(client_id);
CREATE INDEX projects_created_by_idx ON public.projects(created_by);
CREATE INDEX projects_workspace_status_idx ON public.projects(workspace, status);
CREATE INDEX projects_customer_phone_idx ON public.projects(customer_phone);
CREATE INDEX project_expenses_project_id_idx ON public.project_expenses(project_id);
CREATE INDEX project_expenses_employee_id_idx ON public.project_expenses(employee_id);
CREATE INDEX project_expenses_created_by_idx ON public.project_expenses(created_by);
CREATE INDEX project_expenses_workspace_date_idx ON public.project_expenses(workspace, expense_date);
CREATE INDEX solar_warranty_project_id_idx ON public.solar_warranty_items(project_id);
CREATE INDEX solar_warranty_supplier_idx ON public.solar_warranty_items(supplier_name);
CREATE INDEX solar_warranty_customer_expiry_idx ON public.solar_warranty_items(customer_warranty_expiry_date);
CREATE INDEX inventory_workspace_active_idx ON public.inventory_items(workspace, is_active);
CREATE INDEX quotations_invoices_project_id_idx ON public.quotations_invoices(project_id);
CREATE INDEX quotations_invoices_client_id_idx ON public.quotations_invoices(client_id);
CREATE INDEX quotations_invoices_created_by_idx ON public.quotations_invoices(created_by);
CREATE INDEX quotations_invoices_workspace_type_idx ON public.quotations_invoices(workspace, document_type);
CREATE INDEX commercial_line_items_document_id_idx ON public.commercial_line_items(document_id);
CREATE INDEX commercial_line_items_inventory_item_id_idx ON public.commercial_line_items(inventory_item_id);
CREATE INDEX payroll_employee_id_idx ON public.payroll(employee_id);
CREATE INDEX payroll_created_by_idx ON public.payroll(created_by);
CREATE INDEX payroll_status_period_idx ON public.payroll(status, period_start, period_end);
CREATE INDEX bank_transactions_project_id_idx ON public.bank_transactions(project_id);
CREATE INDEX bank_transactions_document_id_idx ON public.bank_transactions(document_id);
CREATE INDEX bank_transactions_payroll_id_idx ON public.bank_transactions(payroll_id);
CREATE INDEX bank_transactions_employee_id_idx ON public.bank_transactions(employee_id);
CREATE INDEX bank_transactions_created_by_idx ON public.bank_transactions(created_by);
CREATE INDEX bank_transactions_workspace_date_idx ON public.bank_transactions(workspace, transaction_date);

-- -----------------------------------------------------------------------------
-- 9. Row Level Security: authenticated users may read/write these ERP records.
--    Server-side service-role access remains available because service_role bypasses RLS.
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solar_warranty_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_authenticated_full_access ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY employees_authenticated_full_access ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY clients_authenticated_full_access ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY projects_authenticated_full_access ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY project_expenses_authenticated_full_access ON public.project_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY solar_warranty_items_authenticated_full_access ON public.solar_warranty_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY inventory_items_authenticated_full_access ON public.inventory_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY quotations_invoices_authenticated_full_access ON public.quotations_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY commercial_line_items_authenticated_full_access ON public.commercial_line_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY payroll_authenticated_full_access ON public.payroll FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY bank_transactions_authenticated_full_access ON public.bank_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;



-- ============================================================
-- 02 — CRM customers and leads
-- Source: supabase/migrations/20260818_create_customers_and_leads.sql
-- ============================================================
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



-- ============================================================
-- 03 — Operations, quotations, subcontracts and payroll batches
-- Source: supabase/migrations/20260818_create_operations_and_payroll.sql
-- ============================================================
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



-- ============================================================
-- 04 — Commercial fields compatibility
-- Source: supabase/migrations/20260825_add_dual_view_commercial_fields.sql
-- ============================================================
-- SS Global Tech Enterprises — dual-view commercial fields
-- Run after 20260818_create_erp_core.sql and 20260818_create_operations_and_payroll.sql.
-- Public/customer-facing columns are separate from internal procurement columns.
-- Customer-facing PDF generators must select only the public columns.

begin;

alter table public.invoices
  add column if not exists invoice_no text,
  add column if not exists workspace text,
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists customer_address text,
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  add column if not exists service_charges numeric(14,2) not null default 0 check (service_charges >= 0),
  add column if not exists discount numeric(14,2) not null default 0 check (discount >= 0),
  add column if not exists grand_total numeric(14,2) not null default 0 check (grand_total >= 0),
  add column if not exists warranty text,
  add column if not exists internal_supplier text,
  add column if not exists internal_total_cost numeric(14,2) not null default 0 check (internal_total_cost >= 0),
  add column if not exists internal_margin numeric(14,2) not null default 0,
  add column if not exists internal_serial_numbers text,
  add column if not exists internal_supplier_warranty text,
  add column if not exists internal_order_source text;

alter table public.quotations
  add column if not exists internal_supplier text,
  add column if not exists internal_total_cost numeric(14,2) not null default 0 check (internal_total_cost >= 0),
  add column if not exists internal_margin numeric(14,2) not null default 0,
  add column if not exists internal_serial_numbers text,
  add column if not exists internal_supplier_warranty text,
  add column if not exists internal_order_source text;

alter table public.quotation_items
  add column if not exists description text,
  add column if not exists warranty text;

comment on column public.invoices.internal_supplier is 'Private supplier/vendor detail. Never expose through customer-facing PDFs or public links.';
comment on column public.invoices.internal_total_cost is 'Private procurement cost. Never expose through customer-facing PDFs or public links.';
comment on column public.invoices.internal_margin is 'Private margin detail. Never expose through customer-facing PDFs or public links.';
comment on column public.invoices.internal_serial_numbers is 'Private serial detail. Never expose through customer-facing PDFs or public links.';
comment on column public.invoices.internal_supplier_warranty is 'Private supplier warranty detail. Never expose through customer-facing PDFs or public links.';
comment on column public.invoices.internal_order_source is 'Private order source detail. Never expose through customer-facing PDFs or public links.';
comment on column public.quotations.internal_supplier is 'Private supplier/vendor detail. Never expose through customer-facing PDFs or public links.';
comment on column public.quotations.internal_total_cost is 'Private procurement cost. Never expose through customer-facing PDFs or public links.';
comment on column public.quotations.internal_margin is 'Private margin detail. Never expose through customer-facing PDFs or public links.';
comment on column public.quotations.internal_serial_numbers is 'Private serial detail. Never expose through customer-facing PDFs or public links.';
comment on column public.quotations.internal_supplier_warranty is 'Private supplier warranty detail. Never expose through customer-facing PDFs or public links.';
comment on column public.quotations.internal_order_source is 'Private order source detail. Never expose through customer-facing PDFs or public links.';

create unique index if not exists invoices_invoice_no_idx on public.invoices (invoice_no) where invoice_no is not null;
create index if not exists invoices_workspace_idx on public.invoices (workspace);

commit;



-- ============================================================
-- 05 — Payroll bank account name compatibility
-- Source: supabase/migrations/20260825_add_payroll_account_name.sql
-- ============================================================
-- Forward-only compatibility migration for bank-ready payroll exports.
-- Safe to run repeatedly after 20260818_create_operations_and_payroll.sql.
begin;

alter table if exists public.payroll_batch_entries
  add column if not exists account_name text;

commit;

-- After applying this migration, refresh the Supabase API schema cache if the
-- connected project does not expose the new column immediately.



-- ============================================================
-- 07 — Finance accounts and entries
-- Source: supabase/migrations/20260921_create_finance_ledger.sql
-- ============================================================
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



-- ============================================================
-- 08 — Employee advances and payouts
-- Source: supabase/migrations/20260922_create_employee_advances.sql
-- ============================================================
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



-- ============================================================
-- 09 — Custom RBAC tables and policies
-- Source: supabase/rbac.sql
-- ============================================================
-- Run in the Supabase SQL editor after enabling Auth.
-- This migration is additive and keeps built-in roles compatible with custom role names.

create table if not exists public.roles (
  id text primary key,
  name text not null unique,
  permissions jsonb not null default '{}'::jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'Employee',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The original inline role check only allowed built-in roles; custom role names need to be valid too.
alter table public.user_profiles drop constraint if exists user_profiles_role_check;
alter table public.user_profiles alter column role set default 'Employee';

create table if not exists public.user_permissions (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text,
  module text not null,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, module)
);

alter table public.user_permissions add column if not exists role text;
alter table public.user_permissions add column if not exists can_create boolean not null default false;

alter table public.roles enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_permissions enable row level security;

-- Owner policies are intentionally explicit. Replace these only if your project uses a different owner profile source.
create policy "owners manage roles" on public.roles for all using (
  exists (select 1 from public.user_profiles owner_profile where owner_profile.id = auth.uid() and owner_profile.role = 'Owner' and owner_profile.active)
) with check (
  exists (select 1 from public.user_profiles owner_profile where owner_profile.id = auth.uid() and owner_profile.role = 'Owner' and owner_profile.active)
);

create policy "authenticated read roles" on public.roles for select using (auth.uid() is not null);

create policy "owners manage profiles" on public.user_profiles for all using (
  exists (select 1 from public.user_profiles owner_profile where owner_profile.id = auth.uid() and owner_profile.role = 'Owner' and owner_profile.active)
) with check (
  exists (select 1 from public.user_profiles owner_profile where owner_profile.id = auth.uid() and owner_profile.role = 'Owner' and owner_profile.active)
);

create policy "users read own profile" on public.user_profiles for select using (id = auth.uid());

create policy "owners manage permissions" on public.user_permissions for all using (
  exists (select 1 from public.user_profiles owner_profile where owner_profile.id = auth.uid() and owner_profile.role = 'Owner' and owner_profile.active)
) with check (
  exists (select 1 from public.user_profiles owner_profile where owner_profile.id = auth.uid() and owner_profile.role = 'Owner' and owner_profile.active)
);

create policy "users read own permissions" on public.user_permissions for select using (user_id = auth.uid());



-- ============================================================
-- 06 — Warranty register (canonical UUID-compatible version)
-- ============================================================
create table if not exists public.item_warranties (
  id text primary key,
  project_id uuid null references public.projects(id) on delete cascade,
  invoice_id uuid null references public.invoices(id) on delete cascade,
  workspace text not null default 'solar' check (workspace in ('solar', 'steel', 'furniture', 'irrigation')),
  project_source text not null default 'SS Global Direct',
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
alter table public.item_warranties enable row level security;
drop policy if exists item_warranties_authenticated_all on public.item_warranties;
create policy item_warranties_authenticated_all on public.item_warranties for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.item_warranties to authenticated;
revoke all on public.item_warranties from anon;


-- ============================================================
-- Final API schema refresh
-- ============================================================
notify pgrst, 'reload schema';
