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

    // Verify user profile exists (required for foreign key)
    const { data: profileExists, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (profileError || !profileExists) {
      console.error("❌ [Enroll API] User profile not found:", {
        userId: user.id,
        error: profileError
      });
      return NextResponse.json(
        { 
          success: false,
          error: "User profile not found",
          message: "User profile must exist to enroll in maps",
          details: profileError?.message || "Profile not found in database"
        },
        { status: 400 }
      );
    }

    // Verify the map exists first
    const { data: mapExists, error: mapError } = await supabase
      .from("learning_maps")
      .select("id")
      .eq("id", mapId)
      .single();

    if (mapError || !mapExists) {
      console.error("❌ [Enroll API] Map not found:", {
        mapId,
        error: mapError
      });
      return NextResponse.json(
        { 
          success: false,
          error: "Map not found",
          message: "The specified learning map does not exist",
          details: mapError?.message || "Map ID not found"
        },
        { status: 404 }
      );
    }

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

    // Debug: Check current authentication context
    const { data: debugAuth } = await supabase.auth.getUser();
    console.log("🔍 [Enroll API] Authentication context check:", {
      authUserId: debugAuth.user?.id,
      requestUserId: user.id,
      isMatch: debugAuth.user?.id === user.id
    });

    // Create new enrollment
    const enrollmentData = {
      user_id: user.id,
      map_id: mapId,
      status: "active",
      enrolled_at: new Date().toISOString(),
    };

    console.log("📝 [Enroll API] Attempting to insert enrollment:", enrollmentData);

    const { data: enrollment, error: enrollError } = await supabase
      .from("user_map_enrollments")
      .insert(enrollmentData)
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
      { 
        success: false,
        error: "Failed to enroll in map",
        message: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown server error"
      },
      { status: 500 }
    );
  }
}
