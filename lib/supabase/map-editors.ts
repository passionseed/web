import { createClient } from "@/utils/supabase/client";

export interface MapEditor {
  id: string;
  map_id: string;
  user_id: string;
  granted_by: string;
  granted_at: string;
  profiles?: {
    id: string;
    username: string;
    full_name: string | null;
    email?: string;
  };
}

/**
 * Get all editors for a specific map
 */
export async function getMapEditors(mapId: string): Promise<MapEditor[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("map_editors")
    .select(
      `
      id,
      map_id,
      user_id,
      granted_by,
      granted_at,
      profiles:user_id (
        id,
        username,
        full_name,
        email
      )
    `
    )
    .eq("map_id", mapId)
    .order("granted_at", { ascending: false });

  if (error) {
    console.error("Error fetching map editors:", error);
    throw new Error("Failed to fetch map editors");
  }

  return data as MapEditor[];
}

/**
 * Add an editor to a map by email
 */
export async function addMapEditorByEmail(
  mapId: string,
  email: string
): Promise<{ success: boolean; message: string; editor?: MapEditor }> {
  const supabase = createClient();

  // First, get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be logged in" };
  }

  // Check if the current user is the creator or has permission
  const { data: mapData, error: mapError } = await supabase
    .from("learning_maps")
    .select("creator_id")
    .eq("id", mapId)
    .single();

  if (mapError || !mapData) {
    return { success: false, message: "Map not found" };
  }

  // Check if user is creator or instructor
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "instructor")
    .single();

  if (mapData.creator_id !== user.id && !roleData) {
    return {
      success: false,
      message: "You don't have permission to add editors to this map",
    };
  }

  // Find the user by email
  const { data: targetUser, error: userError } = await supabase
    .from("profiles")
    .select("id, username, full_name, email")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (userError || !targetUser) {
    return { success: false, message: `No user found with email: ${email}` };
  }

  // Don't allow adding the creator as an editor
  if (targetUser.id === mapData.creator_id) {
    return {
      success: false,
      message: "The map creator already has full access",
    };
  }

  // Check if already an editor
  const { data: existingEditor } = await supabase
    .from("map_editors")
    .select("id")
    .eq("map_id", mapId)
    .eq("user_id", targetUser.id)
    .single();

  if (existingEditor) {
    return { success: false, message: "This user is already an editor" };
  }

  // Add the editor
  const { data: newEditor, error: insertError } = await supabase
    .from("map_editors")
    .insert({
      map_id: mapId,
      user_id: targetUser.id,
      granted_by: user.id,
    })
    .select(
      `
      id,
      map_id,
      user_id,
      granted_by,
      granted_at,
      profiles:user_id (
        id,
        username,
        full_name,
        email
      )
    `
    )
    .single();

  if (insertError) {
    console.error("Error adding editor:", insertError);
    return { success: false, message: "Failed to add editor" };
  }

  return {
    success: true,
    message: `Successfully added ${targetUser.username || targetUser.email} as an editor`,
    editor: newEditor as MapEditor,
  };
}

/**
 * Remove an editor from a map
 */
export async function removeMapEditor(
  mapId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();

  // First, get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be logged in" };
  }

  // Check if the current user is the creator or has permission
  const { data: mapData, error: mapError } = await supabase
    .from("learning_maps")
    .select("creator_id")
    .eq("id", mapId)
    .single();

  if (mapError || !mapData) {
    return { success: false, message: "Map not found" };
  }

  // Check if user is creator or instructor
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "instructor")
    .single();

  if (mapData.creator_id !== user.id && !roleData) {
    return {
      success: false,
      message: "You don't have permission to remove editors from this map",
    };
  }

  // Remove the editor
  const { error: deleteError } = await supabase
    .from("map_editors")
    .delete()
    .eq("map_id", mapId)
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Error removing editor:", deleteError);
    return { success: false, message: "Failed to remove editor" };
  }

  return { success: true, message: "Editor removed successfully" };
}

/**
 * Check if the current user can edit a specific map
 */
export async function canEditMap(mapId: string): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // Check if user is the creator
  const { data: mapData } = await supabase
    .from("learning_maps")
    .select("creator_id")
    .eq("id", mapId)
    .single();

  if (mapData?.creator_id === user.id) {
    return true;
  }

  // Check if user is an instructor
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "instructor")
    .single();

  if (roleData) {
    return true;
  }

  // Check if user is an editor
  const { data: editorData } = await supabase
    .from("map_editors")
    .select("id")
    .eq("map_id", mapId)
    .eq("user_id", user.id)
    .single();

  return !!editorData;
}
