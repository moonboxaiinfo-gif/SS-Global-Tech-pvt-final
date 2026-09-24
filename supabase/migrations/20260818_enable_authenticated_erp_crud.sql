-- SS Global Tech Enterprises — authenticated CRUD policy upgrade
-- Run after 20260818_harden_erp_rls.sql.
-- Authenticated users may now SELECT, INSERT, UPDATE, and DELETE ERP rows.
-- Replace the broad authenticated checks with role/workspace predicates before production.

begin;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['customers', 'leads', 'employees', 'projects', 'invoices', 'expenses'] loop
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('drop policy if exists %I on public.%I', 'ERP authenticated update ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'ERP authenticated delete ' || table_name, table_name);
    execute format('create policy %I on public.%I for update to authenticated using (true) with check (true)', 'ERP authenticated update ' || table_name, table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (true)', 'ERP authenticated delete ' || table_name, table_name);
  end loop;
end $$;

commit;
