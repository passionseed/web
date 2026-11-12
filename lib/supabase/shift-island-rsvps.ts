import { createAdminClient } from "@/utils/supabase/admin";

/**
 * SHIFT High Island RSVPs. Admin-only table (minors), so everything goes
 * through the service role, after the caller's own access checks.
 */

const RSVP_COLUMNS = "user_id, season, created_at";

export interface IslandRsvp {
  user_id: string;
  season: string;
  created_at: string;
}

export async function getIslandRsvp(userId: string): Promise<IslandRsvp | null> {
  const { data, error } = await createAdminClient()
    .from("shift_island_rsvps")
    .select(RSVP_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as IslandRsvp | null) ?? null;
}

export async function addIslandRsvp(userId: string, season: string): Promise<IslandRsvp> {
  const { data, error } = await createAdminClient()
    .from("shift_island_rsvps")
    .upsert({ user_id: userId, season }, { onConflict: "user_id", ignoreDuplicates: true })
    .select(RSVP_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  // A double tap lost the race: the first insert won, read it back.
  return (data as IslandRsvp | null) ?? (await getIslandRsvp(userId))!;
}
