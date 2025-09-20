import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🚀🚀🚀 [SERVER] STUDENTS API CALLED! 🚀🚀🚀");
  console.log("⭐ [SERVER] Request URL:", request.url);
  console.log("⭐ [SERVER] Request headers:", Object.fromEntries(request.headers.entries()));
  
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

    console.log("🏫 [DEBUG] User membership:", membership);
    
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

    console.log("👥 [DEBUG] Raw students from classroom_memberships:", JSON.stringify(students, null, 2));

    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      return NextResponse.json(
        { error: "Failed to fetch students" },
        { status: 500 }
      );
    }

    // Get user details from profiles table and auth.users as fallback
    const userIds = students?.map((s) => s.user_id) || [];
    let usersData: any[] = [];

    if (userIds.length > 0) {
      console.log("🔍 [DEBUG] Fetching profiles for user IDs:", userIds);
      
      // First try to get from profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, email, full_name, avatar_url")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return NextResponse.json(
          { error: "Failed to fetch user profiles" },
          { status: 500 }
        );
      }
      
      console.log("📊 [DEBUG] Profiles fetched:", JSON.stringify(profiles, null, 2));
      
      // For users without profiles, get data from auth.users as fallback
      const profileUserIds = (profiles || []).map(p => p.id);
      const missingProfileUserIds = userIds.filter(id => !profileUserIds.includes(id));
      
      console.log("🔍 [DEBUG] Users missing profiles:", missingProfileUserIds);
      
      let authUsersData: any[] = [];
      if (missingProfileUserIds.length > 0) {
        console.log("🔄 [DEBUG] Creating fallback data for missing profiles...");
        
        // Since auth admin access is restricted, create basic fallback profiles
        authUsersData = missingProfileUserIds.map(userId => ({
          id: userId,
          username: `user_${userId.substring(0, 8)}`,
          email: "Email not available",
          full_name: null,
          avatar_url: null
        }));
        
        console.log("👤 [DEBUG] Generated fallback data:", JSON.stringify(authUsersData, null, 2));
        
        // TODO: Consider creating actual profile records for these users
        console.log("⚠️ [DEBUG] Missing profiles detected for users:", missingProfileUserIds);
        console.log("💡 [DEBUG] Consider running profile creation for these users");
      }
      
      // Combine profiles and auth users data
      usersData = [...(profiles || []), ...authUsersData];
      console.log("🔗 [DEBUG] Combined user data:", JSON.stringify(usersData, null, 2));
    }

    // Combine student data with profile information
    const studentsWithProfiles =
      students?.map((student) => {
        const userInfo = usersData.find((user) => user.id === student.user_id);
        console.log(`🔗 [DEBUG] Mapping student ${student.user_id}:`, {
          student,
          userInfo,
          found: !!userInfo,
          hasUsername: !!userInfo?.username,
          hasEmail: !!userInfo?.email,
          profileLookupSuccess: userInfo ? 'SUCCESS' : 'FAILED - NO PROFILE FOUND'
        });
        
        const mappedStudent = {
          ...student,
          user: userInfo
            ? {
                id: userInfo.id,
                username: userInfo.username || `user_${student.user_id.substring(0, 8)}`,
                email: userInfo.email || "No email available",
                full_name: userInfo.full_name || null,
                avatar_url: userInfo.avatar_url || null,
              }
            : {
                id: student.user_id,
                username: `user_${student.user_id.substring(0, 8)}`,
                email: "No email available",
                full_name: null,
                avatar_url: null,
              },
        };
        
        console.log(`✅ [DEBUG] Final mapped student:`, mappedStudent);
        return mappedStudent;
      }) || [];

    console.log("🎯 [DEBUG] Final response being sent:", JSON.stringify(studentsWithProfiles, null, 2));

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
