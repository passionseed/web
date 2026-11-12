import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getLeadAudienceStats, getLeadFunnelStats } from "@/lib/supabase/lead-insights";
import { LeadInsightsCharts } from "@/components/admin/LeadInsightsCharts";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function LeadInsightsPage() {
  // The admin layout also checks, but this page reads with the service-role client.
  await requireAdmin();
  const [funnel, audience] = await Promise.all([
    getLeadFunnelStats(),
    getLeadAudienceStats(),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Insights"
        title="Lead insights"
        description="Funnel and audience across all DM leads. Internal accounts are excluded."
        actions={<RefreshButton />}
      />
      <LeadInsightsCharts funnel={funnel} audience={audience} />
    </div>
  );
}
