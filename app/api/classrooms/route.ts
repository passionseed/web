import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
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

    // Fetch user's classroom memberships with classroom details
    const { data: memberships, error: membershipsError } = await supabase
      .from("classroom_memberships")
      .select(
        `
        id,
        classroom_id,
        user_id,
        role,
        joined_at,
        classrooms (
          id,
          name,
          description,
          instructor_id,
          join_code,
          max_students,
          is_active,
          created_at,
          updated_at
        )
      `
      )
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false });

    if (membershipsError) {
      console.error("Error fetching classroom memberships:", membershipsError);
      return NextResponse.json(
        { error: "Failed to fetch classrooms" },
        { status: 500 }
      );
    }

    // Get member counts for all classrooms
    const classroomIds = (memberships || []).map((m) => m.classroom_id);

    const memberCounts: Record<string, number> = {};
    const studentCounts: Record<string, number> = {};
    const instructorCounts: Record<string, number> = {};
    const taCounts: Record<string, number> = {};

    if (classroomIds.length > 0) {
      // Get total member counts
      const { data: countData } = await supabase
        .from("classroom_memberships")
        .select("classroom_id, role")
        .in("classroom_id", classroomIds);

      if (countData) {
        countData.forEach((row) => {
          // Count all members
          memberCounts[row.classroom_id] = (memberCounts[row.classroom_id] || 0) + 1;

          // Count by role
          if (row.role === "student") {
            studentCounts[row.classroom_id] = (studentCounts[row.classroom_id] || 0) + 1;
          } else if (row.role === "instructor") {
            instructorCounts[row.classroom_id] = (instructorCounts[row.classroom_id] || 0) + 1;
          } else if (row.role === "ta") {
            taCounts[row.classroom_id] = (taCounts[row.classroom_id] || 0) + 1;
          }
        });
      }
    }

    // Transform the data to flatten the classroom object and add member counts
    const transformedMemberships = (memberships || []).map((membership) => ({
      id: membership.id,
      classroom_id: membership.classroom_id,
      user_id: membership.user_id,
      role: membership.role,
      joined_at: membership.joined_at,
      classroom: {
        ...membership.classrooms,
        member_count: memberCounts[membership.classroom_id] || 0,
        student_count: studentCounts[membership.classroom_id] || 0,
        instructor_count: instructorCounts[membership.classroom_id] || 0,
        ta_count: taCounts[membership.classroom_id] || 0,
      },
    }));

    return NextResponse.json(transformedMemberships);
  } catch (error) {
    console.error("Error in classrooms API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
