import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

async function requireAdminUser() {
  const { createClient } = await import("@/utils/supabase/server");
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  return roles?.length ? user : null;
}

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const client = createAdminClient();

  const { data: jobStats } = await client
    .from("team_direction_embed_jobs")
    .select("status", { count: "exact" });

  const { data: snapshotStats } = await client
    .from("hackathon_team_direction_snapshots")
    .select("is_latest", { count: "exact" })
    .eq("is_latest", true);

  const { data: teamCount } = await client
    .from("hackathon_teams")
    .select("id", { count: "exact" });

  const pendingJobs = jobStats?.filter((j: any) => j.status === "pending").length ?? 0;
  const failedJobs = jobStats?.filter((j: any) => j.status === "failed").length ?? 0;
  const totalTeams = teamCount?.length ?? 0;
  const embeddedTeams = snapshotStats?.length ?? 0;

  return NextResponse.json({
    queue: {
      pending: pendingJobs,
      failed: failedJobs,
      total: jobStats?.length ?? 0,
    },
    coverage: {
      teams: totalTeams,
      embedded: embeddedTeams,
      percentage: totalTeams > 0 ? Math.round((embeddedTeams / totalTeams) * 100) : 0,
    },
    health: failedJobs > 10 ? "degraded" : pendingJobs > 50 ? "backlogged" : "healthy",
  });
}
