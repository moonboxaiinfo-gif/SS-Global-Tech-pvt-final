import type { Express, Request, Response } from "express";

function jsonError(res: Response, status: number, message: string) {
  return res.status(status).json({ message });
}

function config() {
  const rawUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { baseUrl: rawUrl?.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, ""), anonKey, serviceRoleKey };
}

function serviceHeaders(serviceRoleKey: string, extra: Record<string, string> = {}) {
  return { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, ...extra };
}

async function ownerFromRequest(req: Request) {
  const { baseUrl, anonKey, serviceRoleKey } = config();
  const accessToken = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!baseUrl || !anonKey || !serviceRoleKey || !accessToken) return null;
  const userResponse = await fetch(`${baseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } });
  if (!userResponse.ok) return null;
  const user = await userResponse.json() as { id?: string };
  if (!user.id) return null;
  const profileResponse = await fetch(`${baseUrl}/rest/v1/user_profiles?id=eq.${encodeURIComponent(user.id)}&select=role,active`, { headers: serviceHeaders(serviceRoleKey) });
  if (!profileResponse.ok) return null;
  const profiles = await profileResponse.json() as Array<{ role?: string; active?: boolean }>;
  return profiles[0]?.role === "Owner" && profiles[0]?.active !== false ? { userId: user.id } : null;
}

async function supabaseAdminFetch(path: string, init: RequestInit = {}) {
  const { baseUrl, serviceRoleKey } = config();
  if (!baseUrl || !serviceRoleKey) return null;
  return fetch(`${baseUrl}${path}`, { ...init, headers: { ...serviceHeaders(serviceRoleKey, { "Content-Type": "application/json" }), ...(init.headers || {}) } });
}

async function ensureProfile(userId: string, displayName: string, role: string) {
  return supabaseAdminFetch("/rest/v1/user_profiles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ id: userId, display_name: displayName, role, active: true }) });
}

export function registerRbacRoutes(app: Express) {
  app.post("/api/rbac/invite", async (req, res) => {
    try {
      if (!await ownerFromRequest(req)) return jsonError(res, 403, "Owner Supabase session required.");
      const { baseUrl, serviceRoleKey } = config();
      const { email, displayName, role } = req.body ?? {};
      if (!baseUrl || !serviceRoleKey) return jsonError(res, 503, "Supabase server integration is not configured.");
      if (typeof email !== "string" || typeof displayName !== "string" || typeof role !== "string") return jsonError(res, 400, "Email, name, and role are required.");
      const response = await fetch(`${baseUrl}/auth/v1/admin/invite`, { method: "POST", headers: serviceHeaders(serviceRoleKey, { "Content-Type": "application/json" }), body: JSON.stringify({ email: email.trim().toLowerCase(), data: { display_name: displayName.trim(), role } }) });
      const payload = await response.json().catch(() => ({})) as { id?: string; user?: { id?: string } };
      if (!response.ok) return jsonError(res, response.status, "Supabase could not send the invite email.");
      const invitedUserId = payload.id || payload.user?.id;
      if (invitedUserId) await ensureProfile(invitedUserId, displayName.trim(), role);
      return res.json({ sent: true, message: "Secure invite sent." });
    } catch (error) {
      console.error("[RBAC] Invite failed:", error);
      return jsonError(res, 500, "Secure invite service unavailable.");
    }
  });

  app.post("/api/rbac/reset", async (req, res) => {
    try {
      if (!await ownerFromRequest(req)) return jsonError(res, 403, "Owner Supabase session required.");
      const { baseUrl, serviceRoleKey } = config();
      const { email } = req.body ?? {};
      if (!baseUrl || !serviceRoleKey) return jsonError(res, 503, "Supabase server integration is not configured.");
      if (typeof email !== "string" || !email.trim()) return jsonError(res, 400, "Email is required.");
      const response = await fetch(`${baseUrl}/auth/v1/admin/generate_link`, { method: "POST", headers: serviceHeaders(serviceRoleKey, { "Content-Type": "application/json" }), body: JSON.stringify({ type: "recovery", email: email.trim().toLowerCase(), redirect_to: `${req.protocol}://${req.get("host")}/login` }) });
      if (!response.ok) return jsonError(res, response.status, "Supabase could not generate a reset link.");
      return res.json({ sent: true, message: "Password reset email requested." });
    } catch (error) {
      console.error("[RBAC] Reset failed:", error);
      return jsonError(res, 500, "Password reset service unavailable.");
    }
  });

  app.post("/api/rbac/roles", async (req, res) => {
    try {
      if (!await ownerFromRequest(req)) return jsonError(res, 403, "Owner Supabase session required.");
      const { id, name, permissions } = req.body ?? {};
      if (typeof id !== "string" || typeof name !== "string" || !permissions || typeof permissions !== "object") return jsonError(res, 400, "Role id, name, and permissions are required.");
      const response = await supabaseAdminFetch("/rest/v1/roles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ id, name: name.trim(), permissions, is_system: false }) });
      if (!response) return jsonError(res, 503, "Supabase server integration is not configured.");
      if (!response.ok) return jsonError(res, response.status, "Supabase could not save the custom role.");
      return res.json({ synced: true, message: "Custom role synced." });
    } catch (error) {
      console.error("[RBAC] Role save failed:", error);
      return jsonError(res, 500, "Custom role service unavailable.");
    }
  });

  app.delete("/api/rbac/roles", async (req, res) => {
    try {
      if (!await ownerFromRequest(req)) return jsonError(res, 403, "Owner Supabase session required.");
      const name = typeof req.query.name === "string" ? req.query.name.trim() : "";
      if (!name) return jsonError(res, 400, "Role name is required.");
      const fallback = await supabaseAdminFetch(`/rest/v1/user_profiles?role=eq.${encodeURIComponent(name)}`, { method: "PATCH", body: JSON.stringify({ role: "Technician", active: true }) });
      const deleted = await supabaseAdminFetch(`/rest/v1/roles?name=eq.${encodeURIComponent(name)}`, { method: "DELETE" });
      if (!fallback || !deleted) return jsonError(res, 503, "Supabase server integration is not configured.");
      if (!fallback.ok || !deleted.ok) return jsonError(res, 502, "Supabase could not remove the custom role.");
      return res.json({ synced: true, message: "Custom role deleted and assigned users moved to Technician." });
    } catch (error) {
      console.error("[RBAC] Role delete failed:", error);
      return jsonError(res, 500, "Custom role deletion service unavailable.");
    }
  });

  app.post("/api/rbac/user-email", async (req, res) => {
    try {
      const owner = await ownerFromRequest(req);
      if (!owner) return jsonError(res, 403, "Owner Supabase session required.");
      const { userId, email } = req.body ?? {};
      if (typeof userId !== "string" || !userId || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return jsonError(res, 400, "A valid user id and email are required.");
      if (userId === owner.userId) return jsonError(res, 400, "The Owner email must be changed in primary account settings.");
      const response = await supabaseAdminFetch(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: "PUT", body: JSON.stringify({ email: email.trim().toLowerCase(), email_confirm: true }) });
      if (!response) return jsonError(res, 503, "Supabase server integration is not configured.");
      if (!response.ok) return jsonError(res, response.status, "Supabase could not update the authentication email.");
      return res.json({ synced: true, message: "Authentication email updated." });
    } catch (error) {
      console.error("[RBAC] Email update failed:", error);
      return jsonError(res, 500, "Authentication email update service unavailable.");
    }
  });

  app.post("/api/rbac/user-role", async (req, res) => {
    try {
      if (!await ownerFromRequest(req)) return jsonError(res, 403, "Owner Supabase session required.");
      const { userId, role } = req.body ?? {};
      if (typeof userId !== "string" || typeof role !== "string" || !userId || !role) return jsonError(res, 400, "User id and role are required.");
      const response = await supabaseAdminFetch(`/rest/v1/user_profiles?id=eq.${encodeURIComponent(userId)}`, { method: "PATCH", body: JSON.stringify({ role, active: true }) });
      if (!response) return jsonError(res, 503, "Supabase server integration is not configured.");
      if (!response.ok) return jsonError(res, response.status, "Supabase could not update the user role.");
      return res.json({ synced: true, message: "User role updated." });
    } catch (error) {
      console.error("[RBAC] Role assignment failed:", error);
      return jsonError(res, 500, "User role service unavailable.");
    }
  });

  app.delete("/api/rbac/user", async (req, res) => {
    try {
      const owner = await ownerFromRequest(req);
      if (!owner) return jsonError(res, 403, "Owner Supabase session required.");
      const userId = typeof req.query.userId === "string" ? req.query.userId : "";
      if (!userId || userId === owner.userId) return jsonError(res, 400, "A valid non-owner user id is required.");
      const authResponse = await supabaseAdminFetch(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
      const profileResponse = await supabaseAdminFetch(`/rest/v1/user_profiles?id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" });
      const permissionResponse = await supabaseAdminFetch(`/rest/v1/user_permissions?user_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" });
      if (!authResponse || !profileResponse || !permissionResponse) return jsonError(res, 503, "Supabase server integration is not configured.");
      if (!authResponse.ok) return jsonError(res, authResponse.status, "Supabase could not revoke the Auth user.");
      if (!profileResponse.ok || !permissionResponse.ok) return jsonError(res, 502, "Auth user removed, but profile cleanup needs review.");
      return res.json({ revoked: true, message: "User removed and access revoked." });
    } catch (error) {
      console.error("[RBAC] User removal failed:", error);
      return jsonError(res, 500, "User revocation service unavailable.");
    }
  });

  app.get("/api/rbac/users", async (req, res) => {
    try {
      if (!await ownerFromRequest(req)) return jsonError(res, 403, "Owner Supabase session required.");
      const authResponse = await supabaseAdminFetch("/auth/v1/admin/users?per_page=1000", { method: "GET" });
      const profileResponse = await supabaseAdminFetch("/rest/v1/user_profiles?select=id,display_name,role,active,created_at,updated_at", { method: "GET" });
      if (!authResponse || !profileResponse) return jsonError(res, 503, "Supabase server integration is not configured.");
      if (!authResponse.ok || !profileResponse.ok) return jsonError(res, 502, "Supabase could not load the account directory.");
      const authPayload = await authResponse.json() as { users?: Array<{ id?: string; email?: string; created_at?: string; invited_at?: string; user_metadata?: { display_name?: string; role?: string } }> };
      const profiles = await profileResponse.json() as Array<{ id?: string; display_name?: string; role?: string; active?: boolean; created_at?: string }>;
      const byId = new Map(profiles.filter((profile) => profile.id).map((profile) => [profile.id, profile]));
      return res.json((authPayload.users || []).filter((user) => user.id && user.email).map((user) => { const profile = byId.get(user.id); return { id: user.id, email: user.email, displayName: profile?.display_name || user.user_metadata?.display_name || user.email, role: profile?.role || user.user_metadata?.role || "Employee", active: profile?.active !== false, createdAt: profile?.created_at || user.created_at || new Date().toISOString().slice(0, 10), invitedAt: user.invited_at, authProvider: "supabase" }; }));
    } catch (error) {
      console.error("[RBAC] User directory failed:", error);
      return jsonError(res, 500, "Account directory service unavailable.");
    }
  });

  app.get("/api/rbac/roles", async (req, res) => {
    try {
      if (!await ownerFromRequest(req)) return jsonError(res, 403, "Owner Supabase session required.");
      const response = await supabaseAdminFetch("/rest/v1/roles?select=id,name,permissions,is_system,created_at&order=created_at.desc", { method: "GET" });
      if (!response) return jsonError(res, 503, "Supabase server integration is not configured.");
      if (!response.ok) return jsonError(res, response.status, "Supabase could not load custom roles.");
      return res.json(await response.json());
    } catch (error) {
      console.error("[RBAC] Role directory failed:", error);
      return jsonError(res, 500, "Role directory service unavailable.");
    }
  });
}
