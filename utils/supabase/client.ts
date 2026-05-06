import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === "undefined") {
      return new Proxy(
        {},
        {
          get(_target, prop) {
            throw new Error(
              `Missing env${!supabaseUrl ? ".NEXT_PUBLIC_SUPABASE_URL" : ""}${!supabaseAnonKey ? ".NEXT_PUBLIC_SUPABASE_ANON_KEY" : ""}. ` +
                `Supabase client accessed during SSR without env vars.`
            );
          },
        }
      ) as ReturnType<typeof createBrowserClient>;
    }
    throw new Error(
      `Missing env${!supabaseUrl ? ".NEXT_PUBLIC_SUPABASE_URL" : ""}${!supabaseAnonKey ? ".NEXT_PUBLIC_SUPABASE_ANON_KEY" : ""}`
    );
  }

  if (!client) {
    client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }

  return client;
}
