/**
 * Admin reel mapper and short-link editor input (spec 6, item 3;
 * docs/features/radar-guides-in-code.md 4.2). Pure.
 *
 * A reel or link maps to a career and, for a career with a code guide, one of
 * that guide's pages (`pageKey`, stored in the `chapter_key` column). A deck
 * career has no pages, so its `pageKey` must be null. Reel rows are validated
 * again by `reelUpsertRow` in lib/supabase/radar-reels.ts with the same rule.
 */
import { z } from "zod";
import { guidePageKeys } from "@/lib/radar-guides";
import { findDashes } from "./thai-copy";
import { sanitizeUtmToken } from "./utm";
import {
  RADAR_LINK_CODE_PATTERN,
  RADAR_PAGE_KEY_PATTERN,
  RADAR_REEL_ANGLES,
  RADAR_REEL_PLATFORMS,
  RADAR_SLUG_PATTERN,
  RADAR_VIDEO_KINDS,
  type RadarReelPlatform,
} from "./types";

// ---------------------------------------------------------------------------
// Guide page of a reel or link
// ---------------------------------------------------------------------------

/**
 * Why `pageKey` cannot point at `fieldSlug`, or null when it can. A page needs
 * a career with a code guide (any status: drafts are mapped before they go
 * live) and must be one of its pages. `pagesFor` is injectable for tests.
 */
export function guidePageError(
  fieldSlug: string | null,
  pageKey: string | null | undefined,
  pagesFor: (slug: string) => readonly string[] | null = guidePageKeys
): string | null {
  if (pageKey == null || pageKey === "") return null;
  if (!fieldSlug) return "Hub links and reels have no guide page";
  if (!RADAR_PAGE_KEY_PATTERN.test(pageKey)) return "Unknown guide page";
  const pages = pagesFor(fieldSlug);
  if (!pages) return "This career has no code guide, so it has no pages";
  return pages.includes(pageKey) ? null : "That page is not in this career's guide";
}

const pageKeyField = z
  .string()
  .regex(RADAR_PAGE_KEY_PATTERN, "Unknown guide page")
  .nullable()
  .optional();

// ---------------------------------------------------------------------------
// Pasted permalink or shortcode
// ---------------------------------------------------------------------------

export interface ParsedReelInput {
  platform: RadarReelPlatform;
  /** IG shortcode, TikTok video id or YouTube video id. */
  shortcode: string | null;
  /** Normalised permalink that passes the DB CHECK, or null. */
  permalink: string | null;
}

const IG_PATH = /^\/(?:[A-Za-z0-9._]+\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]{5,40})\/?$/;
const TT_PATH = /^\/@([A-Za-z0-9._]{1,40})\/video\/(\d{5,40})\/?$/;
const YT_SHORTS = /^\/shorts\/([A-Za-z0-9_-]{5,40})\/?$/;
const BARE_SHORTCODE = /^[A-Za-z0-9_-]{5,40}$/;

/**
 * Parses an Instagram, TikTok or YouTube link, or a bare IG shortcode.
 * Returns null for anything else (including TikTok short links such as
 * vm.tiktok.com, which the DB permalink CHECK does not accept).
 */
export function parseReelInput(raw: string): ParsedReelInput | null {
  const text = raw.trim();
  if (!text) return null;
  if (BARE_SHORTCODE.test(text)) {
    return { platform: "instagram", shortcode: text, permalink: `https://www.instagram.com/reel/${text}/` };
  }
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
  const path = url.pathname;

  if (host === "instagram.com") {
    const match = IG_PATH.exec(path);
    if (!match) return null;
    return { platform: "instagram", shortcode: match[1], permalink: `https://www.instagram.com/reel/${match[1]}/` };
  }
  if (host === "tiktok.com") {
    const match = TT_PATH.exec(path);
    if (!match) return null;
    return {
      platform: "tiktok",
      shortcode: match[2],
      permalink: `https://www.tiktok.com/@${match[1]}/video/${match[2]}`,
    };
  }
  if (host === "youtube.com" || host === "youtu.be") {
    const id =
      host === "youtu.be"
        ? path.replace(/^\//, "").replace(/\/$/, "")
        : YT_SHORTS.exec(path)?.[1] ?? url.searchParams.get("v") ?? "";
    if (!/^[A-Za-z0-9_-]{5,40}$/.test(id)) return null;
    return { platform: "youtube", shortcode: id, permalink: `https://www.youtube.com/shorts/${id}` };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Reel upsert body
// ---------------------------------------------------------------------------

export const ReelUpsertBody = z
  .object({
    id: z.string().uuid().optional(),
    platform: z.enum(RADAR_REEL_PLATFORMS),
    mediaId: z.string().regex(/^[0-9_]{5,64}$/).nullable().optional(),
    shortcode: z.string().regex(/^[A-Za-z0-9_-]{5,40}$/).nullable().optional(),
    permalink: z
      .string()
      .regex(/^https:\/\/(www\.)?(instagram\.com|tiktok\.com|youtube\.com)\//)
      .max(500)
      .nullable()
      .optional(),
    /** Null maps the reel to the hub. */
    fieldSlug: z.string().regex(RADAR_SLUG_PATTERN).nullable(),
    /** Code guide page the DM link opens (null: the career cover or deck). */
    pageKey: pageKeyField,
    videoKind: z.enum(RADAR_VIDEO_KINDS).default("founder"),
    /** Legacy; the page flow does not ask for it. */
    angle: z.enum(RADAR_REEL_ANGLES).nullable().optional(),
    isTrial: z.boolean().default(false),
    /** Which take: 0 is the page's reel hook, 1 and 2 its variants. */
    hookVariant: z.number().int().min(0).max(9).nullable().optional(),
    careerLabelTh: z.string().trim().max(40).nullable().optional(),
    dmEnabled: z.boolean().default(true),
    postedAt: z.string().datetime({ offset: true }).nullable().optional(),
    note: z.string().max(200).nullable().optional(),
  })
  .superRefine((input, ctx) => {
    if (input.fieldSlug && !input.careerLabelTh?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["careerLabelTh"],
        message: 'A reel mapped to a career needs a short label for the DM, for example "ไซเบอร์"',
      });
    }
    if (input.careerLabelTh && findDashes(input.careerLabelTh).length > 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["careerLabelTh"], message: "No dashes in the label" });
    }
    const pageError = guidePageError(input.fieldSlug, input.pageKey);
    if (pageError) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pageKey"], message: pageError });
    if (input.platform === "instagram" && !input.mediaId && !input.shortcode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mediaId"],
        message: "Pick the post from the list or paste its link",
      });
    }
  });
export type ReelUpsertBodyInput = z.infer<typeof ReelUpsertBody>;

// ---------------------------------------------------------------------------
// Short-link edits
// ---------------------------------------------------------------------------

/** Bio and shared DM links always point at the hub (spec 1, bio links; 5.3). */
export const HUB_ONLY_LINK_CODES: ReadonlySet<string> = new Set(["ig", "tt", "hub-ig"]);

const utmToken = (caseSensitive: boolean) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      const token = sanitizeUtmToken(value, caseSensitive);
      if (!token) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Use letters, digits, dot, dash or underscore" });
        return z.NEVER;
      }
      return token;
    });

export const LinkUpsertBody = z
  .object({
    code: z.string().trim().toLowerCase().regex(RADAR_LINK_CODE_PATTERN, "2-32 chars: a-z, 0-9 and dashes"),
    fieldSlug: z.string().regex(RADAR_SLUG_PATTERN).nullable(),
    /** Code guide page the link opens (null: the career cover or deck). */
    pageKey: pageKeyField,
    utmSource: utmToken(false),
    utmMedium: utmToken(false),
    utmCampaign: utmToken(false).default("radar"),
    utmContent: z.union([utmToken(true), z.literal("").transform(() => null), z.null()]).optional(),
    isActive: z.boolean().default(true),
    note: z.string().max(200).nullable().optional(),
  })
  .superRefine((input, ctx) => {
    if (HUB_ONLY_LINK_CODES.has(input.code) && (input.fieldSlug || input.pageKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fieldSlug"],
        message: `"${input.code}" always points at the hub`,
      });
    }
    const pageError = guidePageError(input.fieldSlug, input.pageKey);
    if (pageError) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pageKey"], message: pageError });
  });
export type LinkUpsertBodyInput = z.infer<typeof LinkUpsertBody>;

/** A recent Instagram post offered by the reel mapper (from Graph `listInstagramMedia`). */
export interface RadarMediaOption {
  id: string;
  shortcode: string | null;
  permalink: string | null;
  caption: string | null;
  timestamp: string;
  thumbnailUrl: string | null;
  productType: string | null;
}
