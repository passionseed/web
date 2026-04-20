import { AdminProductAnalytics } from "@/components/admin/AdminProductAnalytics";

export const dynamic = "force-dynamic";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-semibold">Product Analytics</h2>
      <p className="text-sm text-muted-foreground">
        Retention, engagement, and funnel trends.
      </p>
      <AdminProductAnalytics />
    </div>
  );
}
