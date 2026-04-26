import { createAdminClient } from "@/utils/supabase/admin";
import { runKMeans } from "./kmeans";
import { project2D } from "./umap";
import { clusterColor } from "./colors";
import type { SupabaseClient } from "@supabase/supabase-js";

function parseEmbedding(raw: number[] | string): number[] {
  if (Array.isArray(raw)) return raw;
  const trimmed = raw.trim().replace(/^\[|\]$/g, "");
  return trimmed.split(",").map((v) => Number(v));
}

export interface HierarchicalCluster {
  id: string;
  level: number;
  parent_id: string | null;
  cluster_index: number;
  member_count: number;
  centroid: number[];
  centroid_2d: number[] | null;
  color: string;
}

export async function reclusterTeamDirectionsHierarchical(opts: {
  levels?: number[];
  createdByUserId?: string | null;
  adminClient?: SupabaseClient;
}): Promise<{ clusteringId: string; clusters: HierarchicalCluster[] }> {
  const admin = opts.adminClient ?? createAdminClient();
  const levels = opts.levels ?? [3, 6, 12];

  const { data: rows } = await admin
    .from("hackathon_team_direction_embeddings")
    .select("id, embedding, source_text");

  const embeddings = (rows ?? []) as { id: string; embedding: string | number[]; source_text: string }[];
  const vectors = embeddings.map((e) => parseEmbedding(e.embedding));

  if (vectors.length === 0) {
    throw new Error("No team direction embeddings found");
  }

  const allClusters: HierarchicalCluster[] = [];
  let previousAssignments: number[] = [];
  let previousClusterIds: string[] = [];

  for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
    const k = levels[levelIdx];
    if (vectors.length < k) continue;

    const { centroids, assignments } = runKMeans(vectors, k);
    const projections = centroids.length > 0 ? project2D(centroids) : [];

    const levelClusterIds: string[] = [];

    for (let i = 0; i < centroids.length; i++) {
      const parentId = levelIdx > 0
        ? findParentCluster(i, assignments, previousAssignments, levels[levelIdx - 1], previousClusterIds)
        : null;

      allClusters.push({
        id: `level-${levelIdx}-cluster-${i}`,
        level: levelIdx,
        parent_id: parentId,
        cluster_index: i,
        member_count: assignments.filter((a) => a === i).length,
        centroid: centroids[i],
        centroid_2d: projections[i] ?? null,
        color: clusterColor(i + levelIdx * 100),
      });

      levelClusterIds.push(`level-${levelIdx}-cluster-${i}`);
    }

    previousAssignments = assignments;
    previousClusterIds = levelClusterIds;
  }

  return { clusteringId: "hierarchical-temp", clusters: allClusters };
}

function findParentCluster(
  currentIndex: number,
  currentAssignments: number[],
  previousAssignments: number[],
  previousK: number,
  previousClusterIds: string[]
): string | null {
  const memberIndices = currentAssignments
    .map((a, idx) => (a === currentIndex ? idx : -1))
    .filter((idx) => idx !== -1);

  const parentCounts = new Array(previousK).fill(0);
  for (const idx of memberIndices) {
    parentCounts[previousAssignments[idx]]++;
  }

  const maxParent = parentCounts.indexOf(Math.max(...parentCounts));
  return maxParent >= 0 && maxParent < previousClusterIds.length
    ? previousClusterIds[maxParent]
    : null;
}
