/**
 * Route helpers for code guides: hrefs, the cover-or-deck decision, metadata
 * and sitemap entries. Pure and server-safe. Content arrives as arguments (the
 * app/ routes load it through lib/radar-guides/registry.server), so this file
 * never imports guide content itself.
 */
import type { Metadata, MetadataRoute } from "next";
import type { CareerGuide, GuideIndexEntry, GuidePage } from "@/lib/radar-guide/guide-types";
import { guideVisible } from "@/lib/radar-guides";

export function coverHref(slug: string): string {
  return `/radar/${slug}`;
}

export function levelHref(slug: string, pageKey: string): string {
  return `/radar/${slug}/${pageKey}`;
}

/** The DB deck for a career that also has a code guide. */
export function deckHref(slug: string): string {
  return `/radar/${slug}?view=deck`;
}

/** First level by order, or null for a guide with no pages. */
export function firstLevelKey(index: Pick<GuideIndexEntry, "pages">): string | null {
  return [...index.pages].sort((a, b) => a.order - b.order)[0]?.key ?? null;
}

/**
 * `/radar/[slug]` shows the guide cover when the career has a guide visible on
 * this deployment, unless the plan flow (`?from=plan`) or the deck
 * (`?view=deck`) asked for the DB deck.
 */
export function shouldShowGuideCover(input: {
  hasGuide: boolean;
  from?: string | string[] | null;
  view?: string | string[] | null;
}): boolean {
  if (!input.hasGuide) return false;
  const from = Array.isArray(input.from) ? input.from[0] : input.from;
  const view = Array.isArray(input.view) ? input.view[0] : input.view;
  return from !== "plan" && view !== "deck";
}

const SITE = "Career Radar";

/** "<page title> | <career> | Career Radar". Absolute: skips the root "%s | PassionSeed". */
export function guidePageTitle(meta: Pick<GuideIndexEntry, "nameTh">, page: Pick<GuidePage, "titleTh">): string {
  return `${page.titleTh} | ${meta.nameTh} | ${SITE}`;
}

export function guideCoverTitle(meta: Pick<GuideIndexEntry, "nameTh" | "pages">): string {
  return `${meta.nameTh} ลองเล่น ${meta.pages.length} ด่าน | ${SITE}`;
}

export function guidePageMetadata(
  meta: Pick<GuideIndexEntry, "slug" | "nameTh">,
  page: Pick<GuidePage, "key" | "titleTh" | "questionTh">
): Metadata {
  const title = guidePageTitle(meta, page);
  const canonical = levelHref(meta.slug, page.key);
  return {
    title: { absolute: title },
    description: page.questionTh,
    alternates: { canonical },
    openGraph: { title, description: page.questionTh, url: canonical, type: "article", locale: "th_TH" },
    twitter: { card: "summary_large_image", title, description: page.questionTh },
  };
}

export function guideCoverMetadata(
  meta: Pick<GuideIndexEntry, "slug" | "nameTh" | "pages">,
  descriptionTh: string
): Metadata {
  const title = guideCoverTitle(meta);
  const canonical = coverHref(meta.slug);
  return {
    title: { absolute: title },
    description: descriptionTh,
    alternates: { canonical },
    openGraph: { title, description: descriptionTh, url: canonical, type: "article", locale: "th_TH" },
    twitter: { card: "summary_large_image", title, description: descriptionTh },
  };
}

/** The cover's one-line hook: the first level's OG headline. */
export function guideHookTh(guide: Pick<CareerGuide, "pages">): string {
  const first = [...guide.pages].sort((a, b) => a.order - b.order)[0];
  return first?.og.headlineTh ?? first?.titleTh ?? "";
}

function dateOf(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

/** Cover plus every level of each guide visible on this deployment, `lastModified` = page asOf. */
export function guideSitemapEntries(
  guides: readonly CareerGuide[],
  baseUrl: string,
  env: string | undefined = process.env.VERCEL_ENV
): MetadataRoute.Sitemap {
  return guides
    .filter((g) => guideVisible(g.meta, env))
    .flatMap((g) => {
      const pages = [...g.pages].sort((a, b) => a.order - b.order);
      return [
        {
          url: `${baseUrl}${coverHref(g.meta.slug)}`,
          lastModified: dateOf(g.meta.asOf),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        },
        ...pages.map((p) => ({
          url: `${baseUrl}${levelHref(g.meta.slug, p.key)}`,
          lastModified: dateOf(p.asOf),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        })),
      ];
    });
}
