import { requireCCResearchAccess } from "@/lib/cc-research/auth";
import { listCcCampaigns } from "@/lib/cc-research/orchestrator";
import { CampaignListClient } from "@/components/cc-research/CampaignListClient";

export const dynamic = "force-dynamic";

export default async function CcResearchCampaignsPage() {
  const access = await requireCCResearchAccess();
  if (!access.authorized) {
    return null;
  }

  const campaigns = await listCcCampaigns();

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">CC Research Campaigns</h1>
        <p className="text-sm text-muted-foreground">Seed leads, run discovery, and track interviewer-ready evidence for community college teams.</p>
      </div>
      <CampaignListClient initialCampaigns={campaigns} />
    </div>
  );
}
