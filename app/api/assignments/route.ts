import { NextRequest, NextResponse } from "next/server";
import {
  createAssignmentServer,
  addNodesToAssignment,
  assignToStudents,
  getClassroomAssignments,
  updateAssignment,
  deleteAssignmentServer,
} from "@/lib/supabase/assignments";
import { ClassroomError } from "@/types/classroom";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get("classroom_id");

    if (!classroomId) {
      return NextResponse.json(
        { error: "classroom_id parameter is required" },
        { status: 400 }
      );
    }

    const assignments = await getClassroomAssignments(classroomId);

    return NextResponse.json({
      success: true,
      data: assignments,
      count: assignments.length,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120'
      }
    });
  } catch (error) {
    console.error("Get assignments error:", error);

    if (error instanceof ClassroomError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "AUTH_ERROR" ? 401 : 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle both the new modal format and the existing format
    const { classroom_id, title, node_ids, student_ids } = body;

    if (!classroom_id || !title) {
      return NextResponse.json(
        { error: "classroom_id and title are required" },
        { status: 400 }
      );
    }

    // If this is a simple assignment creation (from the modal)
    if (!node_ids && !student_ids) {
      const assignmentResult = await createAssignmentServer({
        classroom_id,
        title,
        description: body.description,
        instructions: body.instructions,
        default_due_date: body.default_due_date,
        auto_assign: body.auto_assign || false,
      });

      return NextResponse.json(assignmentResult.assignment, { status: 201 });
    }

    // Handle the existing full assignment creation format
    if (!Array.isArray(node_ids) || node_ids.length === 0) {
      return NextResponse.json(
        { error: "node_ids array is required for full assignment creation" },
        { status: 400 }
      );
    }

    // Step 1: Create the assignment
    const assignmentResult = await createAssignmentServer({
      classroom_id,
      title,
      description: body.description,
      instructions: body.instructions,
      default_due_date: body.default_due_date,
      auto_assign: body.auto_assign || false,
      node_ids, // This will be used in the next steps
      student_ids: body.student_ids,
      custom_due_dates: body.custom_due_dates,
    });

    const assignmentId = assignmentResult.assignment.id;

    // Step 2: Add nodes to the assignment
    const addedNodes = await addNodesToAssignment(
      assignmentId,
      node_ids,
      body.sequence_order
    );

    // Step 3: Assign to students
    const enrollments = await assignToStudents(
      assignmentId,
      body.student_ids,
      body.custom_due_dates
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          assignment: assignmentResult.assignment,
          nodes_added: addedNodes.length,
          students_enrolled: enrollments.length,
          nodes: addedNodes,
          enrollments,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create assignment error:", error);

    if (error instanceof ClassroomError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "AUTH_ERROR" ? 401 : 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const { assignment_id, ...updateData } = body;

    if (!assignment_id) {
      return NextResponse.json(
        { error: "assignment_id is required" },
        { status: 400 }
      );
    }

    const updatedAssignment = await updateAssignment(assignment_id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedAssignment,
    });
  } catch (error) {
    console.error("Update assignment error:", error);

    if (error instanceof ClassroomError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "AUTH_ERROR" ? 401 : 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update assignment" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignment_id");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignment_id parameter is required" },
        { status: 400 }
      );
    }

    await deleteAssignmentServer(assignmentId);

    return NextResponse.json({
      success: true,
      message: "Assignment deleted successfully",
    });
  } catch (error) {
    console.error("Delete assignment error:", error);

    if (error instanceof ClassroomError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "AUTH_ERROR" ? 401 : 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete assignment" },
      { status: 500 }
    );
  }
}
