import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { RoundsList } from "@/components/admin/shift-rounds/RoundsList";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function ShiftRoundsPage() {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <AdminPageHeader
        eyebrow="SHIFT"
        title="Rounds"
        description="Create rounds, set the allowlist and squads, review logs, and manage certificates."
      />
      <RoundsList />
    </div>
  );
}
