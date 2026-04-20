import { SubmissionClusterView } from "@/components/admin/SubmissionClusterView";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ActivityClustersPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  await requireAdmin();
  const { activityId } = await params;

  return (
    <div className="container mx-auto space-y-4 py-8">
      <div>
        <Button asChild variant="ghost" className="-ml-4 w-fit text-muted-foreground">
          <Link href="/admin/hackathon/activities">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to activities
          </Link>
        </Button>
        <h1 className="mt-2 text-2xl font-bold">Submission clusters</h1>
        <p className="text-sm text-muted-foreground">
          Semantic clusters of participant submissions for this activity, powered by BGE-M3 embeddings.
        </p>
      </div>

      <SubmissionClusterView activityId={activityId} />
    </div>
  );
}
