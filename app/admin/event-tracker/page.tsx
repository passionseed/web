import { AdminEventTracker } from "@/components/admin/AdminEventTracker";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";

export const dynamic = "force-dynamic";

export default function AdminEventTrackerPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="Insights"
        title="Event tracker"
        description="Monitor product activity and planner conversion."
      />
      <AdminEventTracker />
    </div>
  );
}
