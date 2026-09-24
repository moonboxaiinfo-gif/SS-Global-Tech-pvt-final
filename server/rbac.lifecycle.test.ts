import { beforeEach, describe, expect, it } from "vitest";
import { canAccess, createCustomRole, deleteCustomRole, fallbackRoleForDeletedRole, getCustomRoles, getPermissionMatrix, getRoleNames, permissionModules, savePermissionMatrix } from "../client/src/lib/rbac";
import { changePassword, getAssignableRoles, getAuthUsers, normalizeAppRole, registerUser, updateAuthUserEmail, updateOwnProfile } from "../client/src/lib/auth";

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
    dispatchEvent: () => true,
  },
});

describe("custom RBAC lifecycle", () => {
  beforeEach(() => storage.clear());

  it("creates a custom role with View/Create/Edit/Delete permissions", () => {
    const permissions = getPermissionMatrix("role:Employee", "Employee");
    const role = createCustomRole("Site Supervisor", permissions);
    expect(role.name).toBe("Site Supervisor");
    expect(getRoleNames()).toContain("Site Supervisor");
    expect(Object.keys(role.permissions)).toHaveLength(permissionModules.length);
    expect(role.permissions.Projects).toMatchObject({ view: true, create: true, edit: true, delete: false });
  });

  it("deletes only custom roles and exposes Technician as the safe fallback", () => {
    const role = createCustomRole("Temporary Access", getPermissionMatrix("role:Employee", "Employee"));
    expect(getCustomRoles()).toHaveLength(1);
    expect(deleteCustomRole(role.id)?.name).toBe("Temporary Access");
    expect(getCustomRoles()).toHaveLength(0);
    expect(fallbackRoleForDeletedRole()).toBe("Technician");
  });

  it("updates the signed-in user display name without changing role or email", () => {
    window.localStorage.setItem("ss-global-auth-session", JSON.stringify({ userId: "user-owner", email: "owner@admin.com", displayName: "SS Global Owner", role: "Owner", signedInAt: new Date().toISOString() }));
    const updated = updateOwnProfile("SS Global Finance Owner");
    expect(updated.displayName).toBe("SS Global Finance Owner");
    expect(getAuthUsers().find((user) => user.id === "user-owner")?.displayName).toBe("SS Global Finance Owner");
  });

  it("exposes exactly four assignable roles and normalizes legacy role labels", () => {
    expect(getAssignableRoles()).toEqual(["Owner", "Manager", "Accountant", "Technician"]);
    expect(normalizeAppRole("Admin")).toBe("Owner");
    expect(normalizeAppRole("Developer")).toBe("Owner");
    expect(normalizeAppRole("Employee")).toBe("Technician");
  });

  it("verifies current credentials and requires matching new passwords for in-app password changes", async () => {
    window.localStorage.setItem("ss-global-auth-session", JSON.stringify({ userId: "user-owner", email: "owner@admin.com", displayName: "SS Global Owner", role: "Owner", signedInAt: new Date().toISOString() }));
    await expect(changePassword("owner@admin.com", "wrong-password", "new-password-123", "new-password-123")).rejects.toThrow("Current password is incorrect.");
    await expect(changePassword("owner@admin.com", "12345678", "new-password-123", "different-password")).rejects.toThrow("New passwords do not match.");
  });

  it("updates a managed user's email locally and rejects invalid or duplicate addresses", async () => {
    window.localStorage.setItem("ss-global-auth-session", JSON.stringify({ userId: "user-owner", email: "owner@admin.com", displayName: "SS Global Owner", role: "Owner", signedInAt: new Date().toISOString() }));
    const created = await registerUser({ displayName: "Finance User", email: "finance@example.com", role: "Accountant" });
    const updated = await updateAuthUserEmail(created.id, "finance.updated@example.com");
    expect(updated.email).toBe("finance.updated@example.com");
    expect(updated.synced).toBe(false);
    expect(getAuthUsers().find((user) => user.id === created.id)?.email).toBe("finance.updated@example.com");
    await expect(updateAuthUserEmail(created.id, "not-an-email")).rejects.toThrow("valid email");
    await expect(updateAuthUserEmail(created.id, "owner@admin.com")).rejects.toThrow("already exists");
  });

  it("restricts Invoice access to Owner, Manager, and Accountant roles", () => {
    window.localStorage.setItem("ss-global-auth-session", JSON.stringify({ userId: "technician-1", email: "tech@example.com", displayName: "Technician", role: "Technician", signedInAt: new Date().toISOString() }));
    expect(canAccess("Invoices", "view")).toBe(false);
    window.localStorage.setItem("ss-global-auth-session", JSON.stringify({ userId: "accountant-1", email: "accountant@example.com", displayName: "Accountant", role: "Accountant", signedInAt: new Date().toISOString() }));
    expect(canAccess("Invoices", "view")).toBe(true);
    expect(canAccess("Invoices", "create")).toBe(true);
    window.localStorage.setItem("ss-global-auth-session", JSON.stringify({ userId: "manager-1", email: "manager@example.com", displayName: "Manager", role: "Manager", signedInAt: new Date().toISOString() }));
    expect(canAccess("Invoices", "view")).toBe(true);
    expect(canAccess("Invoices", "edit")).toBe(true);
  });

  it("resolves updated custom-role permissions immediately for direct access checks", () => {
    const role = createCustomRole("Project Reviewer", getPermissionMatrix("role:Employee", "Employee"));
    const next = getPermissionMatrix(`role:${role.id}`, role.name);
    next.Projects = { view: true, create: false, edit: false, delete: false };
    next.Finance = { view: false, create: false, edit: false, delete: false };
    savePermissionMatrix(`role:${role.id}`, role.name, next);
    window.localStorage.setItem("ss-global-auth-session", JSON.stringify({ userId: "managed-user-1", email: "reviewer@example.com", displayName: "Reviewer", role: role.name, signedInAt: new Date().toISOString() }));
    expect(canAccess("Projects", "view")).toBe(true);
    expect(canAccess("Projects", "edit")).toBe(false);
    expect(canAccess("Finance", "view")).toBe(false);
  });
});
