/**
 * GUIDE_INDEX: light metadata for every code guide (titles, keys, minutes,
 * alias, accent, status, story badges/traits). Safe for client and admin
 * bundles: never import pages, facts or registry.server from here.
 *
 * `games` and `cutscene` per page are derived from the pages on the server
 * (registry.server guideIndexFor); this index leaves them unset.
 */
import type { GuideIndexEntry, GuideIndexPage } from "@/lib/radar-guide/guide-types";
import { CYBERSECURITY_META } from "./cybersecurity/meta";

export const GUIDE_INDEX: Readonly<Record<string, GuideIndexEntry>> = {
  cybersecurity: CYBERSECURITY_META,
};

/** Every slug with a code guide, any status. */
export const GUIDE_SLUGS: readonly string[] = Object.keys(GUIDE_INDEX);

/**
 * Whether a guide is shown on this deployment: `live` always, `draft` on
 * preview and dev only. On the client VERCEL_ENV is unset, so pass the env
 * from the server when it matters.
 */
export function guideVisible(
  entry: Pick<GuideIndexEntry, "status">,
  env: string | undefined = process.env.VERCEL_ENV
): boolean {
  return entry.status === "live" || env !== "production";
}

/** The index entry when the slug has a guide visible on this deployment, else null. */
export function liveGuideIndex(slug: string, env?: string): GuideIndexEntry | null {
  const entry = Object.prototype.hasOwnProperty.call(GUIDE_INDEX, slug) ? GUIDE_INDEX[slug] : undefined;
  if (!entry) return null;
  return guideVisible(entry, env ?? process.env.VERCEL_ENV) ? entry : null;
}

/** Page keys of a guide in order, or null when the slug has no code guide (any status). */
export function guidePageKeys(slug: string): readonly string[] | null {
  const entry = Object.prototype.hasOwnProperty.call(GUIDE_INDEX, slug) ? GUIDE_INDEX[slug] : undefined;
  if (!entry) return null;
  return [...entry.pages].sort((a, b) => a.order - b.order).map((p) => p.key);
}

export function isGuidePageKey(slug: string, key: string): boolean {
  return guidePageKeys(slug)?.includes(key) ?? false;
}

export function guideIndexPage(slug: string, key: string): GuideIndexPage | null {
  const entry = Object.prototype.hasOwnProperty.call(GUIDE_INDEX, slug) ? GUIDE_INDEX[slug] : undefined;
  return entry?.pages.find((p) => p.key === key) ?? null;
}

/** The guide whose /r alias is `alias` (e.g. "cyber"), or null. */
export function guideByAlias(alias: string): GuideIndexEntry | null {
  return Object.values(GUIDE_INDEX).find((g) => g.alias === alias) ?? null;
}

/**
 * Legacy deck hash -> page key (`#hook` -> mythos), from each page's
 * legacyHashes. Used by LegacyHashRedirect and the /r resolver.
 */
export function legacyHashPage(slug: string, hash: string): string | null {
  const clean = hash.replace(/^#/, "");
  const entry = Object.prototype.hasOwnProperty.call(GUIDE_INDEX, slug) ? GUIDE_INDEX[slug] : undefined;
  return entry?.pages.find((p) => p.legacyHashes?.includes(clean))?.key ?? null;
}

/**
 * Career slugs known to exist as published radar_fields rows. Every code guide
 * slug must be in this list (guides.test.ts): the event, visit and reel RPCs
 * reject unknown or unpublished slugs. `pnpm radar:check` verifies the list
 * against the database.
 */
export const KNOWN_PUBLISHED_RADAR_SLUGS: readonly string[] = [
  "cybersecurity",
  "ai-engineer",
  "software-engineer",
  "data-scientist",
];
