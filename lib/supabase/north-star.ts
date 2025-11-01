import { createClient } from "@/utils/supabase/client";
import {
  NorthStar,
  NorthStarCreateData,
  NorthStarUpdateData,
} from "@/types/journey";

const TABLE_NAME = "north_stars";

/**
 * Create a new North Star
 */
export async function createNorthStar(
  data: NorthStarCreateData
): Promise<NorthStar> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data: northStar, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      user_id: user.id,
      title: data.title,
      description: data.description || null,
      why: data.why || null,
      icon: data.icon || "⭐",
      sdg_goals: data.sdg_goals || [],
      career_path: data.career_path || null,
      north_star_shape: data.north_star_shape || "classic",
      north_star_color: data.north_star_color || "golden",
      position_x: data.position_x || null,
      position_y: data.position_y || null,
      status: data.status || "active",
      metadata: data.metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating North Star:", error);
    throw new Error(`Failed to create North Star: ${error.message}`);
  }

  if (!northStar) {
    throw new Error("Failed to create North Star: No data returned");
  }

  return northStar;
}

/**
 * Get all North Stars for the authenticated user
 */
export async function getNorthStars(): Promise<NorthStar[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data: northStars, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching North Stars:", error);
    throw new Error(`Failed to fetch North Stars: ${error.message}`);
  }

  return northStars || [];
}

/**
 * Get a single North Star by ID
 */
export async function getNorthStarById(id: string): Promise<NorthStar | null> {
  const supabase = createClient();

  const { data: northStar, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    console.error("Error fetching North Star:", error);
    throw new Error(`Failed to fetch North Star: ${error.message}`);
  }

  return northStar;
}

/**
 * Update a North Star
 */
export async function updateNorthStar(
  id: string,
  data: NorthStarUpdateData
): Promise<NorthStar> {
  const supabase = createClient();

  const { data: northStar, error } = await supabase
    .from(TABLE_NAME)
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating North Star:", error);
    throw new Error(`Failed to update North Star: ${error.message}`);
  }

  if (!northStar) {
    throw new Error("Failed to update North Star: No data returned");
  }

  return northStar;
}

/**
 * Delete a North Star
 */
export async function deleteNorthStar(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);

  if (error) {
    console.error("Error deleting North Star:", error);
    throw new Error(`Failed to delete North Star: ${error.message}`);
  }
}

/**
 * Update North Star position
 */
export async function updateNorthStarPosition(
  id: string,
  x: number,
  y: number
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from(TABLE_NAME)
    .update({
      position_x: x,
      position_y: y,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating North Star position:", error);
    throw new Error(`Failed to update North Star position: ${error.message}`);
  }
}
