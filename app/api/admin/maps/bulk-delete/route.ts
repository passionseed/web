import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { deleteMap } from "@/lib/supabase/maps";

// Increase timeout for bulk operations
export const maxDuration = 60; // 60 seconds

// Helper function to check admin access
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

export async function DELETE(request: NextRequest) {
  try {
    const user = await checkAdminAccess();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    console.log(`🔐 [Admin] Authenticated user: ${user.id} (${user.email})`);

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
        console.log(`🔍 [Admin] Starting deletion for map ${mapId}`);
        
        // Use regular server client for deletion (same as individual delete)
        const supabase = await createClient();
        
        // Verify map exists first
        const { data: existingMap, error: fetchError } = await supabase
          .from("learning_maps")
          .select("id, title")
          .eq("id", mapId)
          .single();

        if (fetchError) {
          console.error(`❌ [Admin] Map ${mapId} not found:`, {
            message: fetchError.message,
            code: fetchError.code,
            details: fetchError.details,
            hint: fetchError.hint
          });
          errors.push(`Map ${mapId} not found: ${fetchError.message}`);
          continue;
        }

        console.log(`📋 [Admin] Map ${mapId} verified: "${existingMap.title}"`);

        // Use the deleteMap function with regular server client
        console.log(`🗑️ [Admin] Calling deleteMap for ${mapId}...`);
        await deleteMap(mapId, supabase);
        
        deletedCount++;
        console.log(`✅ [Admin] Successfully deleted map ${mapId} (${existingMap.title})`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : 'No stack trace';
        
        console.error(`❌ [Admin] Error deleting map ${mapId}:`, {
          message: errorMessage,
          stack: errorStack,
          error: error
        });
        
        errors.push(`Error deleting map ${mapId}: ${errorMessage}`);
      }
    }

    const response = {
      message: `Bulk deletion completed`,
      deletedCount,
      requestedCount: mapIds.length,
      errors: errors.length > 0 ? errors : undefined,
      details: {
        attempted: mapIds.length,
        succeeded: deletedCount,
        failed: errors.length,
        failureReasons: errors
      }
    };

    console.log("📊 [Admin] Bulk deletion summary:", response);

    if (errors.length > 0 && deletedCount === 0) {
      console.error(`❌ [Admin] ALL DELETIONS FAILED. Errors:`, errors);
      return NextResponse.json(
        { 
          ...response, 
          error: "All deletions failed",
          debugInfo: {
            mapIds,
            errorDetails: errors,
            timestamp: new Date().toISOString(),
            serverLogs: "Check server console for detailed error logs"
          }
        },
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