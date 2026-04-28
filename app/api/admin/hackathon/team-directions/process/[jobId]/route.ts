import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { claimJob, completeJob, failJob } from "@/lib/embeddings/jobs";
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

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { jobId } = await params;
  const admin = createAdminClient();

  try {
    const claimed = await claimJob(jobId, admin);
    if (!claimed) {
      return NextResponse.json(
        { error: "Job not found or already processed" },
        { status: 409 }
      );
    }

    const { data: job } = await admin
      .from("team_direction_embed_jobs")
      .select("team_id")
      .eq("id", jobId)
      .single();

    if (!job) {
      await failJob(jobId, "Job record disappeared after claim", admin);
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    console.log("[process-job] Creating snapshot for team:", job.team_id);
    const snapshot = await createTeamDirectionSnapshot(job.team_id as string, {
      adminClient: admin,
    });

    await completeJob(jobId, admin);

    return NextResponse.json({
      success: true,
      jobId,
      snapshotId: snapshot.id,
      teamId: snapshot.team_id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[process-job] Error:", message);
    try {
      await failJob(jobId, message, admin);
    } catch (failErr) {
      console.error("[process-job] Failed to mark job as failed:", failErr);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
