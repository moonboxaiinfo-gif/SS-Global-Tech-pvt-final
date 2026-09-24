import { describe, expect, it } from "vitest";
import { canAccess, permissionForPath, getPermissionMatrix } from "@/lib/rbac";
import { getAssignableRoles, mapSupabaseProfilesToAuthUsers } from "@/lib/auth";

describe("RBAC", () => {
  it("gives Owner full access", () => {
    const owner = { userId: "owner", email: "owner@admin.com", displayName: "Owner", role: "Owner" as const, signedInAt: new Date().toISOString() };
    expect(canAccess("Settings", "delete", owner)).toBe(true);
  });

  it("keeps Employee access limited to assigned operational modules", () => {
    const employee = { userId: "employee", email: "employee@example.com", displayName: "Employee", role: "Employee" as const, signedInAt: new Date().toISOString() };
    expect(canAccess("Projects", "view", employee)).toBe(true);
    expect(canAccess("Finance", "view", employee)).toBe(false);
  });

  it("maps protected routes to permission modules", () => {
    expect(permissionForPath("/settings/roles")).toBe("Settings");
    expect(permissionForPath("/payroll/settlement")).toBe("HR / Payroll");
    expect(permissionForPath("/")).toBe("Dashboard");
  });

  it("maps Supabase profiles to live managed users with normalized roles", () => {
    const users = mapSupabaseProfilesToAuthUsers([
      { id: "uuid-manager", email: "manager@example.com", full_name: "Manager One", role: "Manager", is_active: true },
      { id: "uuid-legacy", email: "legacy@example.com", role: "Employee", is_active: false },
    ]);
    expect(users).toHaveLength(2);
    expect(users[0]).toMatchObject({ id: "uuid-manager", displayName: "Manager One", role: "Manager", active: true, authProvider: "supabase" });
    expect(users[1]).toMatchObject({ id: "uuid-legacy", displayName: "legacy@example.com", role: "Technician", active: false });
    expect(getAssignableRoles()).toEqual(["Owner", "Manager", "Accountant", "Technician"]);
  });

  it("loads role permissions independently for each selected role", () => {
    expect(getPermissionMatrix("role:Owner", "Owner").Settings.view).toBe(true);
    expect(getPermissionMatrix("role:Technician", "Technician").Invoices.view).toBe(false);
  });
});
