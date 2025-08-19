import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with service role key for admin operations.
 * This client has elevated permissions and should only be used for admin functions.
 * WARNING: Never expose this client to the frontend - server-side only!
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing required environment variables for admin client");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}