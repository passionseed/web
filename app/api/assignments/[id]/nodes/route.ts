import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user for authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify assignment exists and user has access
    const { data: assignment, error: assignmentError } = await supabase
      .from("classroom_assignments")
      .select("id, classroom_id, created_by")
      .eq("id", assignmentId)
      .single();

    if (assignmentError || !assignment) {
      console.error("Assignment not found:", assignmentError);
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this assignment
    // Either they're enrolled in the assignment, or they're an instructor/TA in the classroom
    const [membershipResult, enrollmentResult] = await Promise.all([
      // Check if user is instructor/TA in the classroom
      supabase
        .from("classroom_memberships")
        .select("role")
        .eq("classroom_id", assignment.classroom_id)
        .eq("user_id", user.id)
        .in("role", ["instructor", "ta"])
        .single(),

      // Check if user is enrolled in the assignment
      supabase
        .from("assignment_enrollments")
        .select("id")
        .eq("assignment_id", assignmentId)
        .eq("user_id", user.id)
        .single(),
    ]);

    const hasInstructorAccess =
      !membershipResult.error && membershipResult.data;
    const hasStudentAccess = !enrollmentResult.error && enrollmentResult.data;

    if (!hasInstructorAccess && !hasStudentAccess) {
      return NextResponse.json(
        { error: "Access denied to this assignment" },
        { status: 403 }
      );
    }

    // Fetch assignment nodes with map node details
    const { data: nodes, error: nodesError } = await supabase
      .from("assignment_nodes")
      .select(
        `
        id,
        node_id,
        sequence_order,
        is_required,
        created_at,
        map_nodes (
          id,
          title,
          instructions,
          difficulty,
          sprite_url,
          metadata
        )
      `
      )
      .eq("assignment_id", assignmentId)
      .order("sequence_order", { ascending: true });

    if (nodesError) {
      console.error("Error fetching assignment nodes:", {
        error: nodesError,
        assignmentId,
        userId: user.id,
      });
      return NextResponse.json(
        {
          error: "Failed to fetch assignment nodes",
          details: nodesError.message,
          code: nodesError.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(nodes || []);
  } catch (error) {
    console.error("Error in assignment nodes GET API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;
    const { node_ids } = await request.json();

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    if (!node_ids || !Array.isArray(node_ids) || node_ids.length === 0) {
      return NextResponse.json(
        { error: "Node IDs array is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user for authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify assignment exists and user has permission
    const { data: assignment, error: assignmentError } = await supabase
      .from("classroom_assignments")
      .select("id, created_by, classroom_id")
      .eq("id", assignmentId)
      .single();

    if (assignmentError) {
      console.error("❌ Assignment verification error:", {
        assignmentId,
        error: assignmentError,
        code: assignmentError.code,
        message: assignmentError.message,
        details: assignmentError.details,
      });
      return NextResponse.json(
        {
          error: "Assignment not found",
          details: assignmentError.message,
          code: assignmentError.code,
        },
        { status: 404 }
      );
    }

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Verify user has permission to modify this assignment
    if (assignment.created_by !== user.id) {
      // Check if user is instructor or TA in the classroom
      const { data: membership } = await supabase
        .from("classroom_memberships")
        .select("role")
        .eq("classroom_id", assignment.classroom_id)
        .eq("user_id", user.id)
        .in("role", ["instructor", "ta"])
        .single();

      if (!membership) {
        return NextResponse.json(
          {
            error:
              "Permission denied: You can only modify assignments you created or in classrooms where you are an instructor/TA",
          },
          { status: 403 }
        );
      }
    }

    // Verify all nodes exist
    const { data: existingNodes, error: nodesError } = await supabase
      .from("map_nodes")
      .select("id")
      .in("id", node_ids);

    if (nodesError) {
      console.error("❌ Nodes verification error:", {
        nodeIds: node_ids,
        error: nodesError,
        code: nodesError.code,
        message: nodesError.message,
        details: nodesError.details,
      });
      return NextResponse.json(
        {
          error: "Failed to verify nodes",
          details: nodesError.message,
          code: nodesError.code,
        },
        { status: 400 }
      );
    }

    const existingNodeIds = existingNodes?.map((n) => n.id) || [];
    const missingNodes = node_ids.filter((id) => !existingNodeIds.includes(id));

    if (missingNodes.length > 0) {
      return NextResponse.json(
        {
          error: `Nodes not found: ${missingNodes.join(", ")}`,
          missing_nodes: missingNodes,
          existing_nodes: existingNodeIds,
        },
        { status: 400 }
      );
    }

    // Create assignment_nodes entries
    const assignmentNodes = node_ids.map((node_id, index) => ({
      assignment_id: assignmentId,
      node_id: node_id,
      sequence_order: index + 1,
      is_required: true, // Default to required
    }));

    console.log("🔗 Adding nodes to assignment:", {
      assignmentId,
      nodeCount: assignmentNodes.length,
      nodes: assignmentNodes,
    });

    const { data: insertedNodes, error } = await supabase
      .from("assignment_nodes")
      .insert(assignmentNodes)
      .select();

    if (error) {
      console.error("❌ Error adding nodes to assignment:", {
        assignmentId,
        nodeIds: node_ids,
        error: error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      // Provide specific error details
      let errorMessage = "Failed to add nodes to assignment";
      if (error.code === "23505") {
        errorMessage = "Some nodes are already assigned to this assignment";
      } else if (error.code === "23503") {
        errorMessage =
          "Foreign key constraint violation - invalid assignment or node ID";
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`;
      }

      return NextResponse.json(
        {
          error: errorMessage,
          database_error: {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          },
        },
        { status: 500 }
      );
    }

    console.log("✅ Successfully added nodes to assignment:", {
      assignmentId,
      nodesAdded: insertedNodes?.length || 0,
    });

    return NextResponse.json({
      success: true,
      nodes_added: insertedNodes?.length || 0,
      nodes: insertedNodes,
    });
  } catch (error) {
    console.error("❌ Error in assignment nodes API:", {
      error: error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
