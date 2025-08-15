import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
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

    // Fetch user's classroom memberships with classroom details
    const { data: memberships, error: membershipsError } = await supabase
      .from("classroom_memberships")
      .select(
        `
        id,
        classroom_id,
        user_id,
        role,
        joined_at,
        classrooms (
          id,
          name,
          description,
          instructor_id,
          join_code,
          max_students,
          is_active,
          created_at,
          updated_at
        )
      `
      )
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false });

    if (membershipsError) {
      console.error("Error fetching classroom memberships:", membershipsError);
      return NextResponse.json(
        { error: "Failed to fetch classrooms" },
        { status: 500 }
      );
    }

    // Transform the data to flatten the classroom object
    const transformedMemberships = (memberships || []).map((membership) => ({
      id: membership.id,
      classroom_id: membership.classroom_id,
      user_id: membership.user_id,
      role: membership.role,
      joined_at: membership.joined_at,
      classroom: membership.classrooms,
    }));

    return NextResponse.json(transformedMemberships);
  } catch (error) {
    console.error("Error in classrooms API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
