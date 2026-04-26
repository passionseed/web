import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/modelRegistry";
import { createAdminClient } from "@/utils/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ClusterLabel {
  label: string;
  summary: string;
  keywords: string[];
}

export async function autoLabelCluster(
  clusterId: string,
  opts: {
    modelName?: string;
    adminClient?: SupabaseClient;
  } = {}
): Promise<ClusterLabel> {
  const admin = opts.adminClient ?? createAdminClient();

  const { data: assignments } = await admin
    .from("hackathon_team_direction_cluster_assignments")
    .select(`
      distance_to_centroid,
      hackathon_team_direction_embeddings!inner(
        team_id,
        source_text,
        hackathon_teams!inner(name)
      )
    `)
    .eq("cluster_id", clusterId)
    .order("distance_to_centroid", { ascending: true })
    .limit(5);

  const teams = (assignments ?? []).map((a: any) => {
    const row = a as any;
    const emb = Array.isArray(row.hackathon_team_direction_embeddings)
      ? row.hackathon_team_direction_embeddings[0]
      : row.hackathon_team_direction_embeddings;
    const team = Array.isArray(emb?.hackathon_teams) ? emb.hackathon_teams[0] : emb?.hackathon_teams;
    return {
      name: team?.name ?? "Unknown",
      text: (emb?.source_text ?? "").slice(0, 400),
    };
  });

  const { object } = await generateObject({
    model: getModel(opts.modelName),
    schema: z.object({
      label: z.string().describe("Short label (2-4 words) for this cluster"),
      summary: z.string().describe("One sentence describing what teams in this cluster have in common"),
      keywords: z.array(z.string()).describe("3-5 keywords that characterize this cluster"),
    }),
    prompt: `Label this cluster of hackathon teams based on their submissions.

Teams in cluster:
${teams.map((t) => `- ${t.name}: ${t.text}`).join("\n")}

Provide a concise label, summary, and keywords.`,
  });

  await admin
    .from("hackathon_team_direction_clusters")
    .update({
      label: object.label,
      summary: object.summary,
    })
    .eq("id", clusterId);

  return object;
}

export async function autoLabelAllClusters(
  clusteringId: string,
  opts: {
    modelName?: string;
    adminClient?: SupabaseClient;
  } = {}
): Promise<ClusterLabel[]> {
  const admin = opts.adminClient ?? createAdminClient();

  const { data: clusters } = await admin
    .from("hackathon_team_direction_clusters")
    .select("id, cluster_index")
    .eq("clustering_id", clusteringId)
    .order("cluster_index", { ascending: true });

  if (!clusters || clusters.length === 0) return [];

  const { data: assignments } = await admin
    .from("hackathon_team_direction_cluster_assignments")
    .select(`
      cluster_id,
      distance_to_centroid,
      hackathon_team_direction_embeddings!inner(
        team_id,
        source_text,
        hackathon_teams!inner(name)
      )
    `)
    .in("cluster_id", clusters.map((c: any) => c.id))
    .order("distance_to_centroid", { ascending: true });

  const teamsByCluster = new Map<string, { name: string; text: string }[]>();
  for (const a of assignments ?? []) {
    const row = a as any;
    const cid = row.cluster_id as string;
    if (!teamsByCluster.has(cid)) teamsByCluster.set(cid, []);
    const arr = teamsByCluster.get(cid)!;
    if (arr.length < 3) {
      const emb = Array.isArray(row.hackathon_team_direction_embeddings)
        ? row.hackathon_team_direction_embeddings[0]
        : row.hackathon_team_direction_embeddings;
      const team = Array.isArray(emb?.hackathon_teams) ? emb.hackathon_teams[0] : emb?.hackathon_teams;
      arr.push({
        name: team?.name ?? "Unknown",
        text: (emb?.source_text ?? "").slice(0, 300),
      });
    }
  }

  const clusterDescriptions = clusters.map((c: any) => {
    const teamList = teamsByCluster.get(c.id as string) ?? [];
    return `Cluster ${c.cluster_index + 1}:\n${teamList.map((t) => `- ${t.name}: ${t.text}`).join("\n")}`;
  }).join("\n\n---\n\n");

  const { object } = await generateObject({
    model: getModel(opts.modelName),
    schema: z.object({
      clusters: z.array(z.object({
        cluster_index: z.number().describe("The cluster index (0-based)"),
        label: z.string().describe("Short label (2-4 words)"),
        summary: z.string().describe("One sentence describing what teams have in common"),
        keywords: z.array(z.string()).describe("3-5 keywords"),
      })).describe("Labels for ALL clusters"),
    }),
    prompt: `Label these hackathon team clusters. Each cluster contains teams with similar submission themes.

${clusterDescriptions}

Provide a label, summary, and keywords for EVERY cluster listed above.`,
  });

  for (const label of object.clusters) {
    const cluster = clusters.find((c: any) => c.cluster_index === label.cluster_index);
    if (cluster) {
      await admin
        .from("hackathon_team_direction_clusters")
        .update({
          label: label.label,
          summary: label.summary,
        })
        .eq("id", cluster.id as string);
    }
  }

  return object.clusters;
}
