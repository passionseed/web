import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { EntrantsTable } from "@/components/admin/shift-rounds/EntrantsTable";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function RoundEntrantsPage({ params }: { params: Promise<{ roundId: string }> }) {
  await requireAdmin();
  const { roundId } = await params;
  return (
    <div className="space-y-4">
      <AdminPageHeader eyebrow="SHIFT round" title="Entrants" description="Everyone who joined this round. Track and beta group are editable until a certificate issues." />
      <EntrantsTable roundId={roundId} />
    </div>
  );
}
