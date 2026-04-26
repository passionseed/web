import { TeamDirectionDashboard } from "@/components/admin/TeamDirectionDashboard";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function TeamDirectionsPage() {
  await requireAdmin();
  return (
    <div className="container mx-auto space-y-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Team Directions</h1>
        <p className="text-sm text-muted-foreground">
          Explore team trajectories, search semantically, and ask AI for insights.
        </p>
      </div>
      <TeamDirectionDashboard />
    </div>
  );
}
