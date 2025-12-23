import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { NewNorthStarFlow } from "@/components/journey/NewNorthStarFlow";

async function checkAccess() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Check roles: admin OR beta-tester
  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["admin", "beta-tester"]);

  if (roleError || !roles || roles.length === 0) {
    // In dev mode, we might want to bypass or mock, but strictly requested:
    // "also make it only beta-tester/admin role can access this"

    // Optional: Render a "Not Authorized" component instead of redirecting if you want to be nicer
    // But for now, redirect specific for invalid access
    return false;
  }

  return true;
}

export default async function NewNorthStarPage() {
  const hasAccess = await checkAccess();

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center space-y-4">
        <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
        <p className="text-muted-foreground">
          This feature is currently available only for Beta Testers and Admins.
        </p>
        <a href="/me" className="text-blue-500 hover:underline">
          Return to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <NewNorthStarFlow />
    </div>
  );
}
