# Remaining Supabase Modules & Payroll Execution

- [ ] Audit Inventory, Quotations, Sub-Contracts, Payroll Batch, and Finance queue models and current local-only flows.
- [ ] Create secure Supabase schemas for inventory items/movements, quotations/line items, sub-contracts/claims, and payroll batches/entries.
- [ ] Add authenticated RLS policies and preserve anonymous read/write restrictions.
- [ ] Add typed repositories for the new tables and connect module CRUD with local fallback.
- [ ] Connect Salary batch creation to Finance Payroll Bank Transfers and persist payout status.
- [ ] Validate ledger calculations, constraints, responsive routes, and owner fallback behavior.
- [ ] Execute CRUD and module migrations through an authenticated Supabase SQL Editor session.
- [ ] Save a stable checkpoint and report any migration/authentication prerequisite that remains.
