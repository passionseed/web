import "server-only";

import { unstable_cache } from "next/cache";
import { KNOWN_PUBLISHED_RADAR_SLUGS, liveGuideIndex } from "@/lib/radar-guides";
import { radarReadClient } from "@/lib/radar/preview";
import { isTerritoryMember } from "@/lib/radar/territory";

/**
 * A few Radar careers worth opening, for surfaces outside the Radar hub (/me).
 * Careers with a playable code guide come first, then the flagship careers,
 * then the hub's own order.
 */
export interface FeaturedRadar {
  slug: string;
  nameTh: string;
  taglineTh: string | null;
  emoji: string | null;
  /** True when the career has a page-by-page code guide on this deployment. */
  playable: boolean;
  href: string;
}

export interface FeaturedRadarRow {
  slug: string | null;
  name_th: string | null;
  tagline_th: string | null;
  emoji: string | null;
  sort_order: number | null;
  /** Only `research.territory`: the rest of the research JSON is never read here. */
  territory: unknown;
}

export const FEATURED_RADARS_LIMIT = 4;

/** Pure: drops rows a visitor can't open, ranks the rest, keeps `limit`. */
export function pickFeaturedRadars(
  rows: FeaturedRadarRow[],
  isPlayable: (slug: string) => boolean = (slug) => liveGuideIndex(slug) !== null,
  limit = FEATURED_RADARS_LIMIT
): FeaturedRadar[] {
  const flagship = (slug: string) => {
    const index = KNOWN_PUBLISHED_RADAR_SLUGS.indexOf(slug);
    return index === -1 ? KNOWN_PUBLISHED_RADAR_SLUGS.length : index;
  };
  const seen = new Set<string>();
  const usable: (FeaturedRadar & { sortOrder: number })[] = [];
  for (const row of rows) {
    const slug = row.slug?.trim();
    const nameTh = row.name_th?.trim();
    if (!slug || !nameTh || seen.has(slug) || isTerritoryMember({ territory: row.territory })) continue;
    seen.add(slug);
    usable.push({
      slug,
      nameTh,
      taglineTh: row.tagline_th?.trim() || null,
      emoji: row.emoji?.trim() || null,
      playable: isPlayable(slug),
      href: `/radar/${slug}`,
      sortOrder: row.sort_order ?? Number.MAX_SAFE_INTEGER,
    });
  }
  return usable
    .sort(
      (a, b) =>
        Number(b.playable) - Number(a.playable) ||
        flagship(a.slug) - flagship(b.slug) ||
        a.sortOrder - b.sortOrder
    )
    .slice(0, limit)
    .map(({ sortOrder: _sortOrder, ...radar }) => radar);
}

async function loadFeaturedRadarRows(): Promise<FeaturedRadarRow[]> {
  // Published only, even in Radar preview: unpublished rows there are mostly
  // abandoned legacy fields (see app/radar/page.tsx).
  const { data, error } = await radarReadClient()
    .from("radar_fields")
    .select("slug, name_th, tagline_th, emoji, sort_order, territory:research->territory")
    .eq("is_published", true)
    .not("slug", "is", null)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`radar_fields: ${error.code ?? "read failed"}`);
  return (data ?? []) as FeaturedRadarRow[];
}

const cachedFeaturedRadarRows = unstable_cache(loadFeaturedRadarRows, ["featured-radar-rows-v1"], {
  revalidate: 300,
  tags: ["published-radar-fields"],
});

/** Never throws: callers render without the list when Radar can't be read. Failures are not cached. */
export async function loadFeaturedRadars(): Promise<FeaturedRadar[]> {
  try {
    return pickFeaturedRadars(await cachedFeaturedRadarRows());
  } catch (error) {
    console.error("[radar] featured radars unavailable", error instanceof Error ? error.message : "");
    return [];
  }
}
