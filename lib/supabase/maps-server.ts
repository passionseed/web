import { createClient } from "@/utils/supabase/server";
import { isInstructor } from "./roles";
import { FullLearningMap } from "./maps";
import { createCacheKey, dedupeRequest } from "../utils/request-deduplication";
import { LearningMap } from "@/types/map";

/**
 * Check if a specific user can edit a specific map (SERVER-SIDE ONLY)
 * Returns true if user is the creator OR has instructor role
 * This function should only be called from server components
 */
export const canUserEditMapServer = async (
  userId: string,
  mapId: string
): Promise<boolean> => {
  const supabase = await createClient();

  // Check if user is the creator of the map
  const { data: map, error: mapError } = await supabase
    .from("learning_maps")
    .select("creator_id")
    .eq("id", mapId)
    .single();

  if (mapError) {
    console.error("Error checking map creator:", mapError);
    return false;
  }

  // User is the creator
  if (map.creator_id === userId) {
    return true;
  }

  // Check if user has instructor role (fallback permission)
  try {
    const userIsInstructor = await isInstructor(userId);
    return userIsInstructor;
  } catch (error) {
    console.error("Error checking instructor role:", error);
    return false;
  }
};

export const getMapWithNodesServer = async (
  id: string
): Promise<FullLearningMap | null> => {
  const cacheKey = createCacheKey("map-with-nodes", id);

  return dedupeRequest(cacheKey, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("learning_maps")
      .select(
        `
            *,
            map_nodes (
                *,
                node_paths_source:node_paths!source_node_id(*),
                node_paths_destination:node_paths!destination_node_id(*),
                node_content (*),
                node_assessments (
                    *,
                    quiz_questions (*)
                )
            )
        `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching map with nodes:", error);
      if (error.code === "PGRST116") return null;
      throw new Error("Could not fetch the learning map.");
    }

    return data as FullLearningMap;
  });
};

// SERVER-SIDE optimized version of getMapsWithStats
export const getMapsWithStatsServer = async (
  page: number = 0,
  limit: number = 20
): Promise<{
  maps: (LearningMap & {
    node_count: number;
    avg_difficulty: number;
    total_assessments: number;
    map_type: "personal" | "classroom" | "team" | "forked" | "public";
    isEnrolled: boolean;
    hasStarted: boolean;
  })[];
  total_count: number;
  has_more: boolean;
}> => {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("SERVER: getMapsWithStatsServer called with user:", user?.id || "anonymous");

  // Simple query for server-side rendering - focus on public maps and user's own maps
  const offset = page * limit;

  // Get count first
  let countQuery = supabase
    .from("learning_maps")
    .select("id", { count: 'exact', head: true });

  if (!user) {
    countQuery = countQuery.eq("visibility", "public");
  } else {
    countQuery = countQuery.or(`visibility.eq.public,creator_id.eq.${user.id}`);
  }

  const { count: totalCount } = await countQuery;

  // Get maps data
  let dataQuery = supabase
    .from("learning_maps")
    .select(`
      id,
      title,
      description,
      creator_id,
      difficulty,
      category,
      visibility,
      metadata,
      created_at,
      updated_at,
      total_students,
      finished_students,
      map_nodes (
        id,
        difficulty,
        node_assessments (id)
      )
    `);

  if (!user) {
    dataQuery = dataQuery.eq("visibility", "public");
  } else {
    dataQuery = dataQuery.or(`visibility.eq.public,creator_id.eq.${user.id}`);
  }

  const { data, error } = await dataQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("SERVER: Error fetching maps:", error);
    throw new Error("Could not fetch learning maps.");
  }

  // Transform data (simplified for server-side)
  const mapsWithStats = (data || []).map((map: any) => {
    const nodes = map.map_nodes || [];
    const nodeCount = nodes.length;
    const avgDifficulty = nodeCount > 0
      ? Math.round(nodes.reduce((sum: number, node: any) => sum + (node.difficulty || 1), 0) / nodeCount)
      : 1;
    const totalAssessments = nodes.reduce(
      (sum: number, node: any) => sum + (node.node_assessments?.length || 0),
      0
    );

    // Determine map type (simplified for server-side)
    let mapType: "personal" | "classroom" | "team" | "forked" | "public" = "public";
    if (user && map.creator_id === user.id) {
      mapType = map.metadata?.forked_from ? "forked" : "personal";
    }

    return {
      id: map.id,
      title: map.title,
      description: map.description,
      creator_id: map.creator_id,
      difficulty: map.difficulty,
      category: map.category,
      total_students: map.total_students,
      finished_students: map.finished_students,
      metadata: map.metadata,
      visibility: map.visibility,
      created_at: map.created_at,
      updated_at: map.updated_at,
      node_count: nodeCount,
      avg_difficulty: avgDifficulty,
      total_assessments: totalAssessments,
      map_type: mapType,
      isEnrolled: false, // Simplified for server-side
      hasStarted: false, // Simplified for server-side
    };
  });

  return {
    maps: mapsWithStats,
    total_count: totalCount || 0,
    has_more: (offset + limit) < (totalCount || 0)
  };
};