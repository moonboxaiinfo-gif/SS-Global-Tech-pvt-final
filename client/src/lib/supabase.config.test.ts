import { describe, expect, it } from "vitest";
import { getSupabaseConfigStatus } from "./supabase.js";

describe("Supabase configuration diagnostics", () => {
  it("returns safe presence metadata without exposing the anon key", () => {
    const status = getSupabaseConfigStatus();
    expect(status).toHaveProperty("urlPresent");
    expect(status).toHaveProperty("anonKeyPresent");
    expect(status).toHaveProperty("urlHost");
    expect(status).not.toHaveProperty("anonKey");
    expect(JSON.stringify(status)).not.toContain("placeholder-anon-key");
  });
});
