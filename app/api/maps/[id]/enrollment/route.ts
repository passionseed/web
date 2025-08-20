import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔍 [Enrollment Check API] GET request started");

  try {
    const { id: mapId } = await params;

    console.log("📝 [Enrollment Check API] Request params:", {
      mapId,
    });

    // Initialize Supabase client and authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ [Enrollment Check API] Authentication failed:", {
        authError,
        hasUser: !!user,
      });
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log("✅ [Enrollment Check API] User authenticated:", {
      userId: user.id,
      email: user.email,
    });

    // Check if user is enrolled
    const { data: enrollment, error: checkError } = await supabase
      .from("user_map_enrollments")
      .select("*")
      .eq("user_id", user.id)
      .eq("map_id", mapId)
      .maybeSingle();

    if (checkError) {
      console.error(
        "❌ [Enrollment Check API] Error checking enrollment:",
        checkError
      );
      return NextResponse.json(
        { error: "Failed to check enrollment status" },
        { status: 500 }
      );
    }

    const isEnrolled = !!enrollment;
    let hasStarted = false;

    // If enrolled, check if they have any progress on map nodes
    if (isEnrolled) {
      // First get all node IDs for this map
      const { data: nodes, error: nodesError } = await supabase
        .from("map_nodes")
        .select("id")
        .eq("map_id", mapId);

      if (!nodesError && nodes && nodes.length > 0) {
        const nodeIds = nodes.map(node => node.id);
        
        // Check if user has progress on any of these nodes
        const { data: progress, error: progressError } = await supabase
          .from("student_node_progress")
          .select("status")
          .eq("user_id", user.id)
          .in("node_id", nodeIds)
          .not("status", "eq", "not_started")
          .limit(1);

        if (!progressError && progress && progress.length > 0) {
          hasStarted = true;
        }
      }
    }

    console.log("✅ [Enrollment Check API] Enrollment check result:", {
      isEnrolled,
      hasStarted,
      enrollment: enrollment ? "found" : "not found",
    });

    return NextResponse.json({
      success: true,
      data: {
        isEnrolled,
        hasStarted,
        enrollment,
      },
    });
  } catch (error) {
    console.error("❌ [Enrollment Check API] Error:", error);
    console.error("❌ [Enrollment Check API] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
      type: typeof error,
      constructor: error?.constructor?.name,
    });

    return NextResponse.json(
      { error: "Failed to check enrollment" },
      { status: 500 }
    );
  }
}
