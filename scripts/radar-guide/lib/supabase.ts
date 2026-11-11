/**
 * Supabase clients for the radar-guide commands. Built here rather than from
 * utils/supabase (cookie-based, Next-only) or lib/radar/preview (server-only).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireEnv } from "./cli";

const AUTH = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** Anon key: reads exactly what visitors can read (published fields, RLS on). */
export function anonClient(): SupabaseClient {
  const env = requireEnv(
    ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const,
    "reading published Radar content with the anon key"
  );
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, AUTH);
}

/** Service role: writes chapter rows. Only the push, pull and clip commands use it. */
export function serviceClient(why: string): SupabaseClient {
  const env = requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const, why);
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, AUTH);
}
