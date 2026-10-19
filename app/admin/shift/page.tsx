import { AdminShiftTracker } from "@/components/admin/AdminShiftTracker";
import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { adminMetadata } from "@/lib/admin/metadata";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("/admin/shift");

export default function AdminShiftPage() {
  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <AdminPageHeader
        eyebrow="SHIFT"
        title="Tracker"
        description="Track cohort kids and log weekly notes."
      />
      <AdminShiftTracker />
    </div>
  );
}
