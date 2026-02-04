import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 Join classroom API called");

    // Log request details
    console.log("Request method:", request.method);
    console.log(
      "Request headers:",
      Object.fromEntries(request.headers.entries())
    );

    const supabase = await createClient();
    console.log("✅ Supabase client created");

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("User:", user?.id, user?.email);
    console.log("Auth error:", authError);

    if (authError || !user) {
      console.log("❌ Authentication failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
      console.log("Request body:", body);
    } catch (e) {
      console.log("❌ Failed to parse JSON body:", e);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { join_code } = body;

    if (!join_code || typeof join_code !== "string") {
      console.log("❌ Invalid join code:", join_code);
      return NextResponse.json(
        { error: "Join code is required" },
        { status: 400 }
      );
    }

    const cleanJoinCode = join_code.toUpperCase().trim();
    console.log("🔍 Looking for classroom with code:", cleanJoinCode);

    // Find classroom by join code
    const { data: classroom, error: classroomError } = await supabase
      .from("classrooms")
      .select("*")
      .eq("join_code", cleanJoinCode)
      .eq("is_active", true)
      .single();

    console.log("Found classroom:", classroom);
    console.log("Classroom error:", classroomError);

    if (classroomError || !classroom) {
      console.log("❌ Classroom not found");
      return NextResponse.json(
        { error: "Invalid join code or classroom is not active" },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from("classroom_memberships")
      .select("id, role")
      .eq("classroom_id", classroom.id)
      .eq("user_id", user.id)
      .single();

    console.log("Existing membership:", existingMembership);

    if (existingMembership) {
      console.log("⚠️ User already a member");
      return NextResponse.json(
        {
          error: "You are already a member of this classroom",
          classroom,
          membership: existingMembership,
        },
        { status: 409 }
      );
    }

    // Check classroom capacity
    const { count: currentStudents } = await supabase
      .from("classroom_memberships")
      .select("*", { count: "exact", head: true })
      .eq("classroom_id", classroom.id)
      .eq("role", "student");

    console.log(
      "Current students:",
      currentStudents,
      "Max:",
      classroom.max_students
    );

    if (currentStudents && currentStudents >= classroom.max_students) {
      console.log("❌ Classroom at capacity");
      return NextResponse.json(
        { error: "Classroom has reached maximum capacity" },
        { status: 409 }
      );
    }

    console.log(user.id, "Joining classroom:", classroom.id);

    // Add user to classroom as student
    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .insert({
        classroom_id: classroom.id,
        user_id: user.id,
        role: "student",
      })
      .select()
      .single();

    console.log("Created membership:", membership);
    console.log("Membership error:", membershipError);

    if (membershipError) {
      console.error("❌ Error creating membership:", membershipError);
      return NextResponse.json(
        { error: "Failed to join classroom" },
        { status: 500 }
      );
    }

    console.log("✅ Successfully joined classroom");
    return NextResponse.json({
      message: "Successfully joined classroom",
      classroom,
      membership,
    });
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Join classroom API is working" });
}
