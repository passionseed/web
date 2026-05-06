import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// In local dev, fail fast if Docker/Supabase isn't running (3s).
// In production, use the default fetch (no artificial timeout).
const isLocal = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1') ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost');

const fetchWithLocalTimeout = (url: RequestInfo | URL, options?: RequestInit) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
};

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `Missing env.NEXT_PUBLIC_SUPABASE_URL${!supabaseUrl ? "" : " or NEXT_PUBLIC_SUPABASE_ANON_KEY"}`
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: isLocal ? fetchWithLocalTimeout : fetch },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

/**
 * Create a service role client for admin operations.
 * This bypasses RLS and should only be used in server-side admin functions.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      `Missing env${!url ? ".NEXT_PUBLIC_SUPABASE_URL" : ""}${!key ? ".SUPABASE_SERVICE_ROLE_KEY" : ""}`
    );
  }

  return createSupabaseClient(url, key);
}


