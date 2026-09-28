import { AdminShiftApplications } from "@/components/admin/AdminShiftApplications";
import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";

export const dynamic = "force-dynamic";

export default function AdminShiftApplicationsPage() {
  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">SHIFT Applications</h2>
        <p className="text-sm text-muted-foreground">
          Review applicants, mark payment, and move accepted kids into the tracker.
        </p>
      </div>
      <AdminShiftApplications />
    </div>
  );
}
