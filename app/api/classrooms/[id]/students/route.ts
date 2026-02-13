import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type ClassroomRole = "student" | "ta" | "instructor";

interface AccessResult {
  hasAccess: boolean;
  canManageStudents: boolean;
}

interface StudentProfile {
  id: string;
  username: string | null;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

const getClassroomAccess = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  classroomId: string,
  userId: string
): Promise<AccessResult> => {
  const { data: membership } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", classroomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membership) {
    const role = membership.role as ClassroomRole;
    const canManageStudents =
      role === "instructor" || role === "ta";
    return { hasAccess: true, canManageStudents };
  }

  // Fallback: support legacy classrooms where owner isn't present in memberships.
  const { data: classroom } = await supabase
    .from("classrooms")
    .select("instructor_id")
    .eq("id", classroomId)
    .maybeSingle();

  const isOwner = classroom?.instructor_id === userId;
  return {
    hasAccess: isOwner,
    canManageStudents: isOwner,
  };
};

const getProfilesWithFallback = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[]
): Promise<StudentProfile[]> => {
  if (userIds.length === 0) return [];

  const profileMap = new Map<string, StudentProfile>();

  // 1) Try with request-scoped client first (respects current policies).
  const { data: visibleProfiles, error: visibleProfilesError } = await supabase
    .from("profiles")
    .select("id, username, email, full_name, avatar_url")
    .in("id", userIds);

  if (visibleProfilesError) {
    console.warn(
      "[classroom students] profile query failed with user client:",
      visibleProfilesError.message
    );
  } else {
    (visibleProfiles || []).forEach((profile) => {
      profileMap.set(profile.id, profile);
    });
  }

  const missingIds = userIds.filter((id) => !profileMap.has(id));
  if (missingIds.length === 0) {
    return Array.from(profileMap.values());
  }

  // 2) Fallback to admin client for missing rows only.
  try {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const adminSupabase = createAdminClient();

    const { data: adminProfiles, error: adminProfilesError } = await adminSupabase
      .from("profiles")
      .select("id, username, email, full_name, avatar_url")
      .in("id", missingIds);

    if (adminProfilesError) {
      console.warn(
        "[classroom students] admin profile query failed:",
        adminProfilesError.message
      );
    } else {
      (adminProfiles || []).forEach((profile) => {
        profileMap.set(profile.id, profile);
      });
    }

    const stillMissingIds = missingIds.filter((id) => !profileMap.has(id));
    if (stillMissingIds.length > 0) {
      const authUsers = await Promise.all(
        stillMissingIds.map(async (id) => {
          const { data, error } = await adminSupabase.auth.admin.getUserById(id);
          if (error || !data?.user) return null;

          const authUser = data.user;
          const username =
            (authUser.user_metadata?.username as string | undefined) ||
            authUser.email?.split("@")[0] ||
            `user_${id.slice(0, 8)}`;

          return {
            id,
            username,
            email: authUser.email || null,
            full_name:
              (authUser.user_metadata?.full_name as string | undefined) ||
              (authUser.user_metadata?.name as string | undefined) ||
              null,
            avatar_url:
              (authUser.user_metadata?.avatar_url as string | undefined) || null,
          } satisfies StudentProfile;
        })
      );

      authUsers.filter(Boolean).forEach((profile) => {
        if (profile) profileMap.set(profile.id, profile);
      });
    }
  } catch (error) {
    // Keep API functional even if service role credentials are unavailable.
    console.warn("[classroom students] admin fallback unavailable:", error);
  }

  return Array.from(profileMap.values());
};

export async function GET(
  _request: NextRequest,
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

    const access = await getClassroomAccess(supabase, classroomId, user.id);
    if (!access.hasAccess) {
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

    // Get user details from profiles table and auth.users as fallback
    const userIds = students?.map((s) => s.user_id) || [];
    const usersData = await getProfilesWithFallback(supabase, userIds);

    // Combine student data with profile information
    const studentsWithProfiles =
      students?.map((student) => {
        const userInfo = usersData.find((user) => user.id === student.user_id);

        return {
          ...student,
          user: userInfo
            ? {
                id: userInfo.id,
                username:
                  userInfo.username || `user_${student.user_id.substring(0, 8)}`,
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

    const access = await getClassroomAccess(supabase, classroomId, user.id);
    if (!access.canManageStudents) {
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
