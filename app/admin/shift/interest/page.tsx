import { AdminShiftInterest } from "@/components/admin/AdminShiftInterest";
import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";

export const dynamic = "force-dynamic";

export default function AdminShiftInterestPage() {
  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <AdminPageHeader
        eyebrow="SHIFT"
        title="Pre-orders"
        description="Who signed up on /shift/next, and which 7-day windows the most people can make."
      />
      <AdminShiftInterest />
    </div>
  );
}
