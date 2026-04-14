import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { CEODashboard } from "@/components/admin/ceo/CEODashboard";

async function checkAdminAccess() {
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
    .in("role", ["admin", "team"]);

  if (roleError || !roles || roles.length === 0) {
    redirect("/me");
  }

  return user;
}

export const dynamic = "force-dynamic";

export default async function CEODashboardPage() {
  const user = await checkAdminAccess();

  return (
    <div className="min-h-screen bg-background">
      <CEODashboard userId={user.id} />
    </div>
  );
}
