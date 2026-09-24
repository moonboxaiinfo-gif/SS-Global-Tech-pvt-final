# SS Global Tech — Supabase setup

මෙම project එකේ CRM, Employees, Projects, සහ Finance pages තුළ තිබූ demo/seed records සහ local fallback save paths ඉවත් කර ඇත. දැන් එම pages authenticated Supabase session එකකින් records load/save කරයි. Supabase request එක fail වුවහොත් fake data පෙන්වන්නේ නැති අතර, empty state සහ error message පෙන්වයි.

## Environment variables

Vite build/run environment එකේ පහත variables දෙන්න:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_ANON_KEY
```

`service_role` key එක browser code එකට හෝ `.env` committed file එකකට දාන්න එපා.

## Database migration

Supabase SQL Editor එකෙන් project එකේ `supabase/migrations` directory එකේ SQL files date order එකෙන් run කරන්න. Core ERP tables සඳහා අවම වශයෙන් පහත files අවශ්‍ය වේ:

1. `20260818_create_customers_and_leads.sql`
2. `20260818_create_erp_core.sql`
3. `20260818_create_operations_and_payroll.sql`
4. `20260818_enable_authenticated_erp_crud.sql`
5. `20260818_harden_erp_rls.sql`
6. පසුව ඇති `20260825_*` සහ `20260826_*` schema updates
7. `20260921_create_finance_ledger.sql`

**Cash in Hand / Petty Cash සහ Bank Account Balance සඳහා අලුත් migration එක:**

`supabase/migrations/20260921_create_finance_ledger.sql` run කළ පසු `finance_accounts` සහ `finance_entries` tables දෙක සෑදේ. Code එකේ default `84200`, `433780` වැනි fake balance කිසිවක් නැත. පළමුව Finance page එකේ **Add Account** මගින් ඔබගේ සැබෑ opening balance ඇතුළත් කරන්න.

Login කිරීමට පෙර Supabase Auth user එකක් create කර තිබිය යුතුය. Core ERP policies authenticated users සඳහා read/insert access දෙයි. Role-based restrictions තවදුරටත් `supabase/rbac.sql` අනුව configure කරන්න.

## Changed data paths

| Page | Before | Now |
|---|---|---|
| CRM | `operationsData.ts` seeded leads/tickets සහ local save fallback | `customers` සහ `leads` Supabase tables; service tickets සඳහා fake rows ඉවත් කර empty configuration state |
| Employees | `hrData.ts` `initialEmployees` සහ `setTimeout` local insert | `employees` Supabase table (`full_name`, `salary`, `department`, `status`) |
| Projects | `initialProjects`, localStorage persistence, local save fallback | `projects` Supabase table; failed reads/saves do not create local records |
| Finance | Fake `pettyCash = 84200`, fake `bank all = 433780`, localStorage ledger | `finance_accounts` + `finance_entries`; balances are calculated from opening balances and saved entries |

## Finance buttons

`Record Income`, `Record Expense`, `Cash/Bank Transfer`, `Add Account`, සහ ledger එකේ delete button authenticated Supabase CRUD calls භාවිතා කරයි. Transfer එක source account එකෙන් `Out` entry එකක් සහ destination account එකට `In` entry එකක් ලෙස atomic application-level pair එකක් සුරකිනවා. PDF/Print buttons database state එකෙන් report එක generate කරනවා; ඒවා database mutation නොවන නිසා save action එකක් නොකරයි.

## Validation

`npm install`, `npm run check`, සහ `npm run build:static` සාර්ථකව complete විය. Build එකේ පවතින warning එක large bundle size ගැන පමණි.

## Remaining migration scope

Inventory, Payroll, Quotations, Subcontracts, Warranties, Reports, සහ several dashboard summary widgets තවමත් legacy local data modules භාවිතා කරයි. ඒවා සඳහා migration files තිබුණත්, UI-level data loading/CRUD එක සම්පූර්ණයෙන් database-only කර නැත. ඒ modules ඊළඟ pass එකේ එකින් එක remote repositories/hooks වෙත මාරු කළ යුතුය.

## Complete live-data pass (2026-09-22)

The application now reads and writes the following operational modules through Supabase: Finance ledger and dashboard balances, inventory items and movements, projects and project expenses, employee master, payroll, employee advances, sub-contracts and cost deductions, item warranties, CRM, and project status/payment actions. Dashboard and Reports KPI cards and trend charts are calculated from Supabase rows rather than seeded financial constants. The shared SS Global Tech logo is an inline SVG and does not depend on a missing image URL.

Run `supabase/migrations/20260922_create_employee_advances.sql` after the existing migrations. The migration creates the `employee_advances` table with authenticated CRUD policies. Existing migrations for `inventory_items`, `inventory_movements`, `subcontracts`, `payroll`, `project_expenses`, `finance_accounts`, `finance_entries`, and `item_warranties` must also be applied.

Create the Supabase Auth user first, then create the matching `profiles` row with role `Owner`, `Manager`, `Accountant`, or `Technician`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the client environment. Production login uses Supabase Auth; the guest preview flag is development-only and must not be used as a production authentication method.

Empty tables intentionally render empty states. No module should be expected to show sample records until real rows are inserted by the forms or imported into Supabase.
