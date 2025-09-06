import { createClient } from "@/utils/supabase/server";
import { isInstructor } from "./roles";
import { FullLearningMap } from "./maps";
import { createCacheKey, dedupeRequest } from "../utils/request-deduplication";

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
