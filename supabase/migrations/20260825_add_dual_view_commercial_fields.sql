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
