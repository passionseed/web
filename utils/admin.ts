import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

export async function checkAdminAccess(supabaseClient?: SupabaseClient<any, "public", any>) {
  const supabase = supabaseClient || await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Check if user has admin role
  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  if (roleError || !roles || roles.length === 0) {
    redirect("/me");
  }

  return user;
}
