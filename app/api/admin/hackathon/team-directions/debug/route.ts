import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getNextPendingJob, claimJob, completeJob, failJob } from "@/lib/embeddings/jobs";
import { createTeamDirectionSnapshot, collectTeamText } from "@/lib/embeddings/team-direction";
import { getHackathonClient } from "@/lib/embeddings/hackathon-client";

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

  try {
    const client = createAdminClient();

    const [{ count: jobCount }, { count: snapshotCount }, { count: cacheCount }, { count: teamCount }] =
      await Promise.all([
        client.from("team_direction_embed_jobs").select("*", { count: "exact", head: true }),
        client.from("hackathon_team_direction_snapshots").select("*", { count: "exact", head: true }),
        client.from("team_direction_search_cache").select("*", { count: "exact", head: true }),
        client.from("hackathon_teams").select("*", { count: "exact", head: true }),
      ]);

    const { data: jobs } = await client
      .from("team_direction_embed_jobs")
      .select("id, team_id, status, trigger_source, attempts, error, scheduled_at, completed_at")
      .in("status", ["pending", "processing", "failed"])
      .order("scheduled_at", { ascending: false })
      .limit(20);

    const pendingJobs = (jobs ?? []).filter((j: any) => j.status === "pending");
    const processingJobs = (jobs ?? []).filter((j: any) => j.status === "processing");
    const failedJobs = (jobs ?? []).filter((j: any) => j.status === "failed");

    const { data: sampleTeam } = await client
      .from("hackathon_teams")
      .select("id, name")
      .limit(1)
      .single();

    let sampleTextInfo = null;
    if (sampleTeam) {
      const text = await collectTeamText(sampleTeam.id);
      sampleTextInfo = {
        teamId: sampleTeam.id,
        teamName: sampleTeam.name,
        textLength: text.length,
        hasContent: text.length > 0,
        preview: text.slice(0, 300),
      };
    }

    const { data: recentSnapshots } = await client
      .from("hackathon_team_direction_snapshots")
      .select("id, team_id, is_latest, snapshot_at")
      .eq("is_latest", true)
      .order("snapshot_at", { ascending: false })
      .limit(5);

    const teamIds = (recentSnapshots ?? []).map((s: any) => s.team_id);
    const { data: teams } = teamIds.length > 0
      ? await client.from("hackathon_teams").select("id, name").in("id", teamIds)
      : { data: [] };

    const teamMap = new Map((teams ?? []).map((t: any) => [t.id, t.name]));
    const enrichedSnapshots = (recentSnapshots ?? []).map((s: any) => ({
      id: s.id,
      teamId: s.team_id,
      teamName: teamMap.get(s.team_id) ?? "Unknown",
      snapshotAt: s.snapshot_at,
    }));

    return NextResponse.json({
      system: {
        health: failedJobs.length > 10 ? "degraded" : pendingJobs.length > 50 ? "backlogged" : "healthy",
        totalTeams: teamCount ?? 0,
        embeddedTeams: snapshotCount ?? 0,
        embedJobsTotal: jobCount ?? 0,
      },
      jobQueue: {
        pending: pendingJobs.length,
        processing: processingJobs.length,
        failed: failedJobs.length,
        recent: jobs ?? [],
      },
      sampleTeam: sampleTextInfo,
      recentSnapshots: enrichedSnapshots,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/hackathon/team-directions/debug
 *
 * Actually processes pending embed jobs — this is the "do something" endpoint.
 * Claims the oldest pending job, runs the full embedding pipeline,
 * and returns results.
 */
export async function POST() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  try {
    const client = createAdminClient();

    const job = await getNextPendingJob(client);
    if (!job) {
      return NextResponse.json({
        processed: 0,
        message: "No pending jobs in queue",
      });
    }

    const claimed = await claimJob(job.id, client);
    if (!claimed) {
      return NextResponse.json({
        processed: 0,
        message: "Job already being processed by another worker",
        jobId: job.id,
      });
    }

    let result: any;
    try {
      const snapshot = await createTeamDirectionSnapshot(job.team_id, { adminClient: client });
      await completeJob(job.id, client);

      const { data: team } = await getHackathonClient()
        .from("hackathon_teams")
        .select("name")
        .eq("id", job.team_id)
        .single();

      result = {
        success: true,
        jobId: job.id,
        teamId: job.team_id,
        teamName: team?.name ?? "Unknown",
        snapshotId: snapshot.id,
        profile: {
          mission: snapshot.profile.mission,
          techStack: snapshot.profile.techStack,
          targetMarket: snapshot.profile.targetMarket,
          stage: snapshot.profile.stage,
        },
        textLength: snapshot.source_text.length,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await failJob(job.id, message, client);
      result = {
        success: false,
        jobId: job.id,
        teamId: job.team_id,
        error: message,
      };
    }

    const { count: pendingAfter } = await client
      .from("team_direction_embed_jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    return NextResponse.json({
      processed: 1,
      queueAfter: pendingAfter ?? 0,
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
