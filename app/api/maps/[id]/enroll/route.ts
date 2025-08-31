import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🎯 [Enroll API] POST request started");

  try {
    const { id: mapId } = await params;

    console.log("📝 [Enroll API] Request params:", {
      mapId,
    });

    // Initialize Supabase client and authenticate
    const supabase = await createClient();
    console.log("🔑 [Enroll API] Supabase client created");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ [Enroll API] Authentication failed:", {
        authError: authError?.message || authError,
        hasUser: !!user,
        userAgent: request.headers.get('user-agent'),
        origin: request.headers.get('origin'),
      });
      return NextResponse.json(
        { 
          success: false,
          error: "Authentication required", 
          message: "Please log in to enroll in maps",
          details: authError?.message || "No user session found"
        },
        { status: 401 }
      );
    }

    console.log("✅ [Enroll API] User authenticated:", {
      userId: user.id,
      email: user.email,
    });

    // Check if user is already enrolled
    const { data: existingEnrollment, error: checkError } = await supabase
      .from("user_map_enrollments")
      .select("*")
      .eq("user_id", user.id)
      .eq("map_id", mapId)
      .maybeSingle();

    if (checkError) {
      console.error(
        "❌ [Enroll API] Error checking existing enrollment:",
        {
          error: checkError,
          message: checkError.message,
          code: checkError.code,
          details: checkError.details,
          hint: checkError.hint,
        }
      );
      return NextResponse.json(
        { 
          success: false,
          error: "Failed to check enrollment status",
          message: "Database error while checking enrollment",
          details: checkError.message || "Unknown database error"
        },
        { status: 500 }
      );
    }

    if (existingEnrollment) {
      console.log("ℹ️ [Enroll API] User already enrolled");
      return NextResponse.json({
        success: true,
        data: existingEnrollment,
        message: "Already enrolled in this map",
      });
    }

    // Create new enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from("user_map_enrollments")
      .insert({
        user_id: user.id,
        map_id: mapId,
        status: "active",
        enrolled_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (enrollError || !enrollment) {
      console.error(
        "❌ [Enroll API] Failed to create enrollment:",
        {
          error: enrollError,
          message: enrollError?.message,
          code: enrollError?.code,
          details: enrollError?.details,
          hint: enrollError?.hint,
          mapId,
          userId: user.id,
        }
      );
      return NextResponse.json(
        { 
          success: false,
          error: "Failed to enroll in map",
          message: "Database error while creating enrollment",
          details: enrollError?.message || "Could not create enrollment record"
        },
        { status: 500 }
      );
    }

    console.log("✅ [Enroll API] Enrollment created:", enrollment);

    return NextResponse.json({
      success: true,
      data: enrollment,
      message: "Successfully enrolled in map",
    });
  } catch (error) {
    console.error("❌ [Enroll API] Error:", error);
    console.error("❌ [Enroll API] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
      type: typeof error,
      constructor: error?.constructor?.name,
    });

    return NextResponse.json(
      { error: "Failed to enroll in map" },
      { status: 500 }
    );
  }
}
