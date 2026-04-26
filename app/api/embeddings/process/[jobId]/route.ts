import { NextResponse } from "next/server";
import { getJob, claimJob, completeJob, failJob } from "@/lib/embeddings/jobs";
import { createTeamDirectionSnapshot } from "@/lib/embeddings/team-direction";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status === "completed" || job.status === "failed") {
      return NextResponse.json({ jobId, status: job.status, message: "Job already finalized" });
    }

    const claimed = await claimJob(jobId);
    if (!claimed) {
      return NextResponse.json(
        { jobId, status: "processing", message: "Job already being processed" },
        { status: 202 }
      );
    }

    try {
      await createTeamDirectionSnapshot(job.team_id);
      await completeJob(jobId);

      return NextResponse.json({
        jobId,
        status: "completed",
        message: "Snapshot created successfully",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await failJob(jobId, message);
      return NextResponse.json(
        { jobId, status: "failed", error: message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing embed job:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
