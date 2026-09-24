# SS Global Tech Production Audit

## Completed in this update

The static deployment path is now configured for Netlify with `npm run build:static`, `dist/public` publishing, and an SPA fallback from every route to `/index.html`. The project includes a safe `.env.example` containing only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The production browser entry no longer initializes the Manus tRPC/login bootstrap. Protected routes now validate a current Supabase Auth session and an active `profiles` row before rendering the workspace. The development guest preview remains available only in development mode. The login page no longer depends on the unavailable Manus video or background assets; the supplied logo remains a local public asset.

The shared ERP table union now includes payroll and employee advances. Empty remote collections have explicit types and empty-state-safe rendering. Payroll Settlement no longer crashes when the remote employee table is empty. Warranty rows now map the required sale and start-date fields. The production static build has been verified, and TypeScript check completes successfully.

## Required deployment configuration

Set these variables in Netlify under **Site configuration → Environment variables**:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

The same variable names belong in a local `.env.local` during development. Never commit `.env`, `.env.local`, service-role keys, database passwords, or JWT secrets.

Run the Supabase SQL bundle from `SUPABASE_SQL_EDITOR_ALL.sql` in Supabase SQL Editor before signing in. Configure Supabase Auth redirect URLs for the Netlify site URL and `/login` recovery flow.

## Verification

| Check | Result |
|---|---|
| `npm run build:static` | Passed |
| `npm install` | Passed |
| `npm run check` | Passed |
| Netlify output `dist/public/index.html` | Present |
| Supplied logo in production output | Present |
| Netlify SPA fallback | Configured in `netlify.toml` and `client/public/_redirects` |
| Full legacy Vitest suite | 9 passed, 4 failed |

The four failing legacy tests assert removed fake/demo fixtures or the old local RBAC fixture behavior. They must be rewritten as Supabase-backed integration tests before declaring the complete test suite green. No production build or TypeScript errors remain from those tests.

## Remaining work before a final production sign-off

A full production sign-off still requires executing the Supabase-backed browser acceptance matrix against a real project: wrong-password failure, logout, refresh persistence, role restrictions, customer/employee/project/inventory/finance/payroll/CRM/reports loading, create/edit/delete flows, empty database states, Supabase failure states, password recovery, and Netlify deep links.

The repository still contains legacy compatibility helpers used by tests or inactive components, including local RBAC fallback helpers, the old `useAuth` tRPC hook, and a few unused local finance helper components. They are not initialized by the production browser entry, but should be removed or migrated in a subsequent cleanup if the repository must contain zero legacy Manus/local-auth references.

## NPM-only standardization (2026-09-24)

The repository is now standardized on npm. The pnpm lockfile, nested client lockfile, pnpm package-manager metadata, pnpm dev dependency, and stale template pnpm configuration were removed. One root `package-lock.json` is present. The final production commands were executed successfully from the repository root:

```text
npm install          PASS
npm run check        PASS
npm run build:static PASS
```

Netlify remains configured with `npm run build:static`, publish directory `dist/public`, and Node.js 22. `npm install` reports nine dependency audit findings in the current dependency graph (six moderate, two high, one critical); these are recorded for dependency remediation and were not force-upgraded because that could introduce breaking UI changes.
