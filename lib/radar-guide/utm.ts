/**
 * Radar UTM vocabulary and URL building (spec 8.1). Pure.
 *
 * Mirrors the SQL in supabase/migrations/20261111100100_radar_visits.sql
 * (`private.radar_token`) and 20261111100200_radar_guide_events.sql
 * (`public.radar_channel`). Change both together.
 *
 * Links never carry a username, IGSID or any other personal field: the only
 * query parameters this module writes are the four utm_* keys.
 */
import {
  RADAR_CHAPTER_KEY_PATTERN,
  RADAR_PAGE_KEY_PATTERN,
  RADAR_SLUG_PATTERN,
  type RadarVideoKind,
  type UaApp,
} from "./types";

/** utm_source → utm_medium. */
export const RADAR_SOURCES = {
  "ig-comment-dm": "dm",
  "ig-comment-public": "comment",
  "ig-bio": "bio",
  "ig-story": "story",
  "tiktok-bio": "bio",
  "tiktok-alias": "alias",
  "yt-bio": "bio",
  share: "share",
  line: "social",
  shortlink: "unknown",
} as const;
export type RadarUtmSource = keyof typeof RADAR_SOURCES;
export type RadarUtmMedium = (typeof RADAR_SOURCES)[RadarUtmSource];

export const RADAR_UTM_CAMPAIGN = "radar";
export const RADAR_ORIGIN = "https://passionseed.org";

export function isRadarUtmSource(value: unknown): value is RadarUtmSource {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(RADAR_SOURCES, value);
}

export function radarMediumFor(source: RadarUtmSource): RadarUtmMedium {
  return RADAR_SOURCES[source];
}

const CASE_SENSITIVE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;
const LOWER_TOKEN = /^[a-z0-9][a-z0-9_.-]{0,63}$/;

/**
 * Mirror of `private.radar_token`. Case-insensitive tokens (source, medium,
 * campaign) are lowercased and at most 64 chars; case-sensitive tokens
 * (utm_content, which carries IG shortcodes) keep case and allow 100 chars.
 * Anything else, including spaces, Thai text and a leading "-", is null.
 */
export function sanitizeUtmToken(value: unknown, caseSensitive = false): string | null {
  if (typeof value !== "string") return null;
  if (caseSensitive) return CASE_SENSITIVE_TOKEN.test(value) ? value : null;
  const lower = value.toLowerCase();
  return LOWER_TOKEN.test(lower) ? lower : null;
}

/**
 * `<slug|hub>[-<page>]-<kind>-<shortcode|x>`, for example
 * `cybersecurity-mythos-founder-DA1b2C3`. The page is a code guide page key
 * and is only written with a valid slug. Characters outside the token
 * alphabet are dropped from the shortcode and the result is cut to the
 * 100-char limit, so the value always passes SQL.
 */
export function radarUtmContent({
  slug,
  page = null,
  kind,
  shortcode,
}: {
  slug: string | null;
  page?: string | null;
  kind: RadarVideoKind;
  shortcode: string | null;
}): string {
  const base = slug && RADAR_SLUG_PATTERN.test(slug) ? slug : "hub";
  const pagePart = base !== "hub" && page && RADAR_PAGE_KEY_PATTERN.test(page) ? `-${page}` : "";
  const head = `${base}${pagePart}-${kind}`;
  const code = (shortcode ?? "").replace(/[^A-Za-z0-9_-]/g, "") || "x";
  const value = `${head}-${code}`.slice(0, 100);
  return sanitizeUtmToken(value, true) ?? `${head}-x`;
}

export interface RadarUtm {
  source: string;
  medium: string;
  /** Defaults to "radar". */
  campaign?: string | null;
  content?: string | null;
}

/**
 * `https://passionseed.org/radar[/<slug>[/<page>]]?utm_source=..&utm_medium=..&utm_campaign=..[&utm_content=..][#hash]`.
 * Parameters are always in that order. Invalid tokens are dropped and an
 * invalid hash is dropped. An invalid slug or page throws (callers pass DB
 * slugs and code page keys). `page` is a code guide page; `hash` is only for
 * DB deck links and is ignored when a page is set.
 */
export function buildRadarUrl({
  slug,
  page = null,
  utm,
  hash,
  origin = RADAR_ORIGIN,
}: {
  slug: string | null;
  page?: string | null;
  utm?: RadarUtm | null;
  hash?: string | null;
  origin?: string;
}): string {
  if (slug !== null && !RADAR_SLUG_PATTERN.test(slug)) {
    throw new Error(`Invalid radar slug: ${slug}`);
  }
  if (page !== null && (slug === null || !RADAR_PAGE_KEY_PATTERN.test(page))) {
    throw new Error(`Invalid radar guide page: ${page}`);
  }
  const path = slug ? `/radar/${slug}${page ? `/${page}` : ""}` : "/radar";
  const params = new URLSearchParams();
  if (utm) {
    const pairs: Array<[string, string | null]> = [
      ["utm_source", sanitizeUtmToken(utm.source)],
      ["utm_medium", sanitizeUtmToken(utm.medium)],
      ["utm_campaign", sanitizeUtmToken(utm.campaign ?? RADAR_UTM_CAMPAIGN)],
      ["utm_content", sanitizeUtmToken(utm.content ?? null, true)],
    ];
    for (const [key, value] of pairs) if (value) params.append(key, value);
  }
  const query = params.toString();
  const fragment = !page && hash && RADAR_CHAPTER_KEY_PATTERN.test(hash) ? `#${hash}` : "";
  return `${origin.replace(/\/+$/, "")}${path}${query ? `?${query}` : ""}${fragment}`;
}

/**
 * Mirror of `public.radar_channel`: utm_source when tagged, otherwise inferred
 * from the in-app browser and referrer host. Matching is suffix-based like the
 * SQL `LIKE '%instagram.com'`.
 */
export function radarChannel({
  utmSource,
  referrerHost,
  uaApp,
}: {
  utmSource: string | null;
  referrerHost: string | null;
  uaApp: UaApp | null;
}): string {
  if (utmSource !== null) return utmSource;
  const ref = referrerHost;
  if (uaApp === "instagram" || (ref !== null && ref.endsWith("instagram.com"))) return "ig-untagged";
  if (uaApp === "tiktok" || (ref !== null && ref.endsWith("tiktok.com"))) return "tiktok-untagged";
  if (uaApp === "line" || uaApp === "facebook") return `${uaApp}-untagged`;
  if (ref === null || ref.endsWith("passionseed.org")) return "direct";
  return "referral";
}
