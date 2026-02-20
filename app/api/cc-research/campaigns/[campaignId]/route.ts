import { NextRequest, NextResponse } from "next/server";
import { getCcCampaign, updateCcCampaign } from "@/lib/cc-research/orchestrator";
import { requireCCResearchAccess } from "@/lib/cc-research/auth";
import { z } from "zod";

const patchCampaignSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  goal: z.string().max(200).nullable().optional(),
  state: z.enum(["draft", "active", "paused", "completed", "archived"]).optional(),
  slug: z.string().trim().min(3).max(80).optional(),
  filters: z.record(z.unknown()).optional(),
  activeWeights: z.record(z.number()).optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const access = await requireCCResearchAccess();
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { campaignId } = await params;
    const campaign = await getCcCampaign(campaignId);
    return NextResponse.json({ campaign });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const access = await requireCCResearchAccess();
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { campaignId } = await params;
    const body = await request.json().catch(() => null);
    const parsed = patchCampaignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid campaign update payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const campaign = await updateCcCampaign(campaignId, parsed.data);
    return NextResponse.json({ campaign });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
