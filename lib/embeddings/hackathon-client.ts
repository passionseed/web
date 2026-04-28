import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

let hackathonClient: SupabaseClient | null = null;

export function getHackathonClient(): SupabaseClient {
  if (hackathonClient) return hackathonClient;

  const url = process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing HACKATHON_SUPABASE_URL or HACKATHON_SUPABASE_SERVICE_ROLE_KEY");
  }

  hackathonClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return hackathonClient;
}
