# RBAC and Supabase setup

The ERP now has a local-first owner control panel. The Owner can invite users without entering a password, select a role or individual account, and toggle View, Edit, and Delete permissions. Local users and permission matrices are persisted in the browser.

For production Supabase Auth invites and Owner-triggered reset links, configure a real server-only `SUPABASE_SERVICE_ROLE_KEY`. The browser must never receive this value. The server endpoints are `/api/rbac/invite` and `/api/rbac/reset`; both require a verified Supabase access token and an active `Owner` row in `public.user_profiles`.

Run `supabase/rbac.sql` in the Supabase SQL editor, create the Owner profile using the real `auth.users.id`, and verify the Supabase Auth redirect URL includes the deployed login URL. Until this is completed, invite and reset actions fail closed with a clear configuration message while local RBAC remains available.

The protected router maps each module to its permission scope and renders the existing Not Found boundary when a signed-in user lacks View access. The sidebar uses the same permission resolver, so hidden navigation and direct URL protection stay aligned.
