import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generateUniqueJoinCode } from "@/lib/supabase/classrooms";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const classroomId = params.id;

    // Verify user is instructor for this classroom
    const { data: membership } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", classroomId)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "instructor") {
      return NextResponse.json(
        { error: "Only instructors can regenerate join codes" },
        { status: 403 }
      );
    }

    // Generate a new unique join code
    const newJoinCode = await generateUniqueJoinCode();

    // Update the classroom with the new join code
    const { data: updatedClassroom, error: updateError } = await supabase
      .from("classrooms")
      .update({
        join_code: newJoinCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", classroomId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating join code:", updateError);
      return NextResponse.json(
        { error: "Failed to regenerate join code" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Join code regenerated successfully",
      join_code: newJoinCode,
      classroom: updatedClassroom,
    });
  } catch (error) {
    console.error("Error regenerating join code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
