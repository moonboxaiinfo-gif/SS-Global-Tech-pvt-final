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
