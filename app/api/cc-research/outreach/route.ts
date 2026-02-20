import { NextRequest, NextResponse } from "next/server";
import { outreachAttemptSchema } from "@/lib/cc-research/schema";
import { upsertCcOutreach } from "@/lib/cc-research/orchestrator";
import { requireCCResearchAccess } from "@/lib/cc-research/auth";

export async function POST(request: NextRequest) {
  const access = await requireCCResearchAccess();
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = outreachAttemptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid outreach payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const attempt = await upsertCcOutreach(parsed.data);
    return NextResponse.json({ attempt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upsert outreach";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
