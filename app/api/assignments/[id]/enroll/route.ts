import { NextRequest, NextResponse } from "next/server";
import { assignToStudentsServer } from "@/lib/supabase/assignments";
import { getAssignmentProgressStats } from "@/lib/supabase/assignment-progress";
import { ClassroomError } from "@/types/classroom";

interface EnrollParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: EnrollParams) {
  try {
    const { id: assignmentId } = await params;
    const body = await request.json();

    const { student_ids, custom_due_dates } = body;

    const enrollments = await assignToStudentsServer(
      assignmentId,
      student_ids,
      custom_due_dates
    );

    return NextResponse.json(
      {
        success: true,
        data: enrollments,
        message: `Successfully enrolled ${enrollments.length} students`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Assignment enrollment error:", error);

    if (error instanceof ClassroomError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "AUTH_ERROR" ? 401 : 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to enroll students in assignment" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: EnrollParams) {
  try {
    const { id: assignmentId } = await params;

    const stats = await getAssignmentProgressStats(assignmentId);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Assignment stats error:", error);

    if (error instanceof ClassroomError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "AUTH_ERROR" ? 401 : 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch assignment statistics" },
      { status: 500 }
    );
  }
}
