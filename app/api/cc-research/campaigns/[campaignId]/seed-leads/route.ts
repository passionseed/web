import { NextRequest, NextResponse } from "next/server";
import { ccSeedLeadsSchema } from "@/lib/cc-research/schema";
import { seedCcLeads } from "@/lib/cc-research/orchestrator";
import { requireCCResearchAccess } from "@/lib/cc-research/auth";
import { z } from "zod";

export async function POST(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const access = await requireCCResearchAccess();
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { campaignId } = await params;
    const body = await request.json().catch(() => null);
    const parsedPayload = ccSeedLeadsSchema.safeParse(body);

    if (!parsedPayload.success) {
      return NextResponse.json(
        { error: "Invalid lead seed payload", details: parsedPayload.error.flatten() },
        { status: 400 },
      );
    }

    const parsedCampaign = z.string().uuid().safeParse(campaignId);
    if (!parsedCampaign.success) {
      return NextResponse.json({ error: "Invalid campaignId" }, { status: 400 });
    }

    const result = await seedCcLeads(parsedCampaign.data, parsedPayload.data);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to seed leads";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
