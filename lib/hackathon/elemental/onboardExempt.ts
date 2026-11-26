import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Whether the signed-in user's account came from a live hackathon sign-up.
 * Those accounts skip the PassionSeed onboard: the sign-up form already took
 * their name, school and parent consent. Any failure reads as "no", which
 * keeps the normal onboard gate.
 */
export async function hasHackathonRegistration(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_hackathon_registration");
  return !error && data === true;
}
