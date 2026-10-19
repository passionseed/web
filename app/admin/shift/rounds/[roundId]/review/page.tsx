import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { ReviewQueue } from "@/components/admin/shift-rounds/ReviewQueue";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function RoundReviewQueuePage({ params }: { params: Promise<{ roundId: string }> }) {
  await requireAdmin();
  const { roundId } = await params;
  return (
    <div className="space-y-4">
      <AdminPageHeader eyebrow="SHIFT round" title="Review" description="Spot-check logs, reject with a reason, accept a rejected log, or mark it reviewed." />
      <ReviewQueue roundId={roundId} />
    </div>
  );
}
