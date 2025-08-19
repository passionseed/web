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

    // Get all students in the classroom with their user data
    const { data: students, error: studentsError } = await supabase
      .from("classroom_memberships")
      .select(
        `
        id,
        user_id,
        joined_at
      `
      )
      .eq("classroom_id", classroomId)
      .eq("role", "student")
      .order("joined_at", { ascending: false });

    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      return NextResponse.json(
        { error: "Failed to fetch students" },
        { status: 500 }
      );
    }

    // Get user details from profiles table
    const userIds = students?.map((s) => s.user_id) || [];
    let usersData: any[] = [];

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return NextResponse.json(
          { error: "Failed to fetch user profiles" },
          { status: 500 }
        );
      }
      usersData = profiles || [];
    }

    // Combine student data with profile information
    const studentsWithProfiles =
      students?.map((student) => {
        const userInfo = usersData.find((user) => user.id === student.user_id);
        return {
          ...student,
          user: userInfo
            ? {
                id: userInfo.id,
                email: userInfo.email || "Unknown",
                full_name: userInfo.full_name || null,
                avatar_url: userInfo.avatar_url || null,
              }
            : {
                id: student.user_id,
                email: "Unknown",
                full_name: null,
                avatar_url: null,
              },
        };
      }) || [];

    return NextResponse.json(studentsWithProfiles);
  } catch (error) {
    console.error("Error fetching classroom students:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const { searchParams } = new URL(request.url);
    const studentUserId = searchParams.get("student_id");

    if (!studentUserId) {
      return NextResponse.json(
        { error: "Student ID required" },
        { status: 400 }
      );
    }

    // Verify user is instructor or TA for this classroom
    const { data: membership } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", classroomId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["instructor", "ta"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Remove student from classroom
    const { error: removeError } = await supabase
      .from("classroom_memberships")
      .delete()
      .eq("classroom_id", classroomId)
      .eq("user_id", studentUserId)
      .eq("role", "student");

    if (removeError) {
      console.error("Error removing student:", removeError);
      return NextResponse.json(
        { error: "Failed to remove student" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Student removed successfully" });
  } catch (error) {
    console.error("Error removing student:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
