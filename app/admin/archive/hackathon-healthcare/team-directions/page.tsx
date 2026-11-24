import { TeamDirectionDashboard } from "@/components/admin/TeamDirectionDashboard";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function TeamDirectionsPage() {
  await requireAdmin();
  return (
    <section className="space-y-4" aria-labelledby="hackathon-team-directions">
      <div>
        <h2 id="hackathon-team-directions" className="text-lg font-semibold">Team directions</h2>
        <p className="text-sm text-muted-foreground">
          Explore team trajectories, search semantically, and ask AI for insights.
        </p>
      </div>
      <TeamDirectionDashboard />
    </section>
  );
}
