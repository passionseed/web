import { redirect } from "next/navigation";

import { GrowthStageGuide } from "@/components/my-path/GrowthStageGuide";
import { MyPathDashboard } from "@/components/my-path/MyPathDashboard";
import { MyPathSummaryCard } from "@/components/my-path/MyPathSummaryCard";
import { buildMyPathDashboard } from "@/lib/my-path/dashboard";
import {
  loadMyPathDashboardSource,
  type MyPathDashboardReadClient,
} from "@/lib/my-path/dashboard-read";
import {
  loadPersistedMyPathResult,
  type MyPathReadClient,
} from "@/lib/my-path/server-read";
import { buildMyPathSummary } from "@/lib/my-path/summary";
import { loadHub } from "@/lib/projectseed/hub";
import { buildProjectSeedMeSummary } from "@/lib/projectseed/me-summary";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const myPathReadClient = supabase as unknown as MyPathReadClient;
  const dashboardReadClient =
    supabase as unknown as MyPathDashboardReadClient;
  const [persistedPath, dashboardSource, projectSeedLoad] = await Promise.all([
    loadPersistedMyPathResult(myPathReadClient),
    loadMyPathDashboardSource(dashboardReadClient, user.id),
    loadHub(),
  ]);
  const model = buildMyPathDashboard({
    persistedPath: persistedPath.state,
    persistedPathStatus: persistedPath.status,
    ...dashboardSource,
  });
  const projectSeed = buildProjectSeedMeSummary(projectSeedLoad);
  const persistedDraft = persistedPath.state?.draft;
  const myPathSummary =
    persistedDraft?.answers && persistedDraft.possibilities
      ? buildMyPathSummary(persistedDraft)
      : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#020617_0%,#0f172a_50%,#0f2942_100%)] antialiased">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_82%_24%,rgba(168,85,247,0.08),transparent_32%),radial-gradient(ellipse_at_50%_100%,rgba(254,217,92,0.05),transparent_56%)]"
      />
      <main id="my-path" className="dawn-theme relative z-10 flex-1">
        <div className="container mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10 lg:py-14">
          <GrowthStageGuide />
          <MyPathSummaryCard summary={myPathSummary} />
          <MyPathDashboard model={model} projectSeed={projectSeed} />
        </div>
      </main>
    </div>
  );
}
