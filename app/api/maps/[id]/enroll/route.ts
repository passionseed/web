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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ [Enroll API] Authentication failed:", {
        authError,
        hasUser: !!user,
      });
      return NextResponse.json(
        { error: "Authentication required" },
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
        checkError
      );
      return NextResponse.json(
        { error: "Failed to check enrollment status" },
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
        enrollError
      );
      return NextResponse.json(
        { error: "Failed to enroll in map" },
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
