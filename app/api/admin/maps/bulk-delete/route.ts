import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check admin role
    const { data: userRoles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError || !userRoles?.some(r => r.role === "admin")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { mapIds } = body;

    if (!Array.isArray(mapIds) || mapIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid map IDs provided" },
        { status: 400 }
      );
    }

    console.log("🗑️ [Admin] Starting bulk deletion of maps:", mapIds);

    // Delete maps in batch
    let deletedCount = 0;
    const errors: string[] = [];

    for (const mapId of mapIds) {
      try {
        // Delete the map - this will cascade to related data
        const { error: deleteError } = await supabase
          .from("learning_maps")
          .delete()
          .eq("id", mapId);

        if (deleteError) {
          console.error(`❌ [Admin] Failed to delete map ${mapId}:`, deleteError);
          errors.push(`Failed to delete map ${mapId}: ${deleteError.message}`);
        } else {
          deletedCount++;
          console.log(`✅ [Admin] Successfully deleted map ${mapId}`);
        }
      } catch (error) {
        console.error(`❌ [Admin] Error deleting map ${mapId}:`, error);
        errors.push(`Error deleting map ${mapId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const response = {
      message: `Bulk deletion completed`,
      deletedCount,
      requestedCount: mapIds.length,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log("📊 [Admin] Bulk deletion summary:", response);

    if (errors.length > 0 && deletedCount === 0) {
      return NextResponse.json(
        { ...response, error: "All deletions failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error("❌ [Admin] Bulk delete error:", error);
    return NextResponse.json(
      { error: "Internal server error during bulk deletion" },
      { status: 500 }
    );
  }
}