import { LearningAnalyticsDashboard } from "@/components/admin/LearningAnalyticsDashboard";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function HackathonLearningPage() {
  await requireAdmin();
  return (
    <section className="space-y-4" aria-labelledby="hackathon-learning">
      <div>
        <h2 id="hackathon-learning" className="text-lg font-semibold">Learning analytics</h2>
        <p className="text-sm text-muted-foreground">
          Who actually learned and grappled with the problem: Phase 1 to 2 plan fidelity and Phase 3 cycle rigor,
          compared with the human semifinal score. AI likelihood is scored separately.
        </p>
      </div>
      <LearningAnalyticsDashboard />
    </section>
  );
}
