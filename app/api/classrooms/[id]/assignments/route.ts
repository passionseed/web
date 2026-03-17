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
    let enrollmentCounts: Record<string, any> = {};
    let nodeCounts: Record<string, any> = {};

    if (assignmentIds.length > 0) {
      // ⚡ Bolt Optimization: Use Promise.all for concurrent fetching to avoid waterfalls
      const [
        { data: enrollments },
        { data: nodes }
      ] = await Promise.all([
        supabase
          .from("assignment_enrollments")
          .select("assignment_id, status")
          .in("assignment_id", assignmentIds),
        supabase
          .from("assignment_nodes")
          .select("assignment_id")
          .in("assignment_id", assignmentIds)
      ]);

      // ⚡ Bolt Optimization: Replace O(N^2) Array.find/reduce with O(N) hash map construction
      // Process enrollment data
      enrollmentCounts = (enrollments || []).reduce((acc: Record<string, any>, enrollment) => {
        const id = enrollment.assignment_id;
        if (!acc[id]) {
          acc[id] = { total_enrollments: 0, completed: 0, in_progress: 0, assigned: 0 };
        }
        acc[id].total_enrollments++;
        acc[id][enrollment.status] = (acc[id][enrollment.status] || 0) + 1;
        return acc;
      }, {});

      // Process node data
      nodeCounts = (nodes || []).reduce((acc: Record<string, any>, node) => {
        const id = node.assignment_id;
        if (!acc[id]) {
          acc[id] = { node_count: 0 };
        }
        acc[id].node_count++;
        return acc;
      }, {});
    }

    // Process assignments to add computed fields
    // ⚡ Bolt Optimization: Replace O(N*M) Array.find with O(1) hash map lookups
    const processedAssignments =
      assignments?.map((assignment: any) => {
        const enrollmentData = enrollmentCounts[assignment.id] || {};
        const nodeData = nodeCounts[assignment.id] || {};

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
