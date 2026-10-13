import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { OpsPanel } from "@/components/admin/shift-rounds/OpsPanel";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function ShiftRoundsOpsPage() {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <AdminPageHeader
        eyebrow="SHIFT rounds"
        title="Flags and jobs"
        description="App flags, global SHIFT staff and background job health. Changes here need the global staff role."
      />
      <OpsPanel />
    </div>
  );
}
