import "server-only";

import { unstable_cache } from "next/cache";
import { guideIndexPage, liveGuideIndex } from "@/lib/radar-guides";
import { readClipManifest } from "@/lib/radar-guides/registry.server";
import type { ClipManifest } from "@/lib/radar-guide/guide-types";
import { RADAR_GUIDE_POSTER_URL_PATTERN, RADAR_PAGE_KEY_PATTERN } from "@/lib/radar-guide/types";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * The hub's "จากคลิปไหน?" strip (spec section 1, bio links): the last mapped
 * reels, so a student who saw an older reel can still find its career and the
 * guide page (level) the reel came from.
 *
 * Read with the service role because `radar_reels` is admin-only. Only the
 * public fields below leave this module: no media ids, notes or creators.
 * Page titles come from the code guide index and posters from the committed
 * clips.json, so nothing about a page is read from the database.
 */
export interface RecentRadarReel {
  fieldSlug: string;
  /** Code guide page the reel maps to, or null (career cover or deck). */
  pageKey: string | null;
  careerLabelTh: string;
  pageTitleTh: string | null;
  posterUrl: string | null;
  postedAt: string | null;
  /** `/radar/<slug>/<page>` for a visible code guide page, else `/radar/<slug>`. */
  href: string;
}

export const RECENT_RADAR_REELS_LIMIT = 6;
/** Rows read before de-duplicating and dropping unpublished careers. */
const SCAN_LIMIT = 30;

export interface RecentReelRow {
  field_slug: string | null;
  chapter_key: string | null;
  career_label_th: string | null;
  posted_at: string | null;
  created_at: string;
  radar_fields: { id: string; is_published: boolean } | null;
}

export interface RecentReelsDeps {
  /** Index entry of a code guide visible on this deployment, or null. */
  liveGuide(slug: string): { slug: string } | null;
  pageTitle(slug: string, pageKey: string): string | null;
  clips(slug: string): ClipManifest;
}

const defaultDeps: RecentReelsDeps = {
  liveGuide: (slug) => liveGuideIndex(slug),
  pageTitle: (slug, pageKey) => guideIndexPage(slug, pageKey)?.titleTh ?? null,
  clips: (slug) => readClipManifest(slug),
};

/**
 * Pure: newest first, one tile per (career, page), published careers only.
 * A page counts only when the career has a visible code guide that has it;
 * the poster is that page's recorded clip poster, from the CDN only.
 */
export function toRecentRadarReels(
  reels: RecentReelRow[],
  deps: RecentReelsDeps = defaultDeps,
  limit = RECENT_RADAR_REELS_LIMIT
): RecentRadarReel[] {
  const seen = new Set<string>();
  const clipsBySlug = new Map<string, ClipManifest>();
  const result: RecentRadarReel[] = [];
  for (const reel of reels) {
    const field = reel.radar_fields;
    if (!reel.field_slug || !field?.is_published || !reel.career_label_th) continue;
    const slug = reel.field_slug;
    const guide = deps.liveGuide(slug);
    const candidate = reel.chapter_key && RADAR_PAGE_KEY_PATTERN.test(reel.chapter_key) ? reel.chapter_key : null;
    const pageTitleTh = guide && candidate ? deps.pageTitle(slug, candidate) : null;
    const pageKey = pageTitleTh ? candidate : null;
    const key = `${slug}|${pageKey ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let poster: string | null = null;
    if (pageKey) {
      if (!clipsBySlug.has(slug)) clipsBySlug.set(slug, deps.clips(slug));
      poster = clipsBySlug.get(slug)?.[pageKey]?.posterUrl ?? null;
    }
    result.push({
      fieldSlug: slug,
      pageKey,
      careerLabelTh: reel.career_label_th,
      pageTitleTh,
      posterUrl: poster && RADAR_GUIDE_POSTER_URL_PATTERN.test(poster) ? poster : null,
      postedAt: reel.posted_at ?? reel.created_at,
      href: `/radar/${slug}${pageKey ? `/${pageKey}` : ""}`,
    });
    if (result.length >= limit) break;
  }
  return result;
}

async function loadRecentRadarReels(): Promise<RecentRadarReel[]> {
  const supabase = createAdminClient();
  const { data: reels, error } = await supabase
    .from("radar_reels")
    .select("field_slug, chapter_key, career_label_th, posted_at, created_at, radar_fields(id, is_published)")
    .not("field_slug", "is", null)
    .order("posted_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(SCAN_LIMIT);
  if (error) throw new Error(`radar_reels: ${error.code ?? "read failed"}`);
  return toRecentRadarReels((reels ?? []) as unknown as RecentReelRow[]);
}

const cachedRecentRadarReels = unstable_cache(loadRecentRadarReels, ["radar-recent-reels-v2"], {
  revalidate: 300,
  // Reel mapping revalidates radar-reels. Titles and posters come from code
  // and clips.json, which change only with a deploy.
  tags: ["radar-reels"],
});

/** Never throws: the hub renders without the strip when this fails. Failures are not cached. */
export async function getCachedRecentRadarReels(): Promise<RecentRadarReel[]> {
  try {
    return await cachedRecentRadarReels();
  } catch (error) {
    console.error("[radar] recent reels unavailable", error instanceof Error ? error.message : "");
    return [];
  }
}
