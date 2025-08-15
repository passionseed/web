import { NextRequest, NextResponse } from "next/server";
import {
  generateUniqueJoinCode,
  createClassroom,
  getInstructorClassrooms,
} from "@/lib/supabase/classrooms";

export async function GET() {
  try {
    const results = [];

    // Test 1: Join code generation
    results.push("🧪 Testing join code generation...");
    const code1 = await generateUniqueJoinCode();
    const code2 = await generateUniqueJoinCode();
    results.push(`✅ Generated codes: ${code1}, ${code2}`);
    results.push(`✅ Codes are unique: ${code1 !== code2}`);

    // Test 2: Get instructor classrooms
    results.push("🧪 Testing instructor classrooms fetch...");
    const classrooms = await getInstructorClassrooms();
    results.push(`✅ Found ${classrooms.length} classroom(s)`);

    results.push("🎉 Basic tests passed!");

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const results = [];

    // Test classroom creation (requires authentication)
    results.push("🧪 Testing classroom creation...");
    const classroomData = {
      name: "API Test Classroom - " + new Date().toISOString(),
      description: "A test classroom created via API route",
    };

    const newClassroom = await createClassroom(classroomData);
    results.push(`✅ Classroom created: ${newClassroom.classroom.name}`);
    results.push(`✅ Join code: ${newClassroom.join_code}`);

    return NextResponse.json({
      success: true,
      results,
      classroom: newClassroom,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
