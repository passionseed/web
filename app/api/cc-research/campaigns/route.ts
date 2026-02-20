import { NextRequest, NextResponse } from "next/server";
import { createCcCampaign, listCcCampaigns, updateCcCampaign } from "@/lib/cc-research/orchestrator";
import { createCampaignSchema, type CreateCampaignInput } from "@/lib/cc-research/schema";
import { requireCCResearchAccess } from "@/lib/cc-research/auth";
import { z } from "zod";

const campaignUpsertSchema = z.object({
  campaignId: z.string().uuid().optional(),
  title: z.string().min(3).max(120),
  goal: z.string().max(200).optional(),
  state: z.enum(["draft", "active", "paused", "completed", "archived"]).optional(),
  slug: z.string().trim().min(3).max(80).optional(),
  filters: z.record(z.unknown()).optional(),
  activeWeights: z.record(z.number()).optional(),
});

export async function GET() {
  const access = await requireCCResearchAccess();
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const campaigns = await listCcCampaigns();
    return NextResponse.json({ campaigns });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load campaigns";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireCCResearchAccess();
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = campaignUpsertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid campaign payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.campaignId) {
      const normalizedInput: Partial<CreateCampaignInput> = {
        title: data.title,
        goal: data.goal,
        state: data.state,
        slug: data.slug,
        filters: data.filters,
        activeWeights: data.activeWeights,
      };

      const campaign = await updateCcCampaign(data.campaignId, normalizedInput);
      return NextResponse.json({ campaign });
    }

    const createInput = createCampaignSchema.parse(data) as CreateCampaignInput;
    const campaign = await createCcCampaign(createInput, access.userId);

    return NextResponse.json({ campaign });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
