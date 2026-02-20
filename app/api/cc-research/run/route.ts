import { NextRequest, NextResponse } from "next/server";
import { runCampaignSchema } from "@/lib/cc-research/schema";
import { runCcCampaign } from "@/lib/cc-research/orchestrator";
import { requireCCResearchAccess } from "@/lib/cc-research/auth";

export async function POST(request: NextRequest) {
  const access = await requireCCResearchAccess();
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = runCampaignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid run payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await runCcCampaign(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
