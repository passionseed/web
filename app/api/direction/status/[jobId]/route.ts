import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/direction/status/[jobId]
 *
 * Returns the current status of a direction finder job.
 * Frontend polls this endpoint every 3 seconds until job completes.
 *
 * Response:
 * - status: 'pending' | 'processing' | 'completed' | 'failed'
 * - progress: { current: number, total: 3 } - which step is being processed
 * - steps: { core, programs, commitments } - status of each step
 * - result?: Combined result (only when status === 'completed')
 * - error?: Error message (only when status === 'failed')
 *
 * This endpoint completes in <100ms.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Await params (Next.js 15 requirement)
    const { jobId } = await params;

    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch job (with RLS - user can only see their own jobs)
    const { data: job, error: fetchError } = await supabase
      .from('direction_finder_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Calculate progress
    const stepStatuses = [job.step_core, job.step_programs, job.step_commitments];
    const completedSteps = stepStatuses.filter(s => s === 'completed').length;

    // Build response
    const response: any = {
      jobId: job.id,
      status: job.status,
      progress: {
        current: completedSteps,
        total: 3,
      },
      steps: {
        core: job.step_core,
        programs: job.step_programs,
        commitments: job.step_commitments,
      },
      createdAt: job.created_at,
    };

    // Include partial results (even if not fully complete)
    if (job.result_core || job.result_programs || job.result_commitments) {
      response.partialResults = {
        core: job.result_core,
        programs: job.result_programs,
        commitments: job.result_commitments,
      };
    }

    // Include full result when completed
    if (job.status === 'completed') {
      response.result = {
        profile: job.result_core?.profile,
        vectors: job.result_core?.vectors,
        programs: job.result_programs?.programs,
        commitments: job.result_commitments?.commitments,
      };
      response.completedAt = job.completed_at;
    }

    // Include error when failed
    if (job.status === 'failed') {
      response.error = job.error;
      response.retryCount = job.retry_count;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error in /api/direction/status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
