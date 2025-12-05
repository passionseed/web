import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

async function checkAdminAccess() {
  const supabase = await createClient();
  
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

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await checkAdminAccess();

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and platform settings
          </p>
        </div>
        <AdminDashboard />
      </div>
    </div>
  );
}