import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔍 [Progress API] GET request started");

  try {
    const { id: assignmentId } = await params;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    const enrollmentId = searchParams.get("enrollment_id");

    console.log("📝 [Progress API] Request params:", {
      assignmentId,
      studentId,
      enrollmentId,
      url: request.url,
    });

    // Initialize Supabase client and authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ [Progress API] Authentication failed:", {
        authError,
        hasUser: !!user,
      });
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log("✅ [Progress API] User authenticated:", {
      userId: user.id,
      email: user.email,
    });

    if (enrollmentId) {
      console.log(
        "🎯 [Progress API] Fetching progress for enrollment:",
        enrollmentId
      );

      // Get progress for a specific enrollment - implement directly here
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("assignment_enrollments")
        .select("*")
        .eq("id", enrollmentId)
        .single();

      if (enrollmentError || !enrollment) {
        console.error(
          "❌ [Progress API] Enrollment not found:",
          enrollmentError
        );
        return NextResponse.json(
          { error: "Enrollment not found" },
          { status: 404 }
        );
      }

      // Calculate progress for this enrollment
      const { data: nodeProgress, error: progressError } = await supabase
        .from("student_node_progress")
        .select("*")
        .eq("enrollment_id", enrollmentId);

      if (progressError) {
        console.error(
          "❌ [Progress API] Error fetching node progress:",
          progressError
        );
        return NextResponse.json(
          { error: "Failed to fetch progress" },
          { status: 500 }
        );
      }

      const totalNodes = await supabase
        .from("assignment_nodes")
        .select("id", { count: "exact" })
        .eq("assignment_id", assignmentId);

      const progress = {
        enrollment,
        total_nodes: totalNodes.count || 0,
        completed_nodes:
          nodeProgress?.filter((p) => p.status === "passed").length || 0,
        node_progress: nodeProgress || [],
      };

      console.log("✅ [Progress API] Enrollment progress result:", progress);
      return NextResponse.json({
        success: true,
        data: progress,
      });
    } else {
      console.log("🎯 [Progress API] Fetching student assignment progress:", {
        assignmentId,
        studentId: studentId || "current user",
        userId: user.id,
      });

      const targetStudentId = studentId || user.id;

      // Get enrollment for this student and assignment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("assignment_enrollments")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("user_id", targetStudentId)
        .single();

      if (enrollmentError || !enrollment) {
        console.error(
          "❌ [Progress API] No enrollment found:",
          enrollmentError
        );
        return NextResponse.json(
          { error: "Student not enrolled in this assignment" },
          { status: 404 }
        );
      }

      // Get node progress for this enrollment
      const { data: nodeProgress, error: progressError } = await supabase
        .from("student_node_progress")
        .select("*")
        .eq("enrollment_id", enrollment.id);

      if (progressError) {
        console.error(
          "❌ [Progress API] Error fetching progress:",
          progressError
        );
        return NextResponse.json(
          { error: "Failed to fetch progress data" },
          { status: 500 }
        );
      }

      // Get total nodes count
      const { count: totalNodes, error: countError } = await supabase
        .from("assignment_nodes")
        .select("id", { count: "exact" })
        .eq("assignment_id", assignmentId);

      if (countError) {
        console.error("❌ [Progress API] Error counting nodes:", countError);
        return NextResponse.json(
          { error: "Failed to count assignment nodes" },
          { status: 500 }
        );
      }

      const completedNodes =
        nodeProgress?.filter((p) => p.status === "passed").length || 0;
      const progressPercentage = totalNodes
        ? Math.round((completedNodes / totalNodes) * 100)
        : 0;

      const progress = {
        enrollment,
        progress: {
          total_nodes: totalNodes || 0,
          completed_nodes: completedNodes,
          progress_percentage: progressPercentage,
          current_status: enrollment.status,
        },
        node_progress: nodeProgress || [],
      };

      console.log("✅ [Progress API] Student progress result:", progress);
      return NextResponse.json({
        success: true,
        data: progress,
      });
    }
  } catch (error) {
    console.error("❌ [Progress API] Assignment progress error:", error);
    console.error("❌ [Progress API] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
      type: typeof error,
      constructor: error?.constructor?.name,
    });

    return NextResponse.json(
      { error: "Failed to fetch assignment progress" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔄 [Progress API] PUT request started");

  try {
    const { id: assignmentId } = await params;
    const body = await request.json();
    const { enrollment_id, status, completed_at } = body;

    console.log("📝 [Progress API] PUT request data:", {
      assignmentId,
      body,
      enrollment_id,
      status,
      completed_at,
    });

    if (!enrollment_id || !status) {
      console.error("❌ [Progress API] Missing required fields:", {
        enrollment_id: !!enrollment_id,
        status: !!status,
      });
      return NextResponse.json(
        { error: "enrollment_id and status are required" },
        { status: 400 }
      );
    }

    console.log("🎯 [Progress API] Updating assignment status:", {
      enrollment_id,
      status,
      completed_at,
    });

    // Initialize Supabase client and authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ [Progress API] Authentication failed:", authError);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Update the enrollment status
    const { data: updatedEnrollment, error: updateError } = await supabase
      .from("assignment_enrollments")
      .update({
        status,
        completed_at: completed_at || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", enrollment_id)
      .select("*")
      .single();

    if (updateError || !updatedEnrollment) {
      console.error(
        "❌ [Progress API] Failed to update enrollment:",
        updateError
      );
      return NextResponse.json(
        { error: "Failed to update assignment status" },
        { status: 500 }
      );
    }

    console.log("✅ [Progress API] Status update result:", updatedEnrollment);

    return NextResponse.json({
      success: true,
      data: updatedEnrollment,
      message: `Assignment status updated to ${status}`,
    });
  } catch (error) {
    console.error("❌ [Progress API] Update assignment status error:", error);
    console.error("❌ [Progress API] PUT Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
      type: typeof error,
      constructor: error?.constructor?.name,
    });

    return NextResponse.json(
      { error: "Failed to update assignment status" },
      { status: 500 }
    );
  }
}
