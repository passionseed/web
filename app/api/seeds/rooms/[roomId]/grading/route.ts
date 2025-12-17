import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { submission_id, grade, points_awarded, comments } = body;

    const supabase = await createClient();

    // Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Check if user is the mentor of this room
    const { data: room, error: roomError } = await supabase
      .from("seed_rooms")
      .select("mentor_id")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.mentor_id !== user.id) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Get submission and assessment details to validate points
    const { data: submission, error: submissionError } = await supabase
      .from("assessment_submissions")
      .select(`
        id,
        assessment_id,
        node_assessments(
          id,
          points_possible
        )
      `)
      .eq("id", submission_id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Validate points if provided
    const maxPoints = submission.node_assessments?.points_possible;
    if (points_awarded !== null && maxPoints !== null) {
      if (points_awarded > maxPoints) {
        return NextResponse.json({
          error: `Points awarded (${points_awarded}) cannot exceed maximum (${maxPoints})`
        }, { status: 400 });
      }
      if (points_awarded < 0) {
        return NextResponse.json({
          error: "Points awarded cannot be negative"
        }, { status: 400 });
      }
    }

    // Check for existing grade
    const { data: existingGrade, error: gradeCheckError } = await supabase
      .from("submission_grades")
      .select("id")
      .eq("submission_id", submission_id)
      .single();

    if (gradeCheckError && gradeCheckError.code !== 'PGRST116') {
      return NextResponse.json({
        error: "Failed to check existing grade",
        details: gradeCheckError.message
      }, { status: 500 });
    }

    // Insert or update grade
    if (existingGrade) {
      const { error: updateError } = await supabase
        .from("submission_grades")
        .update({
          grade,
          points_awarded,
          comments,
          graded_at: new Date().toISOString(),
          graded_by: user.id
        })
        .eq("id", existingGrade.id);

      if (updateError) {
        return NextResponse.json({
          error: "Failed to update grade",
          details: updateError.message
        }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase
        .from("submission_grades")
        .insert({
          submission_id,
          grade,
          points_awarded,
          comments,
          graded_at: new Date().toISOString(),
          graded_by: user.id
        });

      if (insertError) {
        return NextResponse.json({
          error: "Failed to create grade",
          details: insertError.message
        }, { status: 500 });
      }
    }

    return NextResponse.json({ message: "Grade submitted successfully" });

  } catch (error) {
    console.error("Error in grading POST route:", error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
