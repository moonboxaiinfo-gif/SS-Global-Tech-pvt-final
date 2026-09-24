# Deep System Audit & Bug Fixing

- [x] Audit Supabase repositories and CRUD coverage for Inventory, Quotations, Projects, Sub-Contracts, Payroll, Finance, Customers, Leads, Employees, Invoices, and Expenses. Confirmed six core repositories; Inventory, Quotations, Sub-Contracts, and payroll ledgers remain local-only because their tables/repositories do not yet exist.
- [x] Verify current RLS capabilities and identify operations blocked by authenticated-only read/insert policies. Prepared `supabase/migrations/20260818_enable_authenticated_erp_crud.sql` for authenticated UPDATE/DELETE.
- [x] Audit project profit, sub-contract retention, payroll net salary, and cash/bank balance calculations. Project profit/margin and retention formulas are internally consistent; Final Statement now includes project labor allocations.
- [x] Trace Payroll Draft Batch → Finance Transfer → Bank Payout and identify database constraint or state-sync gaps. The workflow is currently local-only and needs persisted payroll batch/entry tables before it can be database-backed.
- [x] Audit representative Workspace routes for broken controls, indicators, and chart rendering. Desktop screenshots completed for Overview, Projects, Salary, Finance, Inventory, Quotation, Sub-Contracts, and CRM.
- [x] Apply fixes for confirmed gaps: project expenses and receipts now attempt Supabase persistence with safe local fallback; Final Statement includes synchronized project labor; authenticated CRUD policy migration prepared.
- [x] Run TypeScript validation, production build, and representative desktop screenshots. Build passes with only the existing bundle-size warning.
- [x] Document remaining actions requiring Supabase authentication, migration execution, or policy changes in the final audit report.
- [x] Save a stable audit checkpoint.
