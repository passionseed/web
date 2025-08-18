import { createClient } from "@/utils/supabase/server";
import { isInstructor } from "./roles";

/**
 * Check if a specific user can edit a specific map (SERVER-SIDE ONLY)
 * Returns true if user is the creator OR has instructor role
 * This function should only be called from server components
 */
export const canUserEditMap = async (
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
