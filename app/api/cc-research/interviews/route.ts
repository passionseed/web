import { NextRequest, NextResponse } from "next/server";
import { interviewSchema } from "@/lib/cc-research/schema";
import { saveCcInterview } from "@/lib/cc-research/orchestrator";
import { requireCCResearchAccess } from "@/lib/cc-research/auth";

export async function POST(request: NextRequest) {
  const access = await requireCCResearchAccess();
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = interviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid interview payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const interview = await saveCcInterview(parsed.data);
    return NextResponse.json({ interview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save interview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
