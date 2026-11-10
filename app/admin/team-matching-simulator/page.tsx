import { TeamMatchingSimulator } from "@/components/admin/team-matching/TeamMatchingSimulator";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function TeamMatchingSimulatorPage() {
  await requireAdmin();

  return (
    <div className="max-w-5xl space-y-4">
      <AdminPageHeader
        eyebrow="Tools & archive"
        title="Team matching simulator"
        description="Simulate how students get grouped based on their teammate preferences. Mutual picks are always on the same team."
      />
      <TeamMatchingSimulator />
    </div>
  );
}
