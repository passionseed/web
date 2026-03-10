import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const isLocal = supabaseUrl?.includes("127.0.0.1") || supabaseUrl?.includes("localhost");

export function createClient() {
  return createBrowserClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        // When pointing at localhost (no Docker), disable background token
        // refresh so we don't spam the console with 503 errors.
        autoRefreshToken: !isLocal,
        persistSession: !isLocal,
      },
    }
  );
}
