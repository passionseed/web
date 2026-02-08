import { NextResponse } from "next/server";
import {
  generateUniqueJoinCode,
  createClassroom,
  getInstructorClassrooms,
} from "@/lib/supabase/classrooms";
import { requireDebugAccess, safeServerError } from "@/lib/security/route-guards";

export async function GET() {
  const debug = await requireDebugAccess();
  if (!debug.ok) return debug.response;

  try {
    const code1 = await generateUniqueJoinCode();
    const code2 = await generateUniqueJoinCode();
    const classrooms = await getInstructorClassrooms();

    return NextResponse.json({
      success: true,
      joinCodesUnique: code1 !== code2,
      classroomCount: classrooms.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return safeServerError("Test failed", error);
  }
}

export async function POST() {
  const debug = await requireDebugAccess();
  if (!debug.ok) return debug.response;

  try {
    const classroomData = {
      name: `API Test Classroom - ${new Date().toISOString()}`,
      description: "A test classroom created via API route",
    };

    const newClassroom = await createClassroom(classroomData);

    return NextResponse.json({
      success: true,
      classroomId: newClassroom.classroom.id,
      joinCode: newClassroom.join_code,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return safeServerError("Test failed", error);
  }
}
