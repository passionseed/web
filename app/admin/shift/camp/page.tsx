import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { AdminShiftCamp } from "@/components/admin/AdminShiftCamp";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { adminMetadata } from "@/lib/admin/metadata";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("/admin/shift/camp");

export default function ShiftCampPage() {
  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <AdminPageHeader
        eyebrow="SHIFT"
        title="Interactive camp"
        description="Enroll accounts, place peer groups, review real work, and respond to support requests."
      />
      <AdminShiftCamp />
    </div>
  );
}
