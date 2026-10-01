import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { AdminShiftCamp } from "@/components/admin/AdminShiftCamp";
export const dynamic = "force-dynamic";
export default function ShiftCampPage() {
  return (
    <div className="space-y-6">
      <ShiftAdminTabs />
      <div>
        <h2 className="text-2xl font-semibold">Interactive SHIFT</h2>
        <p className="text-muted-foreground">
          Enroll accounts, place peer groups, review real work, and respond to
          support requests.
        </p>
      </div>
      <AdminShiftCamp />
    </div>
  );
}
