import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

/**
 * Admin gate for /admin pages and server actions: redirects to /login when
 * signed out and to /me when the user is not an admin.
 *
 * Call it in every admin page or loader that reads private data, not only in
 * the layout: an RSC request can skip the layout (docs/features/admin-console.md,
 * S1). Wrapped in React cache() so the layout and page checks in one request
 * cost one auth call and one role query.
 */
export const requireAdmin = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .limit(1);

  if (roleError || !roles?.length) {
    redirect("/me");
  }

  return user;
});
