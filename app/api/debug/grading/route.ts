import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { gradeSubmission } from "@/lib/supabase/grading";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { submissionId, grade, comments, rating, progressId } = body;

    console.log("Debug grading request:", {
      submissionId,
      grade,
      comments,
      rating,
      progressId,
      userId: user.id,
    });

    // Test database connection
    const { data: testQuery, error: testError } = await supabase
      .from("assessment_submissions")
      .select("id")
      .limit(1);

    if (testError) {
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: testError,
        },
        { status: 500 }
      );
    }

    // Check if submission exists
    const { data: submission, error: submissionError } = await supabase
      .from("assessment_submissions")
      .select("id, progress_id")
      .eq("id", submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        {
          error: "Submission not found",
          submissionId,
          details: submissionError,
        },
        { status: 404 }
      );
    }

    // Check if progress exists
    const { data: progress, error: progressError } = await supabase
      .from("student_node_progress")
      .select("id, status")
      .eq("id", progressId)
      .single();

    if (progressError || !progress) {
      return NextResponse.json(
        {
          error: "Progress record not found",
          progressId,
          details: progressError,
        },
        { status: 404 }
      );
    }

    // Attempt grading
    const result = await gradeSubmission(
      submissionId,
      grade,
      comments,
      rating,
      user.id,
      progressId
    );

    return NextResponse.json({
      success: true,
      result,
      debug: {
        submission,
        progress,
        user: { id: user.id, email: user.email },
      },
    });
  } catch (error) {
    console.error("Debug grading error:", error);

    return NextResponse.json(
      {
        error: "Grading failed",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
