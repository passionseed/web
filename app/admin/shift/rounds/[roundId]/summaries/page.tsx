import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { SummariesQueue } from "@/components/admin/shift-rounds/SummariesQueue";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function RoundSummariesQueuePage({ params }: { params: Promise<{ roundId: string }> }) {
  await requireAdmin();
  const { roundId } = await params;
  return (
    <div className="space-y-4">
      <AdminPageHeader eyebrow="SHIFT round" title="Project summaries" description="Approve or reject the opt-in summaries shown on certificate verification pages." />
      <SummariesQueue roundId={roundId} />
    </div>
  );
}
