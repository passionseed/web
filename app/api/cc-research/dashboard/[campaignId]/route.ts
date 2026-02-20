import { NextRequest, NextResponse } from "next/server";
import { buildCcExportPack, getCampaignDashboardPayload } from "@/lib/cc-research/orchestrator";
import { requireCCResearchAccess } from "@/lib/cc-research/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const access = await requireCCResearchAccess();
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { campaignId } = await params;
    const url = new URL(request.url);
    const includeExport = url.searchParams.get("include") === "export";

    if (includeExport) {
      const exportPack = await buildCcExportPack(campaignId);
      return NextResponse.json({ exportPack });
    }

    const payload = await getCampaignDashboardPayload(campaignId);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load CC dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
