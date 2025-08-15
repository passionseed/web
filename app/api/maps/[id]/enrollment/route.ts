import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔍 [Enrollment Check API] GET request started");

  try {
    const { id: mapId } = await params;

    console.log("📝 [Enrollment Check API] Request params:", {
      mapId,
    });

    // Initialize Supabase client and authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ [Enrollment Check API] Authentication failed:", {
        authError,
        hasUser: !!user,
      });
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log("✅ [Enrollment Check API] User authenticated:", {
      userId: user.id,
      email: user.email,
    });

    // Check if user is enrolled
    const { data: enrollment, error: checkError } = await supabase
      .from("user_map_enrollments")
      .select("*")
      .eq("user_id", user.id)
      .eq("map_id", mapId)
      .maybeSingle();

    if (checkError) {
      console.error("❌ [Enrollment Check API] Error checking enrollment:", checkError);
      return NextResponse.json(
        { error: "Failed to check enrollment status" },
        { status: 500 }
      );
    }

    const isEnrolled = !!enrollment;

    console.log("✅ [Enrollment Check API] Enrollment check result:", {
      isEnrolled,
      enrollment: enrollment ? "found" : "not found",
    });

    return NextResponse.json({
      success: true,
      data: {
        isEnrolled,
        enrollment,
      },
    });
  } catch (error) {
    console.error("❌ [Enrollment Check API] Error:", error);
    console.error("❌ [Enrollment Check API] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
      type: typeof error,
      constructor: error?.constructor?.name,
    });

    return NextResponse.json(
      { error: "Failed to check enrollment" },
      { status: 500 }
    );
  }
}
