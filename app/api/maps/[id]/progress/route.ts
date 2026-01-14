import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔍 [Map Progress API] GET request started");

  try {
    const { id: mapId } = await params;
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get("node_id");

    console.log("📝 [Map Progress API] Request params:", {
      mapId,
      nodeId,
      url: request.url,
    });

    // Initialize Supabase client and authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ [Map Progress API] Authentication failed:", {
        authError,
        hasUser: !!user,
      });
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log("✅ [Map Progress API] User authenticated:", {
      userId: user.id,
      email: user.email,
    });

    const adminClient = createAdminClient();

    if (nodeId) {
      // Get progress for a specific node
      console.log("🎯 [Map Progress API] Fetching progress for node:", nodeId);

      const { data: progress, error: progressError } = await adminClient
        .from("student_node_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("node_id", nodeId)
        .maybeSingle();

      if (progressError) {
        console.error(
          "❌ [Map Progress API] Error fetching node progress:",
          progressError
        );
        return NextResponse.json(
          { error: "Failed to fetch progress", details: progressError },
          { status: 500 }
        );
      }

      console.log("✅ [Map Progress API] Node progress result:", progress);
      return NextResponse.json({
        success: true,
        data: progress,
      });
    } else {
      // Get all progress for this user and map
      console.log(
        "🎯 [Map Progress API] Fetching all progress for map:",
        mapId
      );

      // First get all nodes in this map
      const { data: mapNodes, error: nodesError } = await adminClient
        .from("map_nodes")
        .select("id")
        .eq("map_id", mapId);

      if (nodesError) {
        console.error(
          "❌ [Map Progress API] Error fetching map nodes:",
          nodesError
        );
        return NextResponse.json(
          { error: "Failed to fetch map nodes", details: nodesError },
          { status: 500 }
        );
      }

      const nodeIds = mapNodes?.map((node) => node.id) || [];

      if (nodeIds.length === 0) {
        console.log("ℹ️ [Map Progress API] No nodes found for map, returning empty progress");
        return NextResponse.json({
          success: true,
          data: {
            map_id: mapId,
            user_id: user.id,
            progress_map: {},
            all_progress: [],
          },
        });
      }

      // Get progress for all nodes in this map
      const { data: allProgress, error: progressError } = await adminClient
        .from("student_node_progress")
        .select("*")
        .eq("user_id", user.id)
        .in("node_id", nodeIds);

      if (progressError) {
        console.error(
          "❌ [Map Progress API] Error fetching all progress:",
          progressError
        );
        return NextResponse.json(
          { error: "Failed to fetch progress data", details: progressError },
          { status: 500 }
        );
      }

      // Create a map of node_id -> progress for easy lookup
      const progressMap: Record<string, any> = {};
      allProgress?.forEach((progress) => {
        progressMap[progress.node_id] = progress;
      });

      console.log("✅ [Map Progress API] All progress result:", {
        totalNodes: nodeIds.length,
        progressCount: allProgress?.length || 0,
        progressMap,
      });

      return NextResponse.json({
        success: true,
        data: {
          map_id: mapId,
          user_id: user.id,
          progress_map: progressMap,
          all_progress: allProgress || [],
        },
      });
    }
  } catch (error) {
    console.error("❌ [Map Progress API] Error:", error);
    console.error("❌ [Map Progress API] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
      type: typeof error,
      constructor: error?.constructor?.name,
    });

    return NextResponse.json(
      { error: "Failed to fetch map progress" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔄 [Map Progress API] POST request started");

  try {
    const { id: mapId } = await params;
    const body = await request.json();
    const { node_id, status, arrived_at, started_at, submitted_at } = body;

    console.log("📝 [Map Progress API] POST request data:", {
      mapId,
      body,
      node_id,
      status,
    });

    if (!node_id || !status) {
      console.error("❌ [Map Progress API] Missing required fields:", {
        node_id: !!node_id,
        status: !!status,
      });
      return NextResponse.json(
        { error: "node_id and status are required" },
        { status: 400 }
      );
    }

    // Initialize Supabase client and authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ [Map Progress API] Authentication failed:", authError);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Initialize Admin client for DB operations (bypass RLS)
    const adminClient = createAdminClient();

    console.log("🎯 [Map Progress API] Creating/updating progress:", {
      user_id: user.id,
      node_id,
      status,
    });

    // Upsert the progress record
    const { data: progress, error: upsertError } = await adminClient
      .from("student_node_progress")
      .upsert(
        {
          user_id: user.id,
          node_id,
          status,
          arrived_at:
            arrived_at ||
            (status === "in_progress" ? new Date().toISOString() : null),
          started_at:
            started_at ||
            (status === "in_progress" ? new Date().toISOString() : null),
          submitted_at:
            submitted_at ||
            (status === "submitted" ? new Date().toISOString() : null),
        },
        {
          onConflict: "user_id,node_id",
        }
      )
      .select("*")
      .single();

    if (upsertError || !progress) {
      console.error(
        "❌ [Map Progress API] Failed to upsert progress:",
        upsertError
      );
      return NextResponse.json(
        { error: "Failed to update progress" },
        { status: 500 }
      );
    }

    console.log("✅ [Map Progress API] Progress update result:", progress);

    return NextResponse.json({
      success: true,
      data: progress,
      message: `Node progress updated to ${status}`,
    });
  } catch (error) {
    console.error("❌ [Map Progress API] Update progress error:", error);
    console.error("❌ [Map Progress API] POST Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
      type: typeof error,
      constructor: error?.constructor?.name,
    });

    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}
