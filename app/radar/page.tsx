import { RadarLandingBeacon } from "@/components/radar/RadarLandingBeacon";
import { RadarPageClient } from "@/components/radar/RadarPageClient";
import { RecentReelsStrip } from "@/components/radar/RecentReelsStrip";
import type { Database } from "@/lib/supabase/database.types";
import { isRadarPreview, radarReadClient } from "@/lib/radar/preview";
import { getCachedRecentRadarReels } from "@/lib/radar/recent-reels";
import { isTerritoryIndex, isTerritoryMember } from "@/lib/radar/territory";

type RadarField = Database["public"]["Tables"]["radar_fields"]["Row"];
type RadarCollection = Database["public"]["Tables"]["radar_collections"]["Row"];

export const dynamic = "force-dynamic";

export default async function RadarPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  // Anon read: the grid is public, and no cookie-bound session changes what it
  // shows. In local preview this client also sees unpublished staged content.
  const supabase = radarReadClient();

  const [fieldsResult, collectionsResult, recentReels] = await Promise.all([
    supabase.from("radar_fields").select("*").order("sort_order", { ascending: true }),
    supabase
      .from("radar_collections")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    // Never throws; an empty list hides the strip.
    getCachedRecentRadarReels(),
  ]);

  const error = fieldsResult.error || collectionsResult.error;
  if (error) {
    console.error("Error loading Radar page:", error);
  }

  // Two rules decide what becomes a tile:
  //
  // 1. Territory professions never do. They are met inside their deck, in
  //    order, and their territory is represented by a single index tile.
  // 2. Preview shows staged *territory* tiles only, not every unpublished row.
  //    Dropping the filter wholesale resurrected ~30 abandoned legacy fields
  //    and made local look nothing like production.
  const preview = isRadarPreview();
  const gridFields = ((fieldsResult.data || []) as RadarField[]).filter((field) => {
    if (isTerritoryMember(field.research)) return false;
    if (field.is_published) return true;
    return preview && isTerritoryIndex(field.research);
  });

  return (
    <>
      {/* Hub visit and utm capture run in the browser; the server never reads utm. */}
      <RadarLandingBeacon />
      {/* Students arriving from a plan are mid-task; the reel strip is for social arrivals. */}
      {from === "plan" ? null : <RecentReelsStrip reels={recentReels} />}
      <RadarPageClient
        initialFields={gridFields}
        initialCollections={(collectionsResult.data || []) as RadarCollection[]}
        initialError={error ? "Radar request failed" : null}
        fromPlan={from === "plan"}
      />
    </>
  );
}
