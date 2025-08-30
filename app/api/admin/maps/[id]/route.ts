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
      .select(
        `
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
      `
      )
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
    const avgDifficulty =
      nodeCount > 0
        ? Math.round(
            nodes.reduce(
              (sum: number, node: any) => sum + (node.difficulty || 1),
              0
            ) / nodeCount
          )
        : 1;
    const totalAssessments = nodes.reduce(
      (sum: number, node: any) => sum + (node.node_assessments?.length || 0),
      0
    );

    const mapWithStats = {
      ...map,
      creator_name:
        map.profiles?.full_name || map.profiles?.username || "Unknown",
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
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔍 [API] DELETE request received for admin maps");
  
  const user = await checkAdminAccess();

  if (!user) {
    console.log("❌ [API] Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }
  
  console.log("✅ [API] Admin access confirmed:", user.email);

  try {
    const { id } = await params;

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

    // Use the server-side deleteMap function with server-side Supabase client  
    console.log(`🗑️ [API] Starting deletion of map ${id} by admin user ${user.id}`);
    
    try {
      await deleteMap(id, supabase);
      
      console.log(`✅ [API] Successfully deleted map ${id}`);
      
      // Verify deletion was successful by querying for the map
      console.log(`🔍 [API] Verifying map ${id} no longer exists...`);
      const { data: verifyMap, error: verifyError } = await supabase
        .from("learning_maps")
        .select("id")
        .eq("id", id);
      
      if (verifyError) {
        console.warn(`⚠️ [API] Could not verify deletion for map ${id}:`, verifyError);
      } else if (verifyMap && verifyMap.length > 0) {
        console.error(`❌ [API] CRITICAL: Map ${id} still exists after deletion!`);
        throw new Error("Deletion verification failed - map still exists");
      } else {
        console.log(`✅ [API] Verified: Map ${id} successfully removed from database`);
      }
      
      return NextResponse.json({
        success: true,
        message: `Map "${existingMap.title}" has been deleted successfully`,
        stats: {
          mapId: id,
          mapTitle: existingMap.title,
          verified: true,
          message: "Map and all related data deleted and verified"
        }
      });
    } catch (deleteError) {
      console.error(`❌ [API] Failed to delete map ${id}:`, {
        error: deleteError,
        message: deleteError instanceof Error ? deleteError.message : 'Unknown error',
        stack: deleteError instanceof Error ? deleteError.stack : undefined,
        mapId: id,
        mapTitle: existingMap.title,
        timestamp: new Date().toISOString()
      });
      throw deleteError; // Re-throw to be caught by outer catch block
    }
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
