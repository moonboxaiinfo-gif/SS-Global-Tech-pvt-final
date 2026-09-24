export const supabase: any;
export const supabaseAnonKey: string | undefined;
export const supabaseUrl: string | undefined;
export const supabaseRestUrl: string;
export function getSupabaseConfigStatus(): { urlPresent: boolean; anonKeyPresent: boolean; urlHost: string | null; usingViteNames: boolean };
export function logSupabaseConfigDiagnostics(context?: string): void;
export function supabaseRestFetch(path: string, init?: RequestInit): Promise<Response>;
declare const supabaseDefault: any;
export default supabaseDefault;
