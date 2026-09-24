# Phase 2 — HR & Payroll

- [x] Inspect the existing frontend routes, Supabase client, and dashboard layout conventions.
- [x] Replace Supabase loading with local mock companies, employees, and payroll records.
- [x] Add employee directory route with local-state search and add-employee modal/form.
- [x] Add payroll route with local employee/company selectors, calculator formula, save flow, and processed payroll table.
- [x] Wire navigation from the existing dashboard to Employees and Payroll pages.
- [x] Verify TypeScript/build status, responsive rendering, and key interaction states.
- [x] Save a Phase 2 checkpoint and deliver the updated project.

# Local Fallback and Publish

- [x] Audit local persistence coverage for Inventory, Quotations, Payroll, and Finance.
- [x] Add durable local-storage repositories for any missing module records and preserve Supabase-first behavior when authenticated.
- [x] Connect create/update/execute flows to local fallback state and refresh derived balances.
- [x] Run the production build and verify representative routes and interactions.
- [x] Save a checkpoint and provide the Management UI Publish step.

# All-Module Local Persistence

- [x] Audit Projects and Sub-Contracts for volatile state.
- [x] Add durable localStorage hydration and persistence for Projects and Sub-Contracts.
- [x] Verify existing Inventory, Quotations, Payroll, and Finance local-storage keys remain active.
- [x] Run typecheck, production build, and representative route verification.
- [x] Save a new checkpoint and provide the publishing action and test domain.

# Authentication and Permissions

- [x] Audit current Login, App routing, session state, and Roles page.
- [x] Enforce login-first routing and protect all dashboard routes.
- [x] Add owner-only user registration, role assignment, and password reset controls.
- [x] Add self-service password reset and profile update flow.
- [x] Run typecheck, production build, responsive verification, and save a checkpoint.

# Owner Password Update

- [x] Replace the Owner bootstrap password hash without storing plaintext credentials.
- [x] Run typecheck, production build, and Login verification.
- [x] Save an updated checkpoint and advise changing the shared password after first sign-in.

# Branded PDF and Print Exports

- [x] Audit invoice, quotation, finance, payroll, inventory, and project report export actions.
- [x] Add a shared SS Global Tech branded A4 PDF/print utility.
- [x] Connect every requested module to Download PDF and Print actions.
- [x] Validate downloads and print layouts, run typecheck/build, and save a checkpoint.

# Final Testing Release

- [x] Audit localStorage coverage for Inventory, Quotations, Sub-Contracts, Projects, Payroll, Finance, and Employees.
- [x] Confirm mock Owner login uses owner@admin.com with the requested password and remains login-first.
- [x] Add employee bank name, branch/code, account number, and account name fields with durable persistence.
- [x] Include bank details in monthly salary sheets and payroll PDFs.
- [x] Verify branded A4 PDF download and Print actions across requested modules.
- [x] Run typecheck, production build, route/refresh checks, and save a publishable checkpoint.

# Login Failure Recovery

- [x] Inspect the Owner seed, legacy stored-user migration, router guard, and browser error logs.
- [x] Fix the local Owner login/session migration path without plaintext credentials.
- [x] Run typecheck, production build, protected-route verification, and save a recovery checkpoint.

# Login Router Bypass Fix

- [x] Inspect Login auto-redirect, protected-route guard, and logout handler.
- [x] Ensure /login always renders Login UI unless valid credentials were just submitted.
- [x] Ensure logout clears session and navigates to /login.
- [x] Run typecheck, production build, refresh/logout checks, and save a recovery checkpoint.

# Premium Dark Mode Overhaul

- [x] Audit global theme tokens, shared dashboard surfaces, tables, badges, and representative page dark classes.
- [x] Implement deep-slate corporate dark-mode tokens, readable typography, refined borders, blue accents, and smooth transitions.
- [x] Apply and verify the treatment across representative ERP modules and auth screens.
- [x] Run typecheck, production build, light/dark visual checks, and save a publishable checkpoint.

# Fintech Dark Mode Refinement

- [x] Audit zinc/charcoal theme surfaces, navigation, header, forms, badges, and branding.
- [x] Implement sculpted panel depth, gold actions, teal active states, contrast fixes, and micro-interactions.
- [x] Verify dashboard, Finance, Payroll, Inventory, Reports, Login, sidebar, header, and identity surfaces.
- [x] Run typecheck, production build, visual verification, and save a publishable checkpoint.

# Home Visual Edit Verification

- [x] Inspect Home.tsx for duplicate style props and confirm the requested dashboard colors.
- [x] Correct invalid JSX/style issues without changing the intended visual edit.
- [x] Run typecheck, production build, visual verification, and save a checkpoint.

# Unified Canvas and Official Documents

- [x] Audit Overview canvas color, global surfaces, shared PDF renderer, and module exports.
- [x] Apply the exact Overview background consistently across all modules.
- [x] Rebuild the shared A4 PDF/print template with official company branding, metadata, client block, item grid, totals, notes, and footer.
- [x] Verify exports across invoices, quotations, payroll, projects, finance, inventory, warranties, and reports.
- [x] Run typecheck, production build, visual checks, and save a checkpoint.

# Official Invoice PDF Replication

- [x] Inspect 0012.pdf visually and structurally and compare it with the shared renderer.
- [x] Recreate the official header, metadata, Bill To block, item grid, totals, notes, and footer.
- [x] Ensure invoice, quotation, payroll, warranty, project, and finance exports share the template.
- [x] Validate PDFs and print routes, run typecheck/build, and save a checkpoint.

# 100% Reference PDF Fidelity

- [x] Compare the 0012.pdf reference against the current renderer and record exact differences.
- [x] Refine logo/header proportions, typography, metadata, table geometry, totals, notes, and footer.
- [x] Validate universal exports, run typecheck/build, compare output, and save a checkpoint.

# Light Theme Only Redesign

- [x] Audit ThemeContext, theme toggle, global CSS, dashboard shell, and dark-mode classes.
- [x] Remove dark-mode controls and enforce the premium light canvas and surface hierarchy.
- [x] Refine sidebar, header, tables, badges, inputs, buttons, and responsive interactions.
- [x] Run typecheck, production build, visual verification, and save a checkpoint.

# Attached Dashboard Visual Redesign

- [x] Audit the attached light dashboard direction, shared shell, global tokens, cards, navigation, and module surfaces.
- [x] Implement deep steel-blue sidebar/header, off-white canvas, active pills, typography, and white cards.
- [x] Refine Overview metrics, icon tiles, filters, progress visuals, actions, tables, badges, and module consistency.
- [x] Run typecheck, production build, responsive visual verification, and save a checkpoint.

# Dual Light and Dark Theme

- [x] Audit the light-only ThemeContext, global tokens, toggle remnants, shared shell, charts, and representative module classes.
- [x] Restore persistent theme state and add an accessible Light/Dark toggle to the shared header.
- [x] Implement the premium charcoal/cyan fintech dark palette with contrast-safe dual-mode surfaces.
- [x] Verify theme switching across representative modules, run typecheck/build, and save a checkpoint.

# Exact Premium Dark Reference Palette

- [x] Audit dual-theme tokens, shared shell, Overview cards/charts/actions, and module surfaces.
- [x] Apply exact #081418 canvas, #6a879a active state, #8a9ca8 inactive text, #d4b470 accents, and specified widget colors globally.
- [x] Redesign Overview chart glows, donut segments, and transparent action buttons.
- [x] Run typecheck, production build, dark/light visual checks, and save a checkpoint.

# Workspace Dropdown Contrast Fix

- [x] Locate the Workspace dropdown trigger and menu item classes.
- [x] Apply readable dark text and light hover styling for dropdown items in both theme contexts.
- [x] Run typecheck, production build, visual verification, and save a recovery checkpoint.

# Glassmorphism Login Adaptation

- [x] Inspect the attached ZIP structure, assets, styles, and interaction behavior.
- [x] Adapt the glassmorphism design into the existing protected Login component.
- [x] Validate Owner login, protected redirects, reset flows, responsive presentation, and production build.
- [x] Save a publishable checkpoint and report the adapted login design.

# Login Video Replacement

- [x] Inspect the supplied video and current Login composition.
- [x] Upload and wire the video, remove current animation layers, and shift the desktop form right with mobile safeguards.
- [x] Run build and responsive Login verification, then save a checkpoint.

# Light Mode Quick Action Contrast Fix

- [x] Locate Overview Quick Action buttons and scan shared action strips.
- [x] Apply solid readable Light Mode styling, sharper sub-text, and hover elevation.
- [x] Run typecheck, production build, responsive visual verification, and save a checkpoint.

# Home Quick Action Style Cleanup

- [x] Inspect the Action component for duplicate inline styles and confirm the intended teal color.
- [x] Preserve a single accessible teal Light Mode action style and dark-mode behavior.
- [x] Run typecheck, production build, visual verification, and save a checkpoint.

# Neon Blue Quick Actions

- [x] Inspect the current Action component and theme-specific classes.
- [x] Apply neon-blue gradient, cyan glow, border, contrast-safe text, and hover motion in both themes.
- [x] Run typecheck, production build, responsive visual verification, and save a checkpoint.

# Softened Quick Action Glow

- [x] Inspect the current Quick Action classes and neon shadow values.
- [x] Apply deeper cyan-blue tones, softer aura shadows, and crisp white text/sub-label styling.
- [x] Run typecheck, production build, visual verification, and save a checkpoint.

# Softened Quick Action Glow

- [x] Inspect the current Quick Action classes and neon shadow values.
- [x] Apply deeper cyan-blue tones, softer aura shadows, and crisp white text/sub-label styling.
- [x] Run typecheck, production build, visual verification, and save a checkpoint.

# Notification & Reminder System

- [x] Define local notification and reminder models with durable storage.
- [x] Add exact one-day reminder evaluation, seven-day warranty alerts, low-stock alerts, and 80%/100% budget alerts.
- [x] Add Overview reminder modal and shared top-bar notification center with deep links.
- [x] Persist project expense entries for budget evaluation after refresh.
- [x] Validate typecheck, production build, and protected route rendering.

# Targeted ERP Fixes

- [x] Repair the Overview revenue and profit horizontal bar chart binding.
- [x] Replace Employee Disconnect with confirmed Delete and remove the record.
- [x] Change invoice warranty to a free-form input.
- [x] Add invoice quantity inputs and calculate line/final totals from quantity times unit price.
- [x] Fix Role & Permissions button contrast in dark mode.
- [x] Validate affected routes and save a checkpoint.

# Targeted ERP Fixes — Completed

- [x] Repaired the Overview revenue and profit horizontal bar chart with explicit numeric axes and direct Recharts Bar bindings.
- [x] Replaced employee deactivation with a confirmed permanent Delete action and remote delete attempt.
- [x] Changed invoice Warranty to a free-form manual input.
- [x] Added invoice Quantity and Unit Price inputs with quantity-aware line and final totals.
- [x] Added explicit dark-mode contrast classes to Role & Permissions controls.
- [x] Passed TypeScript validation, production build, label checks, and protected route screenshots.

# Tenant Rename: Browns to Deep Tech

- [x] Search all source, data, seed, and configuration files for Browns variants.
- [x] Replace company-name occurrences with Deep Tech while preserving Hayleys.
- [x] Verify the workspace/company selector labels and confirm no old variants remain.
- [x] Run typecheck and production build, then save a checkpoint.

# Tenant Rename: Browns to Deep Tech — Completed

The source search found Browns references in accounting data, Reports, and Sub-Contracts. All company-name labels now use Deep Tech, internal work-order IDs were made Deep-Tech-safe, and Hayleys remains unchanged. Source verification found no Browns, borwnas, or borwonacs variants. TypeScript validation and the production build passed.

# Sub-Contracts Theme Crash Fix

- [x] Trace the undefined partner theme lookup and stale localStorage record path.
- [x] Normalize legacy partner values and add a safe theme fallback.
- [x] Verify `/projects/accounting`, typecheck, and production build.
- [x] Save a bug-fix checkpoint.

# Sub-Contracts Theme Crash Fix — Completed

Normalized legacy partner values such as old Browns records to Deep Tech, added a safe partner-theme resolver, and replaced direct theme indexing in the partner cards, project ledger, and detail badge. TypeScript validation and the production build passed after the fix.

# Full ERP Error Audit

- [x] Inspect recent dev-server, browser console, and network error signals.
- [x] Run typecheck/build and audit routes, persistence, and stale tenant data paths.
- [x] Fix every reproducible compile/runtime issue found in the audit.
- [x] Verify representative protected and ERP routes plus key interactions.
- [x] Save a stable checkpoint and document any remaining unverified risks.

# WhatsApp Document Sharing

- [x] Inspect invoice, quotation, report, and PDF utility data shapes and export actions.
- [x] Add a Supabase Storage upload utility with local/public-link fallback and clear failure handling.
- [x] Add Sri Lankan phone normalization and encoded WhatsApp message generation.
- [x] Add Send via WhatsApp actions to invoice, quotation, and report pages.
- [x] Validate URL generation, exports, typecheck/build, and save a checkpoint.

# RBAC & Supabase User Management

- [x] Inspect current auth, roles, sidebar, route definitions, and Supabase configuration.
- [x] Design secure Supabase invite/reset integration with local-first fallback; never store owner-entered raw passwords.
- [x] Implement owner-only user management and a View/Edit/Delete permission matrix with persistence.
- [x] Apply permission-aware sidebar visibility and direct-route guards.
- [x] Validate owner/non-owner behavior, invite/reset error handling, permissions, typecheck, and build.
- [x] Save an RBAC checkpoint and document Supabase setup requirements.

# RBAC Temporary Credential Decision

- [x] Keep Supabase admin invite/reset calls disabled until a valid service-role key is supplied.
- [x] Implement local-first RBAC and user-management behavior without storing owner-managed raw passwords.
- [x] Show clear configuration feedback for unavailable remote invite/reset operations.

# RBAC & Supabase User Management — Completed

Implemented owner-only local RBAC controls with View/Edit/Delete matrix persistence, secure-invite UI with no raw password field, reset-email actions, role/user targeting, permission-aware sidebar filtering, and direct-route guards. Added server-side Supabase Auth invite/reset endpoints that require a verified Supabase Owner session and server-only service-role key; temporary credentials remain non-functional by design and fail closed. Added Supabase schema reference at `supabase/rbac.sql`, RBAC unit tests, dependency repair, typecheck, production build, server restart, and protected route screenshots.

# Projects Workspace Routing Refinement

- [x] Inspect activeWorkspace identifiers and current Projects filtering, cards, routes, and create form.
- [x] Add Solar-only Hayleys, Deep Tech, and SS Global Direct company-card drill-down.
- [x] Pre-fill and lock the company field when creating from a Solar company card.
- [x] Preserve the standard project list and create form for Irrigation and Iron Works.
- [x] Validate workspace flows, typecheck/build, and save a checkpoint.

# Projects Workspace Routing Refinement — Gap Resolved

- [x] Added an actual disabled Solar company field to the project creation form, persisted the selected partner on new projects, and surfaced the partner on ProjectDetail.
- [x] Added focused workspace/data tests; typecheck, production build, and protected route screenshots passed.

# Dynamic Role & User Permission Management

- [x] Inspect current RBAC UI, auth helpers, secure server endpoints, schema reference, and session model.
- [x] Define custom role, module permission, user assignment, and fallback-role data models.
- [x] Implement owner-only custom role creation, editing, permission persistence, and deletion with fallback reassignment.
- [x] Implement invitation-based user creation and owner-confirmed removal/access revocation.
- [x] Propagate role permission updates live to the current session, sidebar, and route guards.
- [x] Add focused lifecycle tests and run typecheck/build plus route verification.
- [x] Save a checkpoint and document the real Supabase setup requirements.

# Attached ERP Architecture Brief

- [x] Audit the current code against workspace, Projects, invoices, quotations, WhatsApp, and RBAC requirements.
- [x] Reconcile workspace options and remove the Sub-Contracts navigation item if required by the brief.
- [x] Preserve Solar project source cards and standard Irrigation/Iron Works Projects behavior.
- [x] Add public and internal invoice/quotation fields with a clear internal-details UI section.
- [x] Ensure all customer-facing PDFs omit supplier, cost, margin, serial, supplier-warranty, and order-source data.
- [x] Add or refine the editable WhatsApp recipient modal before upload and send.
- [x] Verify RBAC lifecycle, tests, typecheck, build, and route flows, then save a checkpoint.

# Inherited ERP Completion — August 2026

- [x] Complete quotation Internal Details UI with supplier, buying cost, margin, serial, supplier warranty, and order source fields.
- [x] Keep quotation PDFs and WhatsApp payloads customer-safe by excluding internal procurement fields.
- [x] Finalize the quotation WhatsApp recipient modal with Sri Lankan phone normalization and shared document delivery utility.
- [x] Reconcile the global Workspace selector to All Workspaces, Solar Energy, Iron Works, and Irrigation for the current three-vertical brief.
- [x] Remove legacy Furniture from visible Quotation and Projects workspace filters while preserving historical records for compatibility.
- [x] Verify Owner-only Roles & Permissions UI, live custom-role permission resolution, protected login routing, explicit logout, Solar three-card Projects routing, and Iron Works standard Projects routing.
- [x] Add forward-only Supabase migration documentation for public/internal invoice and quotation fields; remote execution remains pending a valid service-role configuration.
- [x] Run Vitest and production build successfully; capture browser verification findings.

# Full Error Audit — August 2026

- [x] Inspect current TypeScript, Vite, browser-console, network, and server diagnostics.
- [x] Reproduce and fix every confirmed compile or runtime error found in the audit.
- [x] Verify protected and public routes do not crash or expose invalid views.
- [x] Verify Invoice, Quotation, Warranty, Projects, RBAC, and WhatsApp flows after fixes.
- [x] Add regression tests for each newly fixed reproducible error.
- [x] Run the full test suite, type validation, production build, and representative visual checks.

# Attached Four-Vertical ERP Prompt

- [x] Ensure the global activeWorkspace state exposes exactly Solar Energy, Irrigation, Iron Work, and Furniture, defaulting to Solar Energy.
- [x] Ensure Header, Sidebar, and child routes react immediately to Workspace changes without reload.
- [x] Remove every Sub-contract menu and navigation surface.
- [x] Preserve Solar Projects’ Hayleys, Deep Tech, and SS Global Direct three-card hub with filtered drill-down and locked Project Source in the create form.
- [x] Preserve the standard Projects list/form for Irrigation, Iron Work, and Furniture.
- [x] Maintain public and private Invoice/Quotation fields and customer-safe PDFs.
- [x] Implement Invoice/Quotation WhatsApp modal sharing with public PDF URL delivery through Supabase Storage.
- [x] Expose exactly Admin/Owner, Accountant, and Technician core roles with secure invites and no raw-password handling.
- [x] Enforce owner-only user removal/revocation and dynamic sidebar/route permissions.
- [x] Add regression coverage, visual checks, and final build validation for this prompt scope.

# Solar Projects Warranty Details Relocation

- [x] Remove Warranty Tracker from the global Sidebar navigation.
- [x] Preserve multi-item SS Global Direct New Project warranty fields: item name, supplier, serial, supplier expiry, and customer expiry.
- [x] Add a prominent Solar-only Warranty Details action to the Projects & Costing action bar.
- [x] Add a searchable Warranty Overview view aggregating all item warranties across SS Global Direct projects.
- [x] Support search by serial number, customer name, or supplier name and keep the feature unavailable outside Solar Energy.
- [x] Add regression tests, visual verification, and build validation for the relocated warranty flow.

# Invoice Single-Entry Dual-View and Access Control

- [x] Split Invoice create/edit UI into public Customer Details and private Internal Cost & Profit Details sections.
- [x] Support public customer, item, quantity, unit selling price, discount, and total fields.
- [x] Support private supplier name, unit buying cost, and calculated selling-minus-cost profit fields.
- [x] Ensure customer-facing Invoice PDFs contain no supplier, buying-cost, or profit fields.
- [x] Change Invoice WhatsApp sharing to local PDF download followed by formatted wa.me chat redirect.
- [x] Restrict Invoice navigation and direct route access to Admin/Owner and Accountant; deny Technicians.
- [x] Add regression tests and validate Invoice UI, PDF privacy, WhatsApp flow, and role guards.

# Workspace-Specific Item Selection

- [x] Ensure every inventory/product record has a normalized workspace tag for Solar Energy, Irrigation, Iron Work, or Furniture.
- [x] Add a shared active-workspace item filter that strictly excludes items from other workspaces.
- [x] Apply the filter to Invoice item selection.
- [x] Apply the filter to Quotation item selection.
- [x] Apply the filter to Project item entry.
- [x] Add regression tests for Solar-only visibility and all supported workspaces.
- [x] Run tests, typecheck, production build, visual verification, and save a checkpoint.

# Project Status Workflow

- [x] Confirm the project status model uses Planning, In Progress, Completed, and On Hold with Planning as the default.
- [x] Add required Project Status selection to create and edit project forms.
- [x] Add quick project status changes from the project details view or action menu.
- [x] Connect All, Planning, In Progress, Completed, and On Hold tabs to dynamic project filtering.
- [x] Add status workflow regression tests and validate the UI, typecheck, build, and persistence.

# RBAC Roles and User Email Updates

- [x] Restrict visible and assignable system roles to Owner (Admin), Manager, Accountant, and Technician.
- [x] Add Owner/Admin-only user email editing in Settings -> User Management.
- [x] Validate email format and prevent duplicate registered email addresses.
- [x] Synchronize updated email addresses with authentication records when remote auth is available, with safe local fallback.
- [x] Add RBAC and email-update regression tests, then validate typecheck, build, and UI behavior.

# Role Card Assigned Users

- [x] Show assigned users under each built-in role card in Roles & Permissions.
- [x] Add inline Edit Email controls for users assigned to the selected role.
- [x] Add role-specific Assign / Invite User action under each role card.
- [x] Persist role assignment and synchronize email changes with authentication and user-profile records.
- [x] Add role-card user-management regression tests and validate typecheck, build, and UI behavior.

# Supabase Auth and In-App Password Management

- [x] Restrict sign-in to pre-registered Supabase Auth email/password users when Supabase is configured.
- [x] Hydrate the signed-in role from public.profiles by Auth user id and store it in global auth state.
- [x] Normalize and enforce Owner, Manager, Accountant, and Technician roles across route guards.
- [x] Add a Login-screen Change Password form with email, current password, new password, and confirmation.
- [x] Verify current credentials with Supabase signInWithPassword and update password with Supabase updateUser without reset links.
- [x] Add the same in-app password-change flow to the authenticated profile/settings view.
- [x] Add auth regression tests, typecheck, production build, and login/profile visual verification.

# Supabase Auth Requirements Re-Verification

- [x] Verify configured Supabase sign-in rejects non-registered or invalid credentials before local fallback.
- [x] Verify sign-in fetches role from profiles by Auth user id and persists it in the global session.
- [x] Verify Login and Profile Change Password forms capture email, current password, new password, and confirmation.
- [x] Verify password changes use signInWithPassword then updateUser, return the exact current-password error, and avoid reset links.
- [x] Re-run auth tests, typecheck, build, and Login/Profile visual checks.

# Supabase Roles and Permissions Integration

- [x] Fetch profiles with assigned roles and show live assigned-user counts on each role card.
- [x] Filter assigned users by the selected role in the Roles & Permissions view.
- [x] Persist role reassignment through the Supabase profiles update path and refresh the UI.
- [x] Make Access Matrix permissions state-driven, role-specific, loadable, and saveable.
- [x] Preserve local fallback behavior and add regression coverage.
- [x] Run tests, typecheck, production build, visual verification, and save a checkpoint.

# Comprehensive Bug Audit and Hardening

- [x] Audit TypeScript, production build, dev-server, browser-console, and network errors.
- [x] Audit authentication, route guards, role hydration, and protected pages.
- [x] Audit local persistence and Supabase fallback behavior across core modules.
- [x] Audit workspace filtering, project status, RBAC, and Roles & Permissions workflows.
- [x] Audit PDF privacy, WhatsApp download flow, and document generation paths.
- [x] Fix every reproducible defect found during the audit.
- [x] Add or update regression tests for each repaired defect.
- [x] Run the complete test suite, typecheck, production build, logs review, and responsive route checks.
- [x] Save a validated checkpoint and document any external-service-dependent limitations.

# Netlify SPA Fallback

- [x] Add `client/public/_redirects` containing `/* /index.html 200`.
- [x] Verify the production build copies `_redirects` into the deploy output.
- [x] Commit and push the redirect fix directly to GitHub `main`.

# Netlify 404 Deployment Fix — Completed

- [x] Inspected the Vite output directory, Netlify files, and GitHub branch state.
- [x] Ensured `client/public/_redirects` contains `/* /index.html 200`.
- [x] Added root `netlify.toml` with `client/dist` publishing and SPA fallback redirects.
- [x] Updated the build command to populate `client/dist` while preserving the existing application build output.
- [x] Verified the production output and confirmed the configuration on GitHub `main`.

# Remove Root Netlify Configuration — Completed

- [x] Deleted the root `netlify.toml` file.
- [x] Preserved `client/public/_redirects` with exactly `/* /index.html 200`.
- [x] Committed and pushed the change directly to GitHub `main`.
- [x] Verified the local repository state after the push.

# Netlify Supabase Login Configuration

- [x] Audit Supabase client initialization and Vite environment variable names.
- [x] Resolve VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY safely for production builds.
- [x] Add non-secret Supabase configuration diagnostics without logging the full anon key.
- [x] Add authentication configuration regression coverage and validate the production build.
- [x] Push the login configuration fix directly to GitHub `main`.

# Netlify npm Build Fix

- [x] Inspect root/client package manifests and all lockfiles for conflicts.
- [x] Clean up and regenerate the client package-lock.json if the client package exists.
- [x] Align the root build script with the verified repository layout.
- [x] Validate clean npm install/build and Netlify publish output.
- [x] Commit and push the build fix directly to GitHub `main`.

# Exact Netlify Root Build Script

- [x] Set root `package.json` `build` to `npm --prefix client install && npm --prefix client run build`.
- [x] Validate the package script and push the update directly to GitHub `main`.
