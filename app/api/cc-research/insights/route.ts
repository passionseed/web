import { NextRequest, NextResponse } from "next/server";
import { feedbackEventSchema } from "@/lib/cc-research/schema";
import { saveCcFeedback } from "@/lib/cc-research/orchestrator";
import { requireCCResearchAccess } from "@/lib/cc-research/auth";

export async function POST(request: NextRequest) {
  const access = await requireCCResearchAccess();
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = feedbackEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid insight payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await saveCcFeedback(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save insight";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
