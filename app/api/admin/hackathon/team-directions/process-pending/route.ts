import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getNextPendingJob, claimJob, completeJob, failJob } from "@/lib/embeddings/jobs";
import { createTeamDirectionSnapshot } from "@/lib/embeddings/team-direction";

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

export async function POST() {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const admin = createAdminClient();
  const results: { jobId: string; status: string; error?: string; snapshotId?: string }[] = [];
  const maxJobs = 10;

  for (let i = 0; i < maxJobs; i++) {
    const job = await getNextPendingJob(admin);
    if (!job) break;

    try {
      const claimed = await claimJob(job.id, admin);
      if (!claimed) continue;

      console.log("[process-pending] Processing job:", job.id, "team:", job.team_id);
      const snapshot = await createTeamDirectionSnapshot(job.team_id, { adminClient: admin });
      await completeJob(job.id, admin);

      results.push({ jobId: job.id, status: "completed", snapshotId: snapshot.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[process-pending] Job failed:", job.id, message);
      await failJob(job.id, message, admin).catch(() => undefined);
      results.push({ jobId: job.id, status: "failed", error: message });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
