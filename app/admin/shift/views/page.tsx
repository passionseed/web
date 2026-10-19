import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { ShiftViewsSummary } from "@/components/admin/ShiftViewsSummary";
import { adminMetadata } from "@/lib/admin/metadata";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("/admin/shift/views");

export default function AdminShiftViewsPage() {
  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">SHIFT Page Views</h2>
        <p className="text-sm text-muted-foreground">
          Where visitors to the SHIFT pages come from, kept apart from the student lists.
        </p>
      </div>
      <ShiftViewsSummary />
    </div>
  );
}
