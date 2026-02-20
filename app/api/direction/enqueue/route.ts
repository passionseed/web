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
    let userId: string | null = null;

    // Primary auth path: session cookie
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!authError && user) {
      userId = user.id;
    }

    // Fallback auth path: bearer token (for load testing / non-browser clients)
    if (!userId) {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null;

      if (token) {
        const { createAdminClient } = await import("@/utils/supabase/admin");
        const admin = createAdminClient();
        const {
          data: { user: bearerUser },
          error: bearerError,
        } = await admin.auth.getUser(token);

        if (!bearerError && bearerUser) {
          userId = bearerUser.id;
        }
      }
    }

    if (!userId) {
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

    // Cookie auth can insert via RLS client; bearer token flow inserts via admin.
    const authHeader = request.headers.get("authorization");
    const hasBearerToken = Boolean(authHeader?.startsWith("Bearer "));

    const dbClient = hasBearerToken
      ? (await import("@/utils/supabase/admin")).createAdminClient()
      : supabase;

    const { data: job, error: insertError } = await dbClient
      .from('direction_finder_jobs')
      .insert({
        user_id: userId,
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
