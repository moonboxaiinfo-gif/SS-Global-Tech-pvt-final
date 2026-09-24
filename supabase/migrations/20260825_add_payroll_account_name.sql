-- Forward-only compatibility migration for bank-ready payroll exports.
-- Safe to run repeatedly after 20260818_create_operations_and_payroll.sql.
begin;

alter table if exists public.payroll_batch_entries
  add column if not exists account_name text;

commit;

-- After applying this migration, refresh the Supabase API schema cache if the
-- connected project does not expose the new column immediately.
