import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { AdminShiftCamp } from "@/components/admin/AdminShiftCamp";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";

export const dynamic = "force-dynamic";

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
