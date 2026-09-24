import supabase, { supabaseAnonKey, supabaseUrl } from "@/lib/supabase";
import { getAuthSession, type AppRole } from "@/lib/auth";
import { loadLocalValue, saveLocalValue } from "@/lib/localStore";

export type BuiltInRole = "Owner" | "Manager" | "Accountant" | "Technician";
export type PermissionAction = "view" | "create" | "edit" | "delete";
export type PermissionTarget = "role" | "user";
export type PermissionMatrix = Record<string, Record<PermissionAction, boolean>>;
export type CustomRole = { id: string; name: string; permissions: PermissionMatrix; createdAt: string; isSystem?: boolean };

export const permissionModules = ["Dashboard", "Invoices", "Quotations", "HR / Payroll", "Reports", "Finance", "Projects", "Inventory", "CRM", "Settings"] as const;
export type PermissionModule = (typeof permissionModules)[number];

const PERMISSIONS_KEY = "ss-global-rbac-permissions";
const ROLES_KEY = "ss-global-rbac-roles";
const defaultActions = (view = false, create = false, edit = false, del = false): Record<PermissionAction, boolean> => ({ view, create, edit, delete: del });
const matrix = (allowed: PermissionModule[], editable = allowed, deletable: PermissionModule[] = [], creatable = editable) => Object.fromEntries(permissionModules.map((module) => [module, defaultActions(allowed.includes(module), creatable.includes(module), editable.includes(module), deletable.includes(module))])) as PermissionMatrix;

export const defaultRolePermissions: Record<BuiltInRole, PermissionMatrix> = {
  Owner: matrix([...permissionModules], [...permissionModules], [...permissionModules], [...permissionModules]),
  Manager: matrix(["Dashboard", "Invoices", "Quotations", "HR / Payroll", "Reports", "Finance", "Projects", "Inventory", "CRM"], ["Invoices", "Quotations", "HR / Payroll", "Projects", "Inventory", "CRM"], [], ["Invoices", "Quotations", "Projects", "Inventory", "CRM"]),
  Accountant: matrix(["Dashboard", "Invoices", "Quotations", "HR / Payroll", "Reports", "Finance"], ["Invoices", "HR / Payroll", "Finance"], ["Invoices"], ["Invoices", "Finance"]),
  Technician: matrix(["Dashboard", "Projects", "CRM"], ["Projects", "CRM"], [], ["Projects", "CRM"]),
};

function cloneMatrix(source: PermissionMatrix | undefined): PermissionMatrix {
  return Object.fromEntries(permissionModules.map((module) => [module, { ...defaultActions(), ...(source?.[module] ?? {}) }])) as PermissionMatrix;
}

function readStore<T>(key: string, fallback: T): T {
  const value = loadLocalValue<unknown>(key, fallback);
  return value as T;
}

function readPermissionStore(): Record<string, PermissionMatrix> {
  const value = readStore<unknown>(PERMISSIONS_KEY, {});
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, PermissionMatrix> : {};
}

export function getCustomRoles(): CustomRole[] {
  const value = readStore<unknown>(ROLES_KEY, []);
  if (!Array.isArray(value)) return [];
  return value.filter((role): role is CustomRole => Boolean(role && typeof role.id === "string" && typeof role.name === "string" && role.permissions && typeof role.permissions === "object")).map((role) => ({ ...role, permissions: cloneMatrix(role.permissions), createdAt: role.createdAt || new Date().toISOString() }));
}

export function getRoleNames(): string[] {
  return ["Owner", "Manager", "Accountant", "Technician", ...getCustomRoles().map((role) => role.name)];
}

export function getPermissionMatrix(targetId: string, targetRole: string): PermissionMatrix {
  const stored = readPermissionStore();
  const custom = getCustomRoles().find((role) => role.name === targetRole || `role:${role.id}` === targetId);
  return cloneMatrix(stored[`${targetRole}:${targetId}`] ?? stored[targetId] ?? stored[`role:${targetRole}`] ?? custom?.permissions ?? defaultRolePermissions[targetRole as BuiltInRole] ?? defaultRolePermissions.Technician);
}

export function savePermissionMatrix(targetId: string, targetRole: string, next: PermissionMatrix) {
  const normalized = cloneMatrix(next);
  const custom = getCustomRoles().find((role) => role.name === targetRole || `role:${role.id}` === targetId);
  if (custom && targetId.startsWith("role:")) {
    const roles = getCustomRoles().map((role) => role.id === custom.id ? { ...role, permissions: normalized } : role);
    saveLocalValue(ROLES_KEY, roles);
  } else {
    const stored = readPermissionStore();
    const key = targetId.startsWith("role:") ? targetId : `${targetRole}:${targetId}`;
    stored[key] = normalized;
    saveLocalValue(PERMISSIONS_KEY, stored);
  }
  window.dispatchEvent(new CustomEvent("ss-global-rbac-permissions"));
}

export function createCustomRole(name: string, permissions: PermissionMatrix): CustomRole {
  const normalizedName = name.trim().replace(/\s+/g, " ");
  if (!normalizedName) throw new Error("Role name is required.");
  if (getRoleNames().some((role) => role.toLowerCase() === normalizedName.toLowerCase())) throw new Error("A role with this name already exists.");
  const role: CustomRole = { id: `role-${Date.now()}`, name: normalizedName, permissions: cloneMatrix(permissions), createdAt: new Date().toISOString() };
  saveLocalValue(ROLES_KEY, [role, ...getCustomRoles()]);
  window.dispatchEvent(new CustomEvent("ss-global-rbac-roles"));
  return role;
}

export function deleteCustomRole(roleId: string): CustomRole | null {
  const roles = getCustomRoles();
  const removed = roles.find((role) => role.id === roleId) ?? null;
  if (!removed) return null;
  saveLocalValue(ROLES_KEY, roles.filter((role) => role.id !== roleId));
  window.dispatchEvent(new CustomEvent("ss-global-rbac-roles"));
  return removed;
}

export function fallbackRoleForDeletedRole(): BuiltInRole {
  return "Technician";
}

export function canAccess(module: PermissionModule, action: PermissionAction = "view", user = getAuthSession()) {
  if (!user) return false;
  if (user.role === "Owner") return true;
  if (module === "Invoices" && !["Accountant", "Manager"].includes(user.role)) return false;
  return Boolean(getPermissionMatrix(user.userId, user.role)[module]?.[action]);
}

export const routePermission: Array<{ prefix: string; module: PermissionModule }> = [
  { prefix: "/sales", module: "Invoices" }, { prefix: "/warranties", module: "Invoices" }, { prefix: "/quotations", module: "Quotations" },
  { prefix: "/employees", module: "HR / Payroll" }, { prefix: "/payroll", module: "HR / Payroll" }, { prefix: "/reports", module: "Reports" },
  { prefix: "/finance", module: "Finance" }, { prefix: "/projects", module: "Projects" }, { prefix: "/inventory", module: "Inventory" },
  { prefix: "/crm", module: "CRM" }, { prefix: "/settings", module: "Settings" },
];

export function permissionForPath(path: string) {
  return routePermission.find((entry) => path.startsWith(entry.prefix))?.module ?? "Dashboard";
}

async function remoteAdminRequest(path: string, method: "POST" | "DELETE", body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { synced: false, reason: "A verified Supabase session is required for remote RBAC sync." };
  const response = await fetch(path, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json().catch(() => ({}));
  return response.ok ? { synced: true, reason: payload.message || "Synced." } : { synced: false, reason: payload.message || "Remote RBAC service is unavailable." };
}

export async function syncPermissionToSupabase(targetId: string, targetRole: string, module: string, actions: Record<PermissionAction, boolean>) {
  if (!supabaseUrl || !supabaseAnonKey || !targetId || targetId.startsWith("user-")) return { synced: false, reason: "Supabase Auth user UUID is required for remote permission sync." };
  const { error } = await supabase.from("user_permissions").upsert({ user_id: targetId, role: targetRole, module, can_view: actions.view, can_create: actions.create, can_edit: actions.edit, can_delete: actions.delete }, { onConflict: "user_id,module" });
  return error ? { synced: false, reason: error.message } : { synced: true, reason: "Synced." };
}

export async function syncRolePermissionMatrixToSupabase(role: string, permissions: PermissionMatrix) {
  if (!supabaseUrl || !supabaseAnonKey) return { synced: false, reason: "Supabase is not configured; permissions remain local." };
  const { error } = await supabase.from("roles").upsert({ id: `system-${role.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name: role, permissions: cloneMatrix(permissions), is_system: true }, { onConflict: "name" });
  return error ? { synced: false, reason: error.message } : { synced: true, reason: "Synced." };
}

export async function syncCustomRoleToSupabase(role: CustomRole) {
  return remoteAdminRequest("/api/rbac/roles", "POST", { id: role.id, name: role.name, permissions: role.permissions });
}

export async function hydrateCustomRolesFromSupabase() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return getCustomRoles();
  try {
    const response = await fetch("/api/rbac/roles", { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!response.ok) return getCustomRoles();
    const payload = await response.json() as Array<{ id?: string; name?: string; permissions?: PermissionMatrix; created_at?: string; is_system?: boolean }>;
    const remote = payload.filter((role) => role.id && role.name).map((role) => ({ id: role.id!, name: role.name!, permissions: cloneMatrix(role.permissions), createdAt: role.created_at || new Date().toISOString(), isSystem: role.is_system }));
    const remoteNames = new Set(remote.map((role) => role.name.toLowerCase()));
    const localPending = getCustomRoles().filter((role) => !remoteNames.has(role.name.toLowerCase()));
    saveLocalValue(ROLES_KEY, [...remote, ...localPending]);
    window.dispatchEvent(new CustomEvent("ss-global-rbac-roles"));
    return getCustomRoles();
  } catch { return getCustomRoles(); }
}

export async function deleteCustomRoleFromSupabase(roleName: string) {
  return remoteAdminRequest(`/api/rbac/roles?name=${encodeURIComponent(roleName)}`, "DELETE");
}

export const permissionLabel = (module: string) => module === "HR / Payroll" ? "HR / Payroll" : module;
