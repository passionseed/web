import { TeamDirectionClusterView } from "@/components/admin/TeamDirectionClusterView";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function TeamDirectionsPage() {
  await requireAdmin();
  return (
    <div className="container mx-auto space-y-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Team Directions</h1>
        <p className="text-sm text-muted-foreground">
          Where each team is heading — semantic clusters of all combined submissions per team.
        </p>
      </div>
      <TeamDirectionClusterView />
    </div>
  );
}
