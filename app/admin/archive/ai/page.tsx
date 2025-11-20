import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AIAgentManagement } from "@/components/admin/AIAgentManagement";

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
    .eq("role", "admin");

  if (roleError || !roles || roles.length === 0) {
    redirect("/me");
  }

  return user;
}

export default async function AIArchivePage() {
  const user = await checkAdminAccess();

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI Agent Archive</h1>
          <p className="text-muted-foreground">
            Manage AI agents and prompts used throughout the platform
          </p>
        </div>
        <AIAgentManagement user={user} />
      </div>
    </div>
  );
}