import { redirect } from "next/navigation";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * Who may read SHIFT project canvases and ask Claude about them
 * (/shift/canvases and /admin/shift/canvases): site admins, and SHIFT staff and
 * mentors (any shift_round_roles grant, made in Admin > SHIFT > Rounds >
 * Settings). Removing the grant there removes the access.
 */
export async function canViewShiftCanvases(userId: string): Promise<boolean> {
  const db = createAdminClient();
  const [admin, shiftRole] = await Promise.all([
    db.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").limit(1),
    db.from("shift_round_roles").select("id").eq("user_id", userId).limit(1),
  ]);
  if (admin.error) throw admin.error;
  if (shiftRole.error) throw shiftRole.error;
  return Boolean(admin.data?.length || shiftRole.data?.length);
}

/**
 * For the staff canvas pages: sends signed-out visitors to sign in (and back
 * to `path`), then says whether this person may read the canvases.
 */
export async function canvasPageAccess(path: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  return canViewShiftCanvases(user.id);
}
