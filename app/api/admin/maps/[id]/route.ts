import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { deleteMap } from "@/lib/supabase/maps";

async function checkAdminAccess() {
  const supabase = await createClient();
  
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Check if user has admin role
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  return roles && roles.length > 0 ? user : null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await checkAdminAccess();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const { id } = params;

    // Get specific map with full details
    const { data: map, error } = await supabase
      .from("learning_maps")
      .select(`
        *,
        profiles!creator_id (
          username,
          full_name,
          email
        ),
        map_nodes (
          id,
          title,
          difficulty,
          node_assessments (id)
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Map not found" }, { status: 404 });
      }
      console.error("Error fetching map:", error);
      return NextResponse.json(
        { error: "Failed to fetch map" },
        { status: 500 }
      );
    }

    // Calculate additional statistics
    const nodes = map.map_nodes || [];
    const nodeCount = nodes.length;
    const avgDifficulty = nodeCount > 0
      ? Math.round(nodes.reduce((sum: number, node: any) => sum + (node.difficulty || 1), 0) / nodeCount)
      : 1;
    const totalAssessments = nodes.reduce((sum: number, node: any) => sum + (node.node_assessments?.length || 0), 0);

    const mapWithStats = {
      ...map,
      creator_name: map.profiles?.full_name || map.profiles?.username || "Unknown",
      creator_email: map.profiles?.email,
      node_count: nodeCount,
      avg_difficulty: avgDifficulty,
      total_assessments: totalAssessments,
    };

    return NextResponse.json(mapWithStats);
  } catch (error) {
    console.error("Error in admin map detail route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await checkAdminAccess();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = params;

    // Verify the map exists before attempting deletion
    const supabase = await createClient();
    const { data: existingMap, error: fetchError } = await supabase
      .from("learning_maps")
      .select("id, title, creator_id")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "Map not found" }, { status: 404 });
      }
      console.error("Error checking map existence:", fetchError);
      return NextResponse.json(
        { error: "Failed to verify map" },
        { status: 500 }
      );
    }

    // Use the existing deleteMap function from maps.ts
    // This handles all the cascade deletion properly
    await deleteMap(id);

    return NextResponse.json({ 
      success: true, 
      message: `Map "${existingMap.title}" has been deleted successfully` 
    });
  } catch (error) {
    console.error("Error deleting map:", error);
    
    // Handle specific error messages from deleteMap function
    if (error instanceof Error) {
      if (error.message.includes("Could not delete the map")) {
        return NextResponse.json(
          { error: "Failed to delete map. It may have dependencies." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error during deletion" },
      { status: 500 }
    );
  }
}