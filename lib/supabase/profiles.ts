import { createClient } from "@/utils/supabase/client";

export type MinimalProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

/**
 * Fetch profiles by an array of user IDs and return a map keyed by ID.
 * Safe for RLS: single-table select without nested relation syntax.
 */
export const getProfilesByIds = async (
  ids: string[]
): Promise<Record<string, MinimalProfile>> => {
  const supabase = createClient();

  const uniqueIds = Array.from(new Set((ids || []).filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", uniqueIds);

  if (error) {
    console.error("[profiles] getProfilesByIds error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: (error as any)?.hint,
      idsCount: uniqueIds.length,
    });
    throw new Error(
      `Failed to load profiles: ${error.message} (code=${error.code})`
    );
  }

  const out: Record<string, MinimalProfile> = {};
  (data || []).forEach((p: any) => {
    out[p.id] = {
      id: p.id,
      username: p.username ?? null,
      full_name: p.full_name ?? null,
      avatar_url: p.avatar_url ?? null,
    };
  });
  return out;
};
