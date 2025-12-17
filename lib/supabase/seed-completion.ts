import { createClient } from "@/utils/supabase/client";
import { SeedRoomCompletion } from "@/types/seeds";

/**
 * Mark a seed room as completed for a user when they complete an end node
 */
export async function markSeedRoomCompleted(
  roomId: string,
  userId: string,
  completedNodeId: string
): Promise<{ data: SeedRoomCompletion | null; error: any }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("seed_room_completions")
    .insert({
      room_id: roomId,
      user_id: userId,
      completed_node_id: completedNodeId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error marking seed room as completed:", error.message || error);
    console.error("Error details:", { code: error.code, details: error.details, hint: error.hint });
  }

  return { data, error };
}

/**
 * Check if a user has completed a seed room
 */
export async function checkSeedRoomCompletion(
  roomId: string,
  userId: string
): Promise<{ completed: boolean; completion: SeedRoomCompletion | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("seed_room_completions")
    .select("*")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error checking seed room completion:", error.message || error);
    return { completed: false, completion: null };
  }

  return { completed: !!data, completion: data };
}

/**
 * Get all completions for a seed room (for mentors/admins)
 */
export async function getSeedRoomCompletions(
  roomId: string
): Promise<SeedRoomCompletion[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("seed_room_completions")
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        username,
        email
      )
    `)
    .eq("room_id", roomId)
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("Error fetching seed room completions:", error.message || error);
    return [];
  }

  return data || [];
}

/**
 * Check if a node is an end node
 */
export function isEndNode(nodeType?: string): boolean {
  return nodeType === "end";
}
