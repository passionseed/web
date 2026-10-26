import { AdminProductAnalytics } from "@/components/admin/AdminProductAnalytics";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";

export const dynamic = "force-dynamic";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="Insights"
        title="Product analytics"
        description="Retention, engagement, and funnel trends."
      />
      <AdminProductAnalytics />
    </div>
  );
}
