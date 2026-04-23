import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { reclusterTeamDirections } from "@/lib/clustering/team-direction";

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

export async function GET(_req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const client = createAdminClient();

  const { data: clustering } = await client
    .from("hackathon_team_direction_clusterings")
    .select("id, k, sample_count, created_at, algorithm")
    .eq("is_latest", true)
    .maybeSingle();

  if (!clustering) {
    return NextResponse.json({ clustering: null, clusters: [], points: [] });
  }

  const [{ data: clusters }, { data: assignments }] = await Promise.all([
    client
      .from("hackathon_team_direction_clusters")
      .select("id, cluster_index, label, summary, member_count, color")
      .eq("clustering_id", clustering.id)
      .order("cluster_index", { ascending: true }),
    client
      .from("hackathon_team_direction_cluster_assignments")
      .select(`
        id,
        cluster_id,
        projection_2d,
        distance_to_centroid,
        hackathon_team_direction_embeddings!inner (
          id,
          source_text,
          team_id,
          hackathon_teams!inner (id, name)
        )
      `)
      .eq("clustering_id", clustering.id),
  ]);

  const points = (assignments ?? []).map((a: any) => {
    const emb = a.hackathon_team_direction_embeddings;
    const team = emb.hackathon_teams;
    const proj = parseVec(a.projection_2d);
    return {
      assignmentId: a.id,
      clusterId: a.cluster_id,
      embeddingId: emb.id,
      teamId: team.id,
      teamName: team.name,
      snippet: (emb.source_text ?? "").slice(0, 240),
      x: proj[0] ?? 0,
      y: proj[1] ?? 0,
      distance: a.distance_to_centroid ?? null,
    };
  });

  return NextResponse.json({ clustering, clusters: clusters ?? [], points });
}

export async function POST(_req: NextRequest) {
  const adminUser = await requireAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  try {
    const result = await reclusterTeamDirections({
      createdByUserId: adminUser.id,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/team-directions/clusters] recluster failed", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
