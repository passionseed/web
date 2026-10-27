import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { RoundDashboard } from "@/components/admin/shift-rounds/RoundDashboard";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function RoundDashboardPage({ params }: { params: Promise<{ roundId: string }> }) {
  await requireAdmin();
  const { roundId } = await params;
  return (
    <div className="space-y-4">
      <AdminPageHeader eyebrow="SHIFT round" title="Dashboard" description="Entrants, logs, review load, certificates and job health for this round." />
      <RoundDashboard roundId={roundId} />
    </div>
  );
}
