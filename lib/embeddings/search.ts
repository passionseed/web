import { createAdminClient } from "@/utils/supabase/admin";
import { embedText } from "./bge";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SearchResult {
  team_id: string;
  team_name: string;
  mission: string;
  similarity: number;
  cluster_label?: string;
  cluster_color?: string;
}

export async function searchTeamDirections(
  query: string,
  opts: {
    aspect?: "mission" | "tech" | "market" | "composite";
    limit?: number;
    filterClusterId?: string;
    adminClient?: SupabaseClient;
  } = {}
): Promise<SearchResult[]> {
  const admin = opts.adminClient ?? createAdminClient();
  const aspect = opts.aspect ?? "composite";
  const limit = opts.limit ?? 10;

  const queryVector = await embedText(query);
  const vectorLiteral = `[${queryVector.join(",")}]`;

  const embeddingColumn = aspect === "mission" ? "mission_embedding"
    : aspect === "tech" ? "tech_embedding"
    : aspect === "market" ? "market_embedding"
    : "composite_embedding";

  const { data, error } = await admin
    .from("hackathon_team_direction_snapshots")
    .select(`
      team_id,
      profile->mission,
      hackathon_teams!inner(name),
      ${embeddingColumn} <-> ${vectorLiteral}::vector as distance
    `)
    .eq("is_latest", true)
    .order("distance", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const teamIds = (data ?? []).map((d: any) => d.team_id);
  const { data: cacheData } = await admin
    .from("team_direction_search_cache")
    .select("team_id, cluster_label, cluster_color")
    .in("team_id", teamIds);

  const cacheByTeam = new Map((cacheData ?? []).map((c: any) => [c.team_id, c]));

  return (data ?? []).map((row: any) => {
    const cache = cacheByTeam.get(row.team_id);
    return {
      team_id: row.team_id,
      team_name: row.hackathon_teams?.name ?? "Unknown",
      mission: row.profile?.mission ?? "",
      similarity: 1 - (row.distance ?? 0),
      cluster_label: cache?.cluster_label,
      cluster_color: cache?.cluster_color,
    };
  });
}

export async function findSimilarTeams(
  teamId: string,
  opts: {
    aspect?: "mission" | "tech" | "market" | "composite";
    limit?: number;
    adminClient?: SupabaseClient;
  } = {}
): Promise<SearchResult[]> {
  const admin = opts.adminClient ?? createAdminClient();
  const aspect = opts.aspect ?? "composite";
  const limit = (opts.limit ?? 5) + 1;

  const embeddingColumn = aspect === "mission" ? "mission_embedding"
    : aspect === "tech" ? "tech_embedding"
    : aspect === "market" ? "market_embedding"
    : "composite_embedding";

  const { data: teamSnapshot } = await admin
    .from("hackathon_team_direction_snapshots")
    .select(embeddingColumn)
    .eq("team_id", teamId)
    .eq("is_latest", true)
    .single();

  if (!teamSnapshot) return [];

  const vectorLiteral = teamSnapshot[embeddingColumn] as string;

  const { data, error } = await admin
    .from("hackathon_team_direction_snapshots")
    .select(`
      team_id,
      profile->mission,
      hackathon_teams!inner(name),
      ${embeddingColumn} <-> '${vectorLiteral}'::vector as distance
    `)
    .eq("is_latest", true)
    .neq("team_id", teamId)
    .order("distance", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    team_id: row.team_id,
    team_name: row.hackathon_teams?.name ?? "Unknown",
    mission: row.profile?.mission ?? "",
    similarity: 1 - (row.distance ?? 0),
  }));
}
