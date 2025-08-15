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

    // Get total students count
    const { count: totalStudents } = await supabase
      .from("classroom_memberships")
      .select("*", { count: "exact", head: true })
      .eq("classroom_id", classroomId)
      .eq("role", "student");

    // Get active assignments count
    const { count: activeAssignments } = await supabase
      .from("classroom_assignments")
      .select("*", { count: "exact", head: true })
      .eq("classroom_id", classroomId)
      .eq("is_active", true);

    // Get completion statistics
    const { data: progressData } = await supabase
      .from("assignment_enrollments")
      .select(
        `
        status,
        classroom_assignments!inner(classroom_id)
      `
      )
      .eq("classroom_assignments.classroom_id", classroomId);

    // Calculate completion rate
    const totalEnrollments = progressData?.length || 0;
    const completedEnrollments =
      progressData?.filter((p) => p.status === "completed").length || 0;
    const completionRate =
      totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 0;

    // Calculate average progress (this is a simplified calculation)
    // In a real implementation, you'd want to calculate this based on node completion
    const inProgressEnrollments =
      progressData?.filter((p) => p.status === "in_progress").length || 0;
    const averageProgress =
      totalEnrollments > 0
        ? Math.round(
            (completedEnrollments * 100 + inProgressEnrollments * 50) /
              totalEnrollments
          )
        : 0;

    const stats = {
      totalStudents: totalStudents || 0,
      activeAssignments: activeAssignments || 0,
      completionRate,
      averageProgress,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching classroom stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
