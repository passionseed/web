import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { reclusterTeamDirections } from "@/lib/clustering/team-direction";
import { autoLabelAllClusters } from "@/lib/clustering/auto-label";

function parseVec(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw === "string") {
    return raw.replace(/^\[|\]$/g, "").split(",").map(Number);
  }
  return [];
}

export async function GET(_req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
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
          id, cluster_id, projection_2d, distance_to_centroid,
          embedding_id,
          hackathon_team_direction_embeddings!inner(id, team_id)
        `)
        .eq("clustering_id", clustering.id),
    ]);

    // Batch-fetch team names + snippets separately (avoids pulling full source_text through join)
    const embeddingIds = (assignments ?? []).map((a: Record<string, unknown>) => {
      const emb = a.hackathon_team_direction_embeddings as { id: string; team_id: string };
      return emb.team_id;
    });
    const uniqueTeamIds = [...new Set(embeddingIds)];

    // Parallel: team names from teams table, snippets from search cache
    const [{ data: teamNames }, { data: snippets }] = await Promise.all([
      client.from("hackathon_teams").select("id, name").in("id", uniqueTeamIds),
      client.from("team_direction_search_cache").select("team_id, mission").in("team_id", uniqueTeamIds),
    ]);

    const nameMap = new Map((teamNames ?? []).map((t: { id: string; name: string }) => [t.id, t.name]));
    const snippetMap = new Map((snippets ?? []).map((s: { team_id: string; mission: string }) => [s.team_id, s.mission]));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const points = (assignments ?? []).map((a: any) => {
      const emb = a.hackathon_team_direction_embeddings as { id: string; team_id: string };
      const proj = parseVec(a.projection_2d);
      return {
        assignmentId: a.id,
        clusterId: a.cluster_id,
        embeddingId: emb.id,
        teamId: emb.team_id,
        teamName: nameMap.get(emb.team_id) ?? "Unknown",
        snippet: (snippetMap.get(emb.team_id) ?? "").slice(0, 240),
        x: proj[0] ?? 0,
        y: proj[1] ?? 0,
        distance: a.distance_to_centroid ?? null,
      };
    });

    return NextResponse.json({ clustering, clusters: clusters ?? [], points });
  } catch (err) {
    return safeServerError("Failed to fetch clusters", err);
  }
}

export async function POST(_req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const result = await reclusterTeamDirections({
      createdByUserId: admin.value.userId,
    });

    autoLabelAllClusters(result.clusteringId).catch((err) => {
      console.error("Auto-labeling failed:", err);
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return safeServerError("Recluster failed", err);
  }
}
