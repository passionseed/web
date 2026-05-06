import { createClient } from '@supabase/supabase-js'

// Admin client with service role key that bypasses RLS
export const createAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      `Missing env${!url ? ".NEXT_PUBLIC_SUPABASE_URL" : ""}${!key ? ".SUPABASE_SERVICE_ROLE_KEY" : ""}`
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};