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
      .select("id, username, email")
      .eq("id", user.id)
      .single();

    if (profileError || !profileExists) {
      console.error("❌ [Enroll API] User profile not found:", {
        userId: user.id,
        userEmail: user.email,
        error: profileError,
        errorCode: profileError?.code,
        errorMessage: profileError?.message
      });
      return NextResponse.json(
        { 
          success: false,
          error: "User profile not found",
          message: "User profile must exist to enroll in maps. Please complete your profile setup.",
          details: profileError?.message || "Profile not found in database",
          userId: user.id
        },
        { status: 400 }
      );
    }

    console.log("✅ [Enroll API] User profile verified:", {
      userId: user.id,
      username: profileExists.username,
      email: profileExists.email
    });

    // Verify the map exists first
    const { data: mapExists, error: mapError } = await supabase
      .from("learning_maps")
      .select("id, title")
      .eq("id", mapId)
      .single();

    if (mapError || !mapExists) {
      console.error("❌ [Enroll API] Map not found:", {
        mapId,
        mapIdType: typeof mapId,
        error: mapError,
        errorCode: mapError?.code,
        errorMessage: mapError?.message
      });
      return NextResponse.json(
        { 
          success: false,
          error: "Map not found",
          message: "The specified learning map does not exist",
          details: mapError?.message || "Map ID not found",
          mapId: mapId
        },
        { status: 404 }
      );
    }

    console.log("✅ [Enroll API] Map verified:", {
      mapId,
      mapTitle: mapExists.title
    });

    // Create or return existing enrollment (using upsert for atomic operation)
    const enrollmentData = {
      user_id: user.id,
      map_id: mapId,
      status: "active",
      enrolled_at: new Date().toISOString(),
    };

    console.log("📝 [Enroll API] Attempting to upsert enrollment:", enrollmentData);

    const { data: enrollment, error: enrollError } = await supabase
      .from("user_map_enrollments")
      .upsert(enrollmentData, {
        onConflict: "user_id,map_id",
        ignoreDuplicates: false,
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

    console.log("✅ [Enroll API] Enrollment created/retrieved:", enrollment);

    // Check if this was a new enrollment or existing one
    const wasNewEnrollment = new Date(enrollment.enrolled_at).getTime() > Date.now() - 5000;

    return NextResponse.json({
      success: true,
      data: enrollment,
      message: wasNewEnrollment
        ? "Successfully enrolled in map"
        : "Already enrolled in this map",
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
