/**
 * `/r/<code>` resolution (docs/features/radar-guides-in-code.md 4.2).
 *
 * Pure apart from the injected lookups, so the route stays thin and this
 * logic is tested without a database. In order:
 *   1. an active `radar_links` row. `chapter_key` holds a code guide page key
 *      (or a legacy deck chapter, mapped through the page's legacyHashes).
 *   2. the typeable pattern `<alias|slug>[-<page>][-<ig|tt|yt|story>]`, parsed
 *      longest known prefix first (`ai-engineer-agents` is `ai-engineer` +
 *      `agents`; `ai-agents` is `ai` + `agents`). An unknown page still lands
 *      on the career: `cyber-nope` goes to `/radar/cybersecurity`.
 *   3. otherwise the hub, tagged `shortlink` / `unknown`
 *
 * A page only becomes part of the path when the career has a code guide that
 * is visible on this deployment (`pagesFor`). Otherwise the link lands on
 * `/radar/<slug>`, with no hash: the guide cover redirects legacy hashes on
 * its own, and the deck no longer has chapter anchors.
 *
 * The result is always a path on our own site: nothing here can produce an
 * outside URL, whatever the code or the database row contains.
 */
import { GUIDE_INDEX, guidePageKeys, legacyHashPage, liveGuideIndex } from "@/lib/radar-guides";
import { buildRadarUrl, sanitizeUtmToken, type RadarUtm } from "./utm";
import {
  RADAR_LINK_CODE_PATTERN,
  RADAR_PAGE_KEY_PATTERN,
  RADAR_SLUG_PATTERN,
  type GuidePageKey,
  type RadarLinkRow,
} from "./types";

/**
 * Typeable aliases for TikTok captions and end cards, e.g. passionseed.org/r/cyber.
 * Code guides add their own `alias` (lib/radar-guides); these cover the deck pilots.
 */
export const RADAR_LINK_ALIASES = {
  cyber: "cybersecurity",
  ai: "ai-engineer",
  data: "data-scientist",
  dev: "software-engineer",
} as const;
export type RadarLinkAlias = keyof typeof RADAR_LINK_ALIASES;

/**
 * Channel suffixes: `cyber-tt` is the TikTok bio, `cyber-story` an IG story,
 * `cyber-card` the link shared with (and printed on) a student's profile card,
 * counted as a share rather than as TikTok alias traffic.
 */
export const RADAR_LINK_SUFFIXES = {
  ig: { source: "ig-bio", medium: "bio" },
  tt: { source: "tiktok-bio", medium: "bio" },
  yt: { source: "yt-bio", medium: "bio" },
  story: { source: "ig-story", medium: "story" },
  card: { source: "share", medium: "share" },
} as const;
export type RadarLinkSuffix = keyof typeof RADAR_LINK_SUFFIXES;

/** A bare alias or slug is typed from a TikTok caption or end card. */
export const RADAR_ALIAS_DEFAULT_UTM = { source: "tiktok-alias", medium: "alias" } as const;
/** Anything we cannot resolve lands on the hub with this tag. */
export const RADAR_SHORTLINK_FALLBACK_UTM = { source: "shortlink", medium: "unknown" } as const;
/** Logged as the click's code when the typed code is not even well formed. */
export const RADAR_INVALID_CODE = "invalid";

/** Longest code we try at all: the link pattern allows 32, slugs can be longer. */
const MAX_CODE_LENGTH = 80;
/** Prefix splits tried per code; real codes have at most a few dashes. */
const MAX_PREFIX_SPLITS = 6;
const CODE_SHAPE = /^[a-z0-9][a-z0-9-]*$/;

export type ShortLinkRow = Pick<
  RadarLinkRow,
  "code" | "field_slug" | "chapter_key" | "utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "is_active"
>;

export interface ShortLinkDeps {
  /** The `radar_links` row for this code, or null. */
  lookup(code: string): Promise<ShortLinkRow | null>;
  isPublishedSlug(slug: string): Promise<boolean>;
  /**
   * Page keys of the career's code guide when that guide is visible on this
   * deployment, else null. Pure, from GUIDE_INDEX. Defaults to
   * `defaultGuidePagesFor`.
   */
  pagesFor?(slug: string): readonly string[] | null;
}

/** Live (or, off production, draft) guide pages for a slug, from the code index. */
export function defaultGuidePagesFor(slug: string): readonly string[] | null {
  return liveGuideIndex(slug) ? guidePageKeys(slug) : null;
}

export type ShortLinkKind = "link" | "alias" | "slug" | "fallback";

export interface ShortLinkResolution {
  kind: ShortLinkKind;
  /** What the click log stores: the resolved code, the alias, or the fallback marker. */
  logCode: string;
  fieldSlug: string | null;
  /**
   * The guide page the link points at (a key of the career's code guide), or
   * null. It is in `path` only when the guide is visible on this deployment.
   */
  pageKey: GuidePageKey | null;
  utm: RadarUtm;
  /** Site-relative destination: `/radar[/<slug>[/<page>]]?utm_...`. */
  path: string;
}

/** Lowercased and trimmed; null when it cannot be a code, alias or slug. */
export function normalizeShortCode(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  let code = raw;
  try {
    code = decodeURIComponent(raw);
  } catch {
    // Keep the raw value; the shape check below rejects it if it is odd.
  }
  code = code.trim().toLowerCase().replace(/\/+$/, "");
  if (!code || code.length > MAX_CODE_LENGTH || !CODE_SHAPE.test(code)) return null;
  return code;
}

function own<T extends object>(record: T, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

/** The career slug for a typeable alias: the deck pilots, then any code guide's `alias`. */
export function slugForAlias(base: string): string | null {
  if (own(RADAR_LINK_ALIASES, base)) return RADAR_LINK_ALIASES[base as RadarLinkAlias];
  return Object.values(GUIDE_INDEX).find((guide) => guide.alias === base)?.slug ?? null;
}

/** `cyber-tt` → { base: "cyber", suffix: "tt" }; no recognised suffix → the whole code. */
export function splitShortCode(code: string): { base: string; suffix: RadarLinkSuffix | null } {
  for (const suffix of Object.keys(RADAR_LINK_SUFFIXES) as RadarLinkSuffix[]) {
    const ending = `-${suffix}`;
    if (code.endsWith(ending) && code.length > ending.length) {
      return { base: code.slice(0, -ending.length), suffix };
    }
  }
  return { base: code, suffix: null };
}

/**
 * `(prefix, rest)` splits of a code, longest prefix first:
 * `ai-engineer-agents` → (all, null), (ai-engineer, agents), (ai, engineer-agents).
 */
export function prefixSplits(base: string): Array<{ prefix: string; rest: string | null }> {
  const out: Array<{ prefix: string; rest: string | null }> = [{ prefix: base, rest: null }];
  for (let i = base.lastIndexOf("-"); i > 0 && out.length <= MAX_PREFIX_SPLITS; i = base.lastIndexOf("-", i - 1)) {
    const rest = base.slice(i + 1);
    if (rest) out.push({ prefix: base.slice(0, i), rest });
  }
  return out;
}

/**
 * The page key a token stands for in a career's guide: the key itself
 * (dashes typed for underscores), or a legacy deck chapter from the page's
 * `legacyHashes` (`hook` → the first page). Null when the career has no such
 * page. `known` lists the guide's keys when the caller already has them.
 */
export function guidePageForToken(
  slug: string,
  token: string | null | undefined,
  known: readonly string[] | null = guidePageKeys(slug)
): string | null {
  if (!token) return null;
  const key = token.replace(/-/g, "_");
  if (!RADAR_PAGE_KEY_PATTERN.test(key)) return null;
  if (known?.includes(key)) return key;
  const legacy = legacyHashPage(slug, key);
  return legacy && (known?.includes(legacy) ?? false) ? legacy : null;
}

function aliasUtm(slug: string, page: string | null, suffix: RadarLinkSuffix | null): RadarUtm {
  const channel = suffix ? RADAR_LINK_SUFFIXES[suffix] : RADAR_ALIAS_DEFAULT_UTM;
  return {
    source: channel.source,
    medium: channel.medium,
    campaign: "radar",
    content: sanitizeUtmToken(`${slug}${page ? `-${page}` : ""}-${suffix ?? "alias"}`, true),
  };
}

function fallback(logCode: string): ShortLinkResolution {
  const utm: RadarUtm = { ...RADAR_SHORTLINK_FALLBACK_UTM, campaign: "radar" };
  return {
    kind: "fallback",
    logCode,
    fieldSlug: null,
    pageKey: null,
    utm,
    path: buildRadarUrl({ slug: null, utm, origin: "" }),
  };
}

interface Resolver {
  deps: ShortLinkDeps;
  pagesFor(slug: string): readonly string[] | null;
  /** Live pages if any, else every page of the code guide (any status), for parsing. */
  knownPages(slug: string): readonly string[] | null;
}

function resolved(
  r: Resolver,
  kind: Exclude<ShortLinkKind, "fallback">,
  logCode: string,
  fieldSlug: string | null,
  pageKey: string | null,
  utm: RadarUtm
): ShortLinkResolution {
  const routed = fieldSlug && pageKey && r.pagesFor(fieldSlug)?.includes(pageKey) ? pageKey : null;
  return {
    kind,
    logCode,
    fieldSlug,
    pageKey: fieldSlug ? pageKey : null,
    utm,
    path: buildRadarUrl({ slug: fieldSlug, page: routed, utm, origin: "" }),
  };
}

async function fromRow(r: Resolver, row: ShortLinkRow): Promise<ShortLinkResolution | null> {
  const source = sanitizeUtmToken(row.utm_source);
  const medium = sanitizeUtmToken(row.utm_medium);
  if (!source || !medium) return null;
  const utm: RadarUtm = {
    source,
    medium,
    campaign: sanitizeUtmToken(row.utm_campaign) ?? "radar",
    content: sanitizeUtmToken(row.utm_content, true),
  };
  const slug = row.field_slug && RADAR_SLUG_PATTERN.test(row.field_slug) ? row.field_slug : null;
  // An unpublished career would 404: send the visitor to the hub, keep the tags.
  if (slug && !(await r.deps.isPublishedSlug(slug))) {
    return resolved(r, "link", row.code, null, null, utm);
  }
  const page = slug ? guidePageForToken(slug, row.chapter_key, r.knownPages(slug)) : null;
  return resolved(r, "link", row.code, slug, page, utm);
}

interface PrefixHit {
  slug: string;
  kind: "alias" | "slug";
  published: boolean;
}

export async function resolveShortLink(
  rawCode: string | null | undefined,
  deps: ShortLinkDeps
): Promise<ShortLinkResolution> {
  const pagesFor = (slug: string) => (deps.pagesFor ?? defaultGuidePagesFor)(slug);
  const r: Resolver = { deps, pagesFor, knownPages: (slug) => pagesFor(slug) ?? guidePageKeys(slug) };

  const code = normalizeShortCode(rawCode);
  if (!code) return fallback(RADAR_INVALID_CODE);

  // 1. A radar_links row.
  if (RADAR_LINK_CODE_PATTERN.test(code)) {
    const row = await deps.lookup(code);
    if (row && row.is_active && row.code === code) {
      const result = await fromRow(r, row);
      if (result) return result;
    }
  }

  // 2. <alias|slug>[-<page>][-<suffix>]. Aliases need no lookup; a slug must
  //    be published. Each prefix is looked up at most once.
  const published = new Map<string, boolean>();
  const matchPrefix = async (prefix: string): Promise<PrefixHit | null> => {
    const aliasSlug = slugForAlias(prefix);
    if (aliasSlug) {
      if (!published.has(aliasSlug)) published.set(aliasSlug, await deps.isPublishedSlug(aliasSlug));
      return { slug: aliasSlug, kind: "alias", published: published.get(aliasSlug)! };
    }
    if (!RADAR_SLUG_PATTERN.test(prefix)) return null;
    if (!published.has(prefix)) published.set(prefix, await deps.isPublishedSlug(prefix));
    return published.get(prefix) ? { slug: prefix, kind: "slug", published: true } : null;
  };
  const land = (hit: PrefixHit, page: string | null, suffix: RadarLinkSuffix | null) =>
    hit.published
      ? resolved(r, hit.kind, code, hit.slug, page, aliasUtm(hit.slug, page, suffix))
      : // A known alias for a career that is not live: hub, with the channel kept.
        resolved(r, hit.kind, code, null, null, aliasUtm(hit.slug, null, suffix));

  // The bare code goes first, so a slug that happens to end in "-ig" still
  // resolves as itself.
  const split = splitShortCode(code);
  const bases = split.suffix ? [{ base: code, suffix: null }, split] : [{ base: code, suffix: null }];
  let loose: { hit: PrefixHit; suffix: RadarLinkSuffix | null } | null = null;

  for (const { base, suffix } of bases) {
    for (const { prefix, rest } of prefixSplits(base)) {
      const hit = await matchPrefix(prefix);
      if (!hit) continue;
      if (rest === null) return land(hit, null, suffix);
      const page = guidePageForToken(hit.slug, rest, r.knownPages(hit.slug));
      if (page) return land(hit, page, suffix);
      // Career known, page not: remember it in case nothing matches exactly.
      loose ??= { hit, suffix };
    }
  }
  if (loose) return land(loose.hit, null, loose.suffix);

  // 3. Unknown: hub. Only well-formed codes are logged as typed (typo analysis).
  return fallback(RADAR_LINK_CODE_PATTERN.test(code) ? code : RADAR_INVALID_CODE);
}
