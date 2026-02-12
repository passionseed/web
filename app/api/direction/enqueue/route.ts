import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * POST /api/direction/enqueue
 *
 * Creates a new direction finder job and returns immediately.
 * The job will be processed by the background worker.
 *
 * Request body:
 * - answers: AssessmentAnswers
 * - history: { role: 'user' | 'assistant', content: string }[]
 * - language?: 'en' | 'th' (default: 'en')
 * - modelName?: string (optional)
 *
 * Response:
 * - jobId: UUID of the created job
 * - status: 'pending'
 *
 * This endpoint completes in <1 second.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { answers, history, language = 'en', modelName } = body;

    // Validate required fields
    if (!answers) {
      return NextResponse.json(
        { error: "Missing required field: answers" },
        { status: 400 }
      );
    }

    if (!history || !Array.isArray(history)) {
      return NextResponse.json(
        { error: "Missing or invalid field: history" },
        { status: 400 }
      );
    }

    // Create job record
    const { data: job, error: insertError } = await supabase
      .from('direction_finder_jobs')
      .insert({
        user_id: user.id,
        input_data: {
          answers,
          history,
          modelName,
        },
        language,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create job:", insertError);
      return NextResponse.json(
        { error: "Failed to create job" },
        { status: 500 }
      );
    }

    // Return job ID immediately
    return NextResponse.json({
      jobId: job.id,
      status: 'pending',
      message: 'Job created successfully. Poll /api/direction/status/{jobId} for results.',
    });

  } catch (error) {
    console.error("Error in /api/direction/enqueue:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
