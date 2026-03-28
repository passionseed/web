import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { TeamMatchingSimulator } from "@/components/admin/team-matching/TeamMatchingSimulator";

async function checkAdminAccess() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  if (!roles?.length) redirect("/me");
  return user;
}

export const dynamic = "force-dynamic";

export default async function TeamMatchingSimulatorPage() {
  await checkAdminAccess();

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Team Matching Simulator
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Simulate how students get grouped based on their teammate preferences.
          Mutual picks are guaranteed to be on the same team.
        </p>
      </div>
      <TeamMatchingSimulator />
    </div>
  );
}
