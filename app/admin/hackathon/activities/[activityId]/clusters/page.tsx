import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { SubmissionClusterView } from "@/components/admin/SubmissionClusterView";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function ActivityClustersPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  await requireAdmin();
  const { activityId } = await params;

  return (
    <section className="space-y-4" aria-labelledby="hackathon-clusters">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="hackathon-clusters" className="text-lg font-semibold">Submission clusters</h2>
          <p className="text-sm text-muted-foreground">
            Semantic clusters of participant submissions for this activity, from BGE-M3 embeddings.
          </p>
        </div>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/admin/hackathon/activities">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to activities
          </Link>
        </Button>
      </div>

      <SubmissionClusterView activityId={activityId} />
    </section>
  );
}
