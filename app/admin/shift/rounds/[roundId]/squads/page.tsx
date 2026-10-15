import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { SquadsBoard } from "@/components/admin/shift-rounds/SquadsBoard";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function RoundSquadsBoardPage({ params }: { params: Promise<{ roundId: string }> }) {
  await requireAdmin();
  const { roundId } = await params;
  return (
    <div className="space-y-4">
      <AdminPageHeader eyebrow="SHIFT round" title="Squads" description="Squads of students plus one mentor. Every student still runs their own project." />
      <SquadsBoard roundId={roundId} />
    </div>
  );
}
