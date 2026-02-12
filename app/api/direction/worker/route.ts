import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  generateDirectionProfileCore,
  generatePrograms,
  generateCommitments,
} from "@/lib/ai/directionProfileEngine";

/**
 * POST /api/direction/worker
 *
 * Background worker that processes ONE pending job step.
 * This endpoint is called by Vercel Cron every 1 minute.
 *
 * Flow:
 * 1. Atomically grab one job with a pending step (SELECT FOR UPDATE SKIP LOCKED)
 * 2. Determine which step to process (core → programs → commitments)
 * 3. Process that step (each step takes 20-60s)
 * 4. Update step status and result
 * 5. Repeat until all steps done
 *
 * This endpoint is protected by checking CRON_SECRET header.
 */
export async function POST(request: Request) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Create service role client (bypasses RLS)
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Step 1: Atomically grab up to 5 jobs with pending work
    // Process multiple jobs in parallel for better concurrency
    const PARALLEL_JOBS = 5;

    const allJobs = [];
    for (let i = 0; i < PARALLEL_JOBS; i++) {
      const { data: jobs, error: fetchError } = await supabase.rpc(
        'get_next_direction_job'
      );

      if (fetchError) {
        console.error("Error fetching next job:", fetchError);
        continue;
      }

      if (!jobs || jobs.length === 0) {
        break; // No more pending jobs
      }

      allJobs.push(jobs[0]);
    }

    if (allJobs.length === 0) {
      return NextResponse.json({
        message: "No pending jobs",
        processed: false,
      });
    }

    const workerId = `worker-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    console.log(`[Worker ${workerId}] Processing ${allJobs.length} jobs in parallel`);

    // Step 2: Process all jobs in parallel
    const processJob = async (job: any) => {
      let stepToProcess: 'core' | 'programs' | 'commitments' | null = null;

      try {
        // Determine which step to process
        if (job.step_core === 'pending') {
          stepToProcess = 'core';
        } else if (job.step_core === 'completed' && job.step_programs === 'pending') {
          stepToProcess = 'programs';
        } else if (job.step_programs === 'completed' && job.step_commitments === 'pending') {
          stepToProcess = 'commitments';
        }

        if (!stepToProcess) {
          console.log(`[Worker ${workerId}] No pending step for job ${job.id}`);
          return { success: false, jobId: job.id, reason: 'No pending step' };
        }

        console.log(`[Worker ${workerId}] Processing job ${job.id} - step: ${stepToProcess}`);

        // Step 3: Mark step as processing and lock the job
        const stepColumn = `step_${stepToProcess}`;
        const { error: lockError } = await supabase
          .from('direction_finder_jobs')
          .update({
            [stepColumn]: 'processing',
            processing_started_at: new Date().toISOString(),
            processed_by: workerId,
          })
          .eq('id', job.id);

        if (lockError) {
          console.error(`[Worker ${workerId}] Failed to lock job ${job.id}:`, lockError);
          return { success: false, jobId: job.id, reason: 'Failed to lock', error: lockError.message };
        }

        // Step 4: Process the step
        const inputData = job.input_data;
        const { answers, history, modelName } = inputData;
        const language = job.language || 'en';

        let result: any;

        switch (stepToProcess) {
          case 'core':
            console.log(`[Worker ${workerId}] Generating core profile for job ${job.id}...`);
            result = await generateDirectionProfileCore(
              history,
              answers,
              modelName,
              language
            );
            break;

          case 'programs':
            console.log(`[Worker ${workerId}] Generating programs for job ${job.id}...`);
            // Need core result for context
            const coreResult = job.result_core;
            if (!coreResult) {
              throw new Error("Core result not found");
            }
            result = await generatePrograms(
              coreResult,
              answers,
              modelName,
              language
            );
            break;

          case 'commitments':
            console.log(`[Worker ${workerId}] Generating commitments for job ${job.id}...`);
            // Need core result for context
            const coreResultForCommitments = job.result_core;
            if (!coreResultForCommitments) {
              throw new Error("Core result not found");
            }
            result = await generateCommitments(
              coreResultForCommitments,
              answers,
              modelName,
              language
            );
            break;
        }

        console.log(`[Worker ${workerId}] Step ${stepToProcess} completed for job ${job.id}`);

        // Step 5: Update job with result
        const resultColumn = `result_${stepToProcess}`;
        const { error: updateError } = await supabase
          .from('direction_finder_jobs')
          .update({
            [stepColumn]: 'completed',
            [resultColumn]: result,
            processing_started_at: null,
            processed_by: null,
          })
          .eq('id', job.id);

        if (updateError) {
          console.error(`[Worker ${workerId}] Failed to update job ${job.id}:`, updateError);
          throw updateError;
        }

        return {
          success: true,
          jobId: job.id,
          step: stepToProcess,
          message: `Step ${stepToProcess} completed`,
        };

      } catch (stepError) {
        // Step failed - mark as failed and increment retry count
        console.error(`[Worker ${workerId}] Step ${stepToProcess} failed:`, stepError);

        const errorMessage = stepError instanceof Error ? stepError.message : String(stepError);
        const stepColumn = `step_${stepToProcess}`;

        // Check if we should retry
        const shouldRetry = job.retry_count < job.max_retries;

        if (shouldRetry) {
          // Reset step to pending for retry
          await supabase
            .from('direction_finder_jobs')
            .update({
              [stepColumn]: 'pending',
              retry_count: job.retry_count + 1,
              processing_started_at: null,
              processed_by: null,
              error: errorMessage,
            })
            .eq('id', job.id);

          return {
            success: false,
            jobId: job.id,
            step: stepToProcess,
            message: `Step ${stepToProcess} failed, will retry (${job.retry_count + 1}/${job.max_retries})`,
            error: errorMessage,
            willRetry: true,
          };
        } else {
          // Max retries exceeded - mark step as failed
          await supabase
            .from('direction_finder_jobs')
            .update({
              [stepColumn]: 'failed',
              processing_started_at: null,
              processed_by: null,
              error: errorMessage,
            })
            .eq('id', job.id);

          return {
            success: false,
            jobId: job.id,
            step: stepToProcess,
            message: `Step ${stepToProcess} failed permanently`,
            error: errorMessage,
            willRetry: false,
          };
        }
      }
    };

    // Step 3: Process all jobs in parallel
    const results = await Promise.all(
      allJobs.map(job =>
        processJob(job).catch(error => ({
          success: false,
          jobId: job.id,
          error: error.message,
          message: 'Fatal error processing job',
        }))
      )
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`[Worker ${workerId}] Batch complete: ${successful} successful, ${failed} failed`);

    return NextResponse.json({
      message: `Processed ${allJobs.length} jobs: ${successful} successful, ${failed} failed`,
      results,
      processed: true,
      workerId,
    });

  } catch (error) {
    console.error("Error in /api/direction/worker:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
