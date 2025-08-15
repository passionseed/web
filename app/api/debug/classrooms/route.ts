import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Create test classroom if none exists
    const { data: existingClassrooms } = await supabase
      .from("classrooms")
      .select("*")
      .limit(1);

    if (!existingClassrooms || existingClassrooms.length === 0) {
      console.log("Creating test classroom...");

      // Get current user to be instructor
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: classroom, error } = await supabase
          .from("classrooms")
          .insert({
            name: "Test Classroom",
            description: "A test classroom for debugging",
            instructor_id: user.id,
            join_code: "TEST01",
            max_students: 30,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating test classroom:", error);
        } else {
          console.log("Created test classroom:", classroom);
        }
      }
    }

    // Get all classrooms for debugging
    const { data: allClassrooms, error } = await supabase
      .from("classrooms")
      .select("*");

    return NextResponse.json({
      classrooms: allClassrooms,
      error: error?.message,
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({ error: "Debug failed" }, { status: 500 });
  }
}
