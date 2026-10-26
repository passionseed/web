import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { ShiftViewsSummary } from "@/components/admin/ShiftViewsSummary";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { adminMetadata } from "@/lib/admin/metadata";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("/admin/shift/views");

export default function AdminShiftViewsPage() {
  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <AdminPageHeader
        eyebrow="SHIFT"
        title="Page views"
        description="Where visitors to the SHIFT pages come from, kept apart from the student lists."
      />
      <ShiftViewsSummary />
    </div>
  );
}
