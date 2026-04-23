import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { formatVectorLiteral } from "@/lib/embeddings/bge";
import { runKMeans, suggestClusterCount, cosineDistance } from "./kmeans";
import { project2D } from "./umap";
import { clusterColor } from "./colors";

type EmbeddingRow = {
  id: string;
  embedding: number[] | string;
  source_text: string;
};

export type ReclusterTeamDirectionsResult = {
  clusteringId: string;
  k: number;
  sampleCount: number;
};

function parseEmbedding(raw: number[] | string): number[] {
  if (Array.isArray(raw)) return raw;
  const trimmed = raw.trim().replace(/^\[|\]$/g, "");
  return trimmed.split(",").map((v) => Number(v));
}

export async function reclusterTeamDirections(opts: {
  createdByUserId?: string | null;
  k?: number;
  adminClient?: SupabaseClient;
}): Promise<ReclusterTeamDirectionsResult> {
  const admin = opts.adminClient ?? createAdminClient();

  const { data: rows, error } = await admin
    .from("hackathon_team_direction_embeddings")
    .select("id, embedding, source_text");

  if (error) throw error;
  const embeddings = (rows ?? []) as EmbeddingRow[];
  const sampleCount = embeddings.length;

  if (sampleCount === 0) {
    throw new Error("No team direction embeddings found");
  }

  const vectors = embeddings.map((e) => parseEmbedding(e.embedding));
  const k = opts.k ?? suggestClusterCount(sampleCount);
  const { centroids, assignments } = runKMeans(vectors, k);
  const projections = project2D(vectors);
  const centroidProjections = centroids.length > 0 ? project2D(centroids) : [];

  const { error: flipError } = await admin
    .from("hackathon_team_direction_clusterings")
    .update({ is_latest: false })
    .eq("is_latest", true);
  if (flipError) throw flipError;

  const { data: clusteringRow, error: clusteringError } = await admin
    .from("hackathon_team_direction_clusterings")
    .insert({
      algorithm: "kmeans",
      k,
      sample_count: sampleCount,
      created_by_user_id: opts.createdByUserId ?? null,
      is_latest: true,
    })
    .select("id")
    .single();
  if (clusteringError) throw clusteringError;
  const clusteringId = clusteringRow.id as string;

  const memberCounts = new Array(k).fill(0);
  assignments.forEach((c) => {
    memberCounts[c] += 1;
  });

  const clusterRows = centroids.map((centroid, idx) => ({
    clustering_id: clusteringId,
    cluster_index: idx,
    member_count: memberCounts[idx] ?? 0,
    centroid: formatVectorLiteral(centroid),
    centroid_2d: centroidProjections[idx]
      ? formatVectorLiteral(centroidProjections[idx])
      : null,
    color: clusterColor(idx),
  }));

  const { data: insertedClusters, error: clusterError } = await admin
    .from("hackathon_team_direction_clusters")
    .insert(clusterRows)
    .select("id, cluster_index");
  if (clusterError) throw clusterError;

  const clusterIdByIndex = new Map<number, string>();
  for (const c of insertedClusters ?? []) {
    clusterIdByIndex.set(c.cluster_index as number, c.id as string);
  }

  const assignmentRows = embeddings.map((emb, idx) => {
    const clusterIndex = assignments[idx];
    const centroid = centroids[clusterIndex];
    const distance = cosineDistance(vectors[idx], centroid);
    return {
      clustering_id: clusteringId,
      embedding_id: emb.id,
      cluster_id: clusterIdByIndex.get(clusterIndex)!,
      projection_2d: formatVectorLiteral(projections[idx]),
      distance_to_centroid: distance,
    };
  });

  const CHUNK = 500;
  for (let i = 0; i < assignmentRows.length; i += CHUNK) {
    const slice = assignmentRows.slice(i, i + CHUNK);
    const { error: assignError } = await admin
      .from("hackathon_team_direction_cluster_assignments")
      .insert(slice);
    if (assignError) throw assignError;
  }

  return { clusteringId, k, sampleCount };
}
