import { NextResponse } from "next/server";
import { requireDebugAccess, safeServerError } from "@/lib/security/route-guards";

export async function GET() {
  const debug = await requireDebugAccess();
  if (!debug.ok) return debug.response;

  try {
    const { supabase, userId } = debug.value;

    const { data: existingClassrooms } = await supabase.from("classrooms").select("*").limit(1);

    if (!existingClassrooms || existingClassrooms.length === 0) {
      await supabase.from("classrooms").insert({
        name: "Test Classroom",
        description: "A test classroom for debugging",
        instructor_id: userId,
        join_code: "TEST01",
        max_students: 30,
        is_active: true,
      });
    }

    const { data: allClassrooms, error } = await supabase.from("classrooms").select("*");

    return NextResponse.json({
      classrooms: allClassrooms,
      error: error?.message ?? null,
    });
  } catch (error) {
    return safeServerError("Debug failed", error);
  }
}
