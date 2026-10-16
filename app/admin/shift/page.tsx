import { AdminShiftTracker } from "@/components/admin/AdminShiftTracker";
import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { adminMetadata } from "@/lib/admin/metadata";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("/admin/shift");

export default function AdminShiftPage() {
  return (
    <div className="space-y-2">
      <ShiftAdminTabs />
      <h2 className="text-2xl font-semibold">SHIFT Tracker</h2>
      <p className="text-sm text-muted-foreground">
        Track cohort kids and log weekly notes.
      </p>
      <AdminShiftTracker />
    </div>
  );
}
