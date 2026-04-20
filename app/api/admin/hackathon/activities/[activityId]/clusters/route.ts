import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { reclusterActivity } from "@/lib/clustering/run";

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  return roles?.length ? user : null;
}

/**
 * GET returns the latest clustering snapshot + scatter data for the activity.
 * POST triggers a fresh clustering run.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ activityId: string }> }
) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { activityId } = await ctx.params;
  const client = createAdminClient();

  const [{ data: activity }, { data: clustering }] = await Promise.all([
    client
      .from("hackathon_phase_activities")
      .select("id, title, instructions, submission_scope")
      .eq("id", activityId)
      .maybeSingle(),
    client
      .from("activity_submission_clusterings")
      .select("id, k, sample_count, created_at, algorithm")
      .eq("activity_id", activityId)
      .eq("is_latest", true)
      .maybeSingle(),
  ]);

  if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

  if (!clustering) {
    return NextResponse.json({ activity, clustering: null, clusters: [], points: [] });
  }

  const [{ data: clusters }, { data: assignments }] = await Promise.all([
    client
      .from("activity_submission_clusters")
      .select("id, cluster_index, label, summary, member_count, color")
      .eq("clustering_id", clustering.id)
      .order("cluster_index", { ascending: true }),
    client
      .from("submission_cluster_assignments")
      .select(`
        id,
        cluster_id,
        projection_2d,
        distance_to_centroid,
        submission_embeddings!inner (
          id,
          scope,
          source_text,
          hackathon_individual_submission_id,
          hackathon_team_submission_id
        )
      `)
      .eq("clustering_id", clustering.id),
  ]);

  const points = (assignments ?? []).map((a: any) => {
    const emb = a.submission_embeddings;
    const proj = parseVec(a.projection_2d);
    return {
      assignmentId: a.id,
      clusterId: a.cluster_id,
      embeddingId: emb.id,
      scope: emb.scope,
      submissionId:
        emb.scope === "hackathon_team"
          ? emb.hackathon_team_submission_id
          : emb.hackathon_individual_submission_id,
      snippet: (emb.source_text ?? "").slice(0, 240),
      x: proj[0] ?? 0,
      y: proj[1] ?? 0,
      distance: a.distance_to_centroid ?? null,
    };
  });

  return NextResponse.json({
    activity,
    clustering,
    clusters: clusters ?? [],
    points,
  });
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ activityId: string }> }
) {
  const adminUser = await requireAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { activityId } = await ctx.params;

  try {
    const result = await reclusterActivity({
      activityId,
      createdByUserId: adminUser.id,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/clusters] recluster failed", { activityId, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseVec(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw === "string") {
    return raw
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((v) => Number(v));
  }
  return [];
}
