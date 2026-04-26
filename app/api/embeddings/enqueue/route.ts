import { NextResponse } from "next/server";
import { enqueueEmbedJob } from "@/lib/embeddings/jobs";

export async function POST(request: Request) {
  try {
    const { teamId, triggerSource = "manual" } = await request.json();

    if (!teamId) {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 });
    }

    const jobId = await enqueueEmbedJob(teamId, triggerSource as any);

    return NextResponse.json({
      jobId,
      status: "pending",
      message: "Job created. Poll /api/embeddings/status/{jobId} for results.",
    });
  } catch (error) {
    console.error("Error enqueueing embed job:", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}
