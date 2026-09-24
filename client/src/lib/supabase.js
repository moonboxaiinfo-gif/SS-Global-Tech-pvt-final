import { createClient } from "@supabase/supabase-js";

/**
 * Supabase browser integration. Only the publishable anon key belongs in the
 * Vite client; never place a service-role key in frontend code.
 */
const configuredUrl = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabaseUrl = configuredUrl?.trim().replace(/\/rest\/v1\/?$/, "");
export const supabaseRestUrl = `${supabaseUrl || "https://placeholder.supabase.co"}/rest/v1`;

export function getSupabaseConfigStatus() {
  let host = null;
  try {
    host = supabaseUrl ? new URL(supabaseUrl).host : null;
  } catch {
    host = null;
  }
  return {
    urlPresent: Boolean(supabaseUrl),
    anonKeyPresent: Boolean(supabaseAnonKey),
    urlHost: host,
    usingViteNames: Boolean(import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_ANON_KEY),
  };
}

export function logSupabaseConfigDiagnostics(context = "app") {
  const status = getSupabaseConfigStatus();
  if (import.meta.env.DEV || context === "login") {
    console.info(`[Supabase] ${context} configuration`, status);
  }
  if (!status.urlPresent || !status.anonKeyPresent) {
    console.warn("[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY; configure them in the Netlify environment and rebuild.");
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  logSupabaseConfigDiagnostics("startup");
}

const clientOptions = supabaseAnonKey ? {
  global: {
    headers: {
      apikey: supabaseAnonKey,
    },
  },
} : undefined;

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  clientOptions,
);

/** Use this helper only for direct REST calls outside supabase-js. */
export async function supabaseRestFetch(path, init = {}) {
  if (!supabaseAnonKey) throw new Error("Supabase anon key is missing. Check .env.local and restart Vite.");
  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseAnonKey);
  headers.set("Authorization", `Bearer ${supabaseAnonKey}`);
  headers.set("Content-Type", "application/json");
  return fetch(`${supabaseRestUrl}/${path.replace(/^\//, "")}`, { ...init, headers });
}

export default supabase;
