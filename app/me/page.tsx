import { redirect } from "next/navigation";

import { FeaturedRadars } from "@/components/me/FeaturedRadars";
import { IslandLinkCard } from "@/components/me/IslandLinkCard";
import { InViewAnimator } from "@/components/ui/in-view-animator";
import { loadFeaturedRadars } from "@/lib/radar/featured";
import type { IslandViewer } from "@/lib/shift/islandInvite";
import { loadIslandViewer } from "@/lib/supabase/shift-island-viewer";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * /me: for now a door to the SHIFT High Island, the feature we push, plus a
 * few Radar careers. The My Path dashboard (components/my-path) is parked,
 * not deleted.
 */

/** Where the visitor stands with the island; null sends them to the island's own gate. */
async function islandViewerKind(): Promise<IslandViewer["kind"] | null> {
  try {
    return (await loadIslandViewer()).viewer.kind;
  } catch (error) {
    console.error("[me] island viewer unavailable", error instanceof Error ? error.message : "");
    return null;
  }
}
export default async function PortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [viewer, radars] = await Promise.all([islandViewerKind(), loadFeaturedRadars()]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#020617_0%,#0f172a_50%,#0f2942_100%)] antialiased">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_82%_24%,rgba(168,85,247,0.08),transparent_32%),radial-gradient(ellipse_at_50%_100%,rgba(254,217,92,0.05),transparent_56%)]"
      />
      <InViewAnimator selector=".ei-button-dawn" />
      <main id="my-path" className="dawn-theme relative z-10 flex-1" lang="th">
        <div className="container mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10 lg:py-14">
          <IslandLinkCard viewer={viewer} />
          <FeaturedRadars radars={radars} />
        </div>
      </main>
    </div>
  );
}
