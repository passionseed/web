import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

export async function GET() {
  const user = await checkAdminAccess();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const supabase = await createClient();

    // Get all learning maps with additional details
    const { data: maps, error } = await supabase
      .from("learning_maps")
      .select(`
        *,
        profiles!creator_id (
          username,
          full_name
        ),
        map_nodes (
          id,
          difficulty
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching admin maps:", error);
      return NextResponse.json(
        { error: "Failed to fetch maps" },
        { status: 500 }
      );
    }

    // Transform data to include calculated statistics
    const mapsWithStats = (maps || []).map((map: any) => {
      const nodes = map.map_nodes || [];
      const nodeCount = nodes.length;
      const avgDifficulty = nodeCount > 0
        ? Math.round(nodes.reduce((sum: number, node: any) => sum + (node.difficulty || 1), 0) / nodeCount)
        : 1;

      return {
        id: map.id,
        title: map.title,
        description: map.description,
        creator_id: map.creator_id,
        creator_name: map.profiles?.full_name || map.profiles?.username || "Unknown",
        difficulty: map.difficulty,
        category: map.category,
        visibility: map.visibility,
        node_count: nodeCount,
        avg_difficulty: avgDifficulty,
        created_at: map.created_at,
        updated_at: map.updated_at,
        metadata: map.metadata,
      };
    });

    return NextResponse.json(mapsWithStats);
  } catch (error) {
    console.error("Error in admin maps route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}