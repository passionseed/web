import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔍 [Enrollments API] GET request started");

  try {
    const { id: assignmentId } = await params;

    console.log("📝 [Enrollments API] Request params:", {
      assignmentId,
      url: request.url,
    });

    if (!assignmentId) {
      console.error("❌ [Enrollments API] Missing assignment ID");
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

    console.log("🔐 [Enrollments API] Auth check:", {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message,
    });

    if (authError || !user) {
      console.error("❌ [Enrollments API] Authentication failed:", authError);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log("🎯 [Enrollments API] Verifying assignment access...");
    // Verify assignment exists and user has access
    const { data: assignment, error: assignmentError } = await supabase
      .from("classroom_assignments")
      .select(
        `
        id, 
        classroom_id,
        created_by,
        classroom:classroom_id (
          instructor_id,
          classroom_memberships!inner (
            user_id,
            role
          )
        )
      `
      )
      .eq("id", assignmentId)
      .eq("classroom.classroom_memberships.user_id", user.id)
      .single();

    console.log("📋 [Enrollments API] Assignment verification result:", {
      hasAssignment: !!assignment,
      assignmentError: assignmentError?.message,
      assignment: assignment
        ? {
            id: assignment.id,
            classroom_id: assignment.classroom_id,
            created_by: assignment.created_by,
          }
        : null,
    });

    if (assignmentError || !assignment) {
      console.error("❌ [Enrollments API] Assignment access denied:", {
        assignmentError,
        assignmentId,
        userId: user.id,
      });
      return NextResponse.json(
        { error: "Assignment not found or access denied" },
        { status: 404 }
      );
    }

    // Check if user is instructor/TA (can see all enrollments) or student (can see only their own)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classroomData = assignment.classroom as any;
    const membership = classroomData?.classroom_memberships?.[0];
    const canViewAll =
      membership?.role === "instructor" || membership?.role === "ta";

    console.log("👤 [Enrollments API] User permissions:", {
      membership: membership
        ? {
            role: membership.role,
            user_id: membership.user_id,
          }
        : null,
      canViewAll,
      classroomData: classroomData
        ? {
            instructor_id: classroomData.instructor_id,
            memberships_count: classroomData.classroom_memberships?.length || 0,
          }
        : null,
    });

    console.log("🎯 [Enrollments API] Fetching enrollments...");

    // First, get the basic enrollment data
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("assignment_enrollments")
      .select(
        `
        id,
        user_id,
        assignment_id,
        status,
        enrolled_at,
        due_date,
        completed_at,
        completion_percentage,
        notes
      `
      )
      .eq("assignment_id", assignmentId)
      .order("enrolled_at", { ascending: false });

    console.log("📊 [Enrollments API] Basic enrollments result:", {
      enrollmentsCount: enrollments?.length || 0,
      enrollmentsError: enrollmentsError?.message,
      hasEnrollments: !!enrollments,
      sampleEnrollment: enrollments?.[0]
        ? {
            id: enrollments[0].id,
            user_id: enrollments[0].user_id,
            status: enrollments[0].status,
          }
        : null,
    });

    if (enrollmentsError) {
      console.error("❌ [Enrollments API] Error fetching enrollments:", {
        error: enrollmentsError,
        assignmentId,
        userId: user.id,
        canViewAll,
      });
      return NextResponse.json(
        { error: "Failed to fetch enrollments" },
        { status: 500 }
      );
    }

    if (!enrollments || enrollments.length === 0) {
      console.log("📝 [Enrollments API] No enrollments found");
      return NextResponse.json({
        success: true,
        data: [],
        message: "No enrollments found for this assignment",
      });
    }

    // Get user IDs to fetch user data
    const userIds = enrollments.map((enrollment) => enrollment.user_id);
    console.log("👥 [Enrollments API] Fetching user data for IDs:", userIds);

    // Get user profiles from public.user_profiles table (which should have the user data)
    const { data: userProfiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select(
        `
        user_id,
        first_name,
        last_name,
        full_name,
        avatar_url,
        email
      `
      )
      .in("user_id", userIds);

    console.log("👤 [Enrollments API] User profiles result:", {
      profilesCount: userProfiles?.length || 0,
      profilesError: profilesError?.message,
      sampleProfile: userProfiles?.[0]
        ? {
            user_id: userProfiles[0].user_id,
            full_name: userProfiles[0].full_name,
            email: userProfiles[0].email,
          }
        : null,
    });

    // Combine enrollment and user data
    // ⚡ Bolt: Use Map for O(1) lookups instead of O(N) array.find() inside iterative methods
    const userProfilesMap = new Map(userProfiles?.map(profile => [profile.user_id, profile]) || []);
    const enrichedEnrollments = enrollments.map((enrollment) => {
      const userProfile = userProfilesMap.get(enrollment.user_id);
      return {
        ...enrollment,
        user: userProfile
          ? {
              id: userProfile.user_id,
              email: userProfile.email,
              full_name: userProfile.full_name,
              user_profiles: [userProfile],
            }
          : {
              id: enrollment.user_id,
              email: null,
              full_name: null,
              user_profiles: [],
            },
      };
    });

    // Apply access control - filter for student view
    let finalEnrollments = enrichedEnrollments;
    if (!canViewAll) {
      console.log("🔒 [Enrollments API] Applying student filter");
      finalEnrollments = enrichedEnrollments.filter(
        (enrollment) => enrollment.user_id === user.id
      );
    }

    console.log("✅ [Enrollments API] Final enrollments result:", {
      totalCount: enrichedEnrollments.length,
      filteredCount: finalEnrollments.length,
      canViewAll,
      sampleEnrollment: finalEnrollments[0]
        ? {
            id: finalEnrollments[0].id,
            user_id: finalEnrollments[0].user_id,
            status: finalEnrollments[0].status,
            user_full_name: finalEnrollments[0].user?.full_name,
          }
        : null,
    });

    return NextResponse.json({
      success: true,
      data: finalEnrollments,
      message: `Found ${finalEnrollments.length} enrollment(s)`,
    });
  } catch (error) {
    console.error("❌ [Enrollments API] Unexpected error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
