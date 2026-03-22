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

    // Fetch user's classroom memberships
    const { data: memberships, error: membershipsError } = await supabase
      .from("classroom_memberships")
      .select("id, classroom_id, user_id, role, joined_at")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false });

    if (membershipsError) {
      console.error("=== CLASSROOM MEMBERSHIPS ERROR ===");
      console.error("Message:", membershipsError.message);
      console.error("Code:", membershipsError.code);
      console.error("Details:", membershipsError.details);
      console.error("Hint:", membershipsError.hint);
      console.error("Full error:", JSON.stringify(membershipsError, null, 2));
      return NextResponse.json(
        {
          error: "Failed to fetch classrooms",
          message: membershipsError.message,
          code: membershipsError.code,
          details: membershipsError.details,
          hint: membershipsError.hint
        },
        { status: 500 }
      );
    }

    // Manually fetch classroom details for each membership to avoid recursion/relationship errors
    const classroomIds = (memberships || []).map((m) => m.classroom_id);
    let classroomsMap: Record<string, any> = {};

    // Get member counts for all classrooms
    const memberCounts: Record<string, number> = {};
    const studentCounts: Record<string, number> = {};
    const instructorCounts: Record<string, number> = {};
    const taCounts: Record<string, number> = {};

    if (classroomIds.length > 0) {
      // ⚡ Bolt Optimization: Fetch classrooms and member counts concurrently to avoid waterfall
      const [
        { data: classroomsData, error: classroomsError },
        { data: countData }
      ] = await Promise.all([
        supabase
          .from("classrooms")
          .select(`
            id,
            name,
            description,
            instructor_id,
            join_code,
            max_students,
            is_active,
            created_at,
            updated_at
          `)
          .in("id", classroomIds),
        supabase
          .from("classroom_memberships")
          .select("classroom_id, role")
          .in("classroom_id", classroomIds)
      ]);

      if (classroomsError) {
        console.error("Error fetching classrooms details:", classroomsError);
        return NextResponse.json(
          { error: "Failed to fetch classroom details", details: classroomsError },
          { status: 500 }
        );
      }

      classroomsMap = (classroomsData || []).reduce((acc, classroom) => {
        acc[classroom.id] = classroom;
        return acc;
      }, {} as Record<string, any>);

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
    const transformedMemberships = (memberships || []).map((membership) => {
      const classroomDetails = classroomsMap[membership.classroom_id] || {};

      return {
        id: membership.id,
        classroom_id: membership.classroom_id,
        user_id: membership.user_id,
        role: membership.role,
        joined_at: membership.joined_at,
        classroom: {
          ...classroomDetails,
          member_count: memberCounts[membership.classroom_id] || 0,
          student_count: studentCounts[membership.classroom_id] || 0,
          instructor_count: instructorCounts[membership.classroom_id] || 0,
          ta_count: taCounts[membership.classroom_id] || 0,
        },
      };
    });

    return NextResponse.json(transformedMemberships);
  } catch (error) {
    console.error("Error in classrooms API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
