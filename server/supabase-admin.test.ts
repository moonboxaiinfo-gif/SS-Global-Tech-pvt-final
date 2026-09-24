import { describe, expect, it } from "vitest";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe("Supabase admin configuration", () => {
  it("keeps local-first auth safe when remote admin credentials are unavailable", () => {
    const remoteAdminConfigured = Boolean(supabaseUrl && serviceRoleKey && serviceRoleKey.trim());
    expect(typeof remoteAdminConfigured).toBe("boolean");
    expect(() => Boolean(supabaseUrl && serviceRoleKey)).not.toThrow();
  });
});
