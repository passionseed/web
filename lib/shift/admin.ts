import { createClient } from "@/utils/supabase/server";

/**
 * The signed-in admin, for SHIFT pages that anyone can read but only admins
 * edit. Null when signed out, not an admin, or auth is unreachable.
 */
export async function currentShiftAdmin() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1);
    return roles?.length ? { supabase, user } : null;
  } catch {
    return null;
  }
}
