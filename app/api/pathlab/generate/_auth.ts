import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase,
      user: null,
      error: "Authentication required",
    };
  }

  return {
    supabase,
    user,
    error: null,
  };
}

export async function hasAdminOrInstructorRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "instructor"]);

  if (error) {
    return false;
  }

  return Boolean(data?.length);
}

export async function canManagePathLabSeed(
  supabase: SupabaseClient,
  user: User,
  seedId: string,
): Promise<boolean> {
  const [roleAllowed, seedOwnerResult] = await Promise.all([
    hasAdminOrInstructorRole(supabase, user.id),
    supabase
      .from("seeds")
      .select("id, created_by, seed_type")
      .eq("id", seedId)
      .maybeSingle(),
  ]);

  if (roleAllowed) return true;

  const seed = seedOwnerResult.data;
  if (!seed || seed.seed_type !== "pathlab") {
    return false;
  }

  return seed.created_by === user.id;
}
