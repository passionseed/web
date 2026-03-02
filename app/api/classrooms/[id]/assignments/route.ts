import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: classroomId } = await params;

    // Verify user has access to this classroom
    const { data: membership } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", classroomId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get assignments for this classroom - simplified query first
    console.log("🔍 Fetching assignments for classroom:", classroomId);

    const { data: assignments, error } = await supabase
      .from("classroom_assignments")
      .select(
        `
        id,
        title,
        description,
        instructions,
        default_due_date,
        auto_assign,
        is_published,
        is_active,
        created_at,
        updated_at,
        created_by,
        source_map_id,
        map_context
      `
      )
      .eq("classroom_id", classroomId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching assignments:", error);
      return NextResponse.json(
        { error: "Failed to fetch assignments", details: error.message },
        { status: 500 }
      );
    }

    console.log("✅ Found assignments:", assignments?.length || 0);

    // Get additional data separately to avoid complex join issues
    const assignmentIds = assignments?.map((a) => a.id) || [];

    // Use O(1) Map lookups instead of O(N) array finds
    // ⚡ Bolt Performance Optimization: Changed array reduction to map for faster lookups
    let enrollmentCountsMap: Record<string, any> = {};
    let nodeCountsMap: Record<string, { node_count: number }> = {};

    if (assignmentIds.length > 0) {
      // Get enrollment counts and status
      const { data: enrollments } = await supabase
        .from("assignment_enrollments")
        .select("assignment_id, status")
        .in("assignment_id", assignmentIds);

      // Get node counts
      const { data: nodes } = await supabase
        .from("assignment_nodes")
        .select("assignment_id")
        .in("assignment_id", assignmentIds);

      // Process enrollment data into O(1) lookup map
      if (enrollments) {
        enrollmentCountsMap = enrollments.reduce((acc, enrollment) => {
          const aid = enrollment.assignment_id;
          if (!acc[aid]) {
            acc[aid] = {
              total_enrollments: 0,
              completed: 0,
              in_progress: 0,
              assigned: 0,
            };
          }
          acc[aid].total_enrollments++;
          acc[aid][enrollment.status] = (acc[aid][enrollment.status] || 0) + 1;
          return acc;
        }, {} as Record<string, any>);
      }

      // Process node data into O(1) lookup map
      if (nodes) {
        nodeCountsMap = nodes.reduce((acc, node) => {
          const aid = node.assignment_id;
          if (!acc[aid]) {
            acc[aid] = { node_count: 0 };
          }
          acc[aid].node_count++;
          return acc;
        }, {} as Record<string, { node_count: number }>);
      }
    }

    // Process assignments to add computed fields
    const processedAssignments =
      assignments?.map((assignment: any) => {
        const enrollmentData = enrollmentCountsMap[assignment.id] || {};
        const nodeData = nodeCountsMap[assignment.id] || {};

        return {
          ...assignment,
          _count: {
            assignment_nodes: nodeData.node_count || 0,
            assignment_enrollments: enrollmentData.total_enrollments || 0,
          },
          progress_stats: {
            total_students: enrollmentData.total_enrollments || 0,
            completed: enrollmentData.completed || 0,
            in_progress: enrollmentData.in_progress || 0,
            not_started: enrollmentData.assigned || 0,
          },
        };
      }) || [];

    return NextResponse.json(processedAssignments);
  } catch (error) {
    const { id: classroomId } = await params;
    console.error("Error fetching classroom assignments:", error);
    console.error("Classroom ID:", classroomId);
    console.error("Error details:", {
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
