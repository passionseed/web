import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireCCResearchAccess } from "@/lib/cc-research/auth";
import { getCampaignDashboardPayload } from "@/lib/cc-research/orchestrator";
import { Button } from "@/components/ui/button";
import { ResearchDashboard } from "@/components/cc-research/ResearchDashboard";

interface CcCampaignPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function CcResearchCampaignPage({ params }: CcCampaignPageProps) {
  const access = await requireCCResearchAccess();
  if (!access.authorized) {
    return null;
  }

  const { id } = await params;

  try {
    const payload = await getCampaignDashboardPayload(id);

    return (
      <div className="container mx-auto space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/cc-research/campaigns">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to campaigns
              </Link>
            </Button>
            <h1 className="mt-2 text-2xl font-bold">{payload.campaign.title}</h1>
            {payload.campaign.goal ? (
              <p className="max-w-2xl text-sm text-muted-foreground">{payload.campaign.goal}</p>
            ) : null}
          </div>
          <Button variant="outline" asChild>
            <Link href={`/cc-research/campaigns/${id}`}>
              Refresh
            </Link>
          </Button>
        </div>

        <ResearchDashboard payload={payload} />
      </div>
    );
  } catch {
    notFound();
  }
}
