import { AdminShiftApplications } from "@/components/admin/AdminShiftApplications";
import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { adminMetadata } from "@/lib/admin/metadata";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("/admin/shift/applications");

export default function AdminShiftApplicationsPage() {
  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <AdminPageHeader
        eyebrow="SHIFT"
        title="Applications"
        description="Review applicants, mark payment, and move accepted kids into the tracker."
      />
      <AdminShiftApplications />
    </div>
  );
}
