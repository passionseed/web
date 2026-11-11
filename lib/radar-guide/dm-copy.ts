/**
 * Fixed copy for the Instagram "radar" campaign (spec 5.3). Pure.
 *
 * Every message here is a fixed template: no names, no em dashes, never passed
 * to Qwen, never an invitation to a 1:1 chat. The follow line is a suggestion
 * after the link is delivered, never a condition for getting it.
 *
 * DMs carry a short `passionseed.org/r/<code>` link, not the long tagged URL:
 * long raw links in DMs read as phishing and get no preview. The utm tags live
 * on the `radar_links` row the code points at (see `radarLinkRowForReel`).
 */
import { CONTACT } from "@/lib/content/pathlab-page";
import { GUIDE_INDEX, guideIndexPage } from "@/lib/radar-guides";
import { RADAR_LINK_ALIASES } from "./short-links";
import { findDashes } from "./thai-copy";
import {
  RADAR_LINK_CODE_PATTERN,
  RADAR_PAGE_KEY_PATTERN,
  RADAR_SLUG_PATTERN,
  type GuidePageKey,
  type RadarVideoKind,
} from "./types";
import { RADAR_ORIGIN, RADAR_UTM_CAMPAIGN, radarUtmContent } from "./utm";

/** Meta's private-reply text limit is 1000 chars; the SQL CHECK matches. */
export const RADAR_DM_MAX_CHARS = 1000;

/** Shared `radar_links` row for hub reels and unmapped posts (seeded by migration 3.4). */
export const RADAR_HUB_DM_LINK_CODE = "hub-ig";

/** utm_source / utm_medium on every reel's DM link. */
export const RADAR_DM_UTM_SOURCE = "ig-comment-dm";
export const RADAR_DM_UTM_MEDIUM = "dm";

/** Public replies posted per rolling hour before we stop (the DM still goes out). */
export const RADAR_PUBLIC_REPLY_HOURLY_CAP = 30;

/** `https://passionseed.org/r/<code>`. Throws on a code the SQL CHECK would reject. */
export function radarShortUrl(code: string, origin: string = RADAR_ORIGIN): string {
  if (!RADAR_LINK_CODE_PATTERN.test(code)) throw new Error(`Invalid radar link code: ${code}`);
  return `${origin.replace(/\/+$/, "")}/r/${code}`;
}

function followLine(): string {
  return `กดติดตาม @${CONTACT.handle} ไว้ จะได้ไม่พลาดอาชีพถัดไป`;
}

const REQUEST_NEXT_LINE = "อยากให้ทำอาชีพไหนต่อ คอมเมนต์ชื่ออาชีพไว้ใต้คลิปได้เลย";

/** The fixed page line in a career DM whose reel maps to a code guide page (a level). */
export function radarDmPageLine(pageTitleTh: string): string {
  return `เริ่มที่ด่าน "${pageTitleTh.trim()}"`;
}

/**
 * DM for a reel mapped to one career. `label` is `radar_reels.career_label_th`.
 * `pageTitleTh` (a code guide page title, never free text) adds the page line.
 */
export function buildRadarCareerDm(label: string, url: string, pageTitleTh?: string | null): string {
  const clean = label.trim();
  if (!clean) throw new Error("A mapped Radar reel needs career_label_th for the DM");
  const page = pageTitleTh?.trim();
  return [
    `นี่คือลิงก์ Career Radar สาย ${clean} ที่ขอไว้`,
    url,
    ...(page ? [radarDmPageLine(page)] : []),
    "",
    "ข้างในมีเงินเดือนจริงในไทย AI จะกระทบงานนี้แค่ไหน และวิธีเริ่มลองได้ตั้งแต่สัปดาห์นี้",
    "",
    REQUEST_NEXT_LINE,
    followLine(),
  ].join("\n");
}

/** DM for hub reels and unmapped posts. */
export function buildRadarHubDm(url: string): string {
  return [
    "นี่คือลิงก์ Career Radar รวมทุกอาชีพที่เราทำไว้",
    url,
    "",
    "เลือกอาชีพที่อยากรู้ แล้วดูเงินเดือนจริงในไทย AI จะกระทบแค่ไหน และวิธีเริ่มลอง",
    "",
    REQUEST_NEXT_LINE,
    followLine(),
  ].join("\n");
}

export interface RadarDmCopyInput {
  /** Null for the hub. */
  fieldSlug: string | null;
  /** Required when `fieldSlug` is set. */
  careerLabelTh: string | null;
  /** The `radar_links` code; the hub uses `hub-ig`. */
  linkCode: string;
  /**
   * The reel's code guide page (`radar_reels.chapter_key`). When it is a page
   * of the career's guide, the DM names it from code; otherwise it is ignored.
   */
  pageKey?: GuidePageKey | null;
  origin?: string;
}

/** The title of a code guide page, for the DM page line, or null. */
export function radarDmPageTitle(fieldSlug: string | null, pageKey: string | null | undefined): string | null {
  if (!fieldSlug || !pageKey) return null;
  return guideIndexPage(fieldSlug, pageKey)?.titleTh ?? null;
}

export interface RadarDmCopy {
  message: string;
  link: string;
  variant: "career" | "hub";
}

/** Picks the career or hub template and checks the result against the house rules. */
export function buildRadarDm(input: RadarDmCopyInput): RadarDmCopy {
  const link = radarShortUrl(input.linkCode, input.origin);
  const variant = input.fieldSlug ? "career" : "hub";
  if (variant === "career" && !input.careerLabelTh?.trim()) {
    throw new Error("A mapped Radar reel needs career_label_th for the DM");
  }
  const message =
    variant === "career"
      ? buildRadarCareerDm(input.careerLabelTh!, link, radarDmPageTitle(input.fieldSlug, input.pageKey))
      : buildRadarHubDm(link);
  assertRadarCopy(message);
  return { message, link, variant };
}

/** Public reply variants (spec 5.3). None carries a link or invites a chat. */
export const RADAR_PUBLIC_REPLIES = [
  "ส่งลิงก์ไปใน DM แล้ว ถ้าไม่เจอ ลองดูในคำขอข้อความ หรือกดลิงก์ในไบโอได้เลย",
  "ส่งให้ทาง DM แล้ว ไม่เห็นลองเช็กกล่องคำขอข้อความ หรือไปที่ลิงก์ในไบโอ",
  "ลิงก์อยู่ใน DM แล้ว หรือกดจากลิงก์ในไบโอก็ได้",
] as const;

/** FNV-1a, so the same comment always gets the same variant. */
export function radarCopyHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** `@username <variant>`, the variant picked by `hash(commentId) % 3`. */
export function buildRadarPublicReply(username: string | null | undefined, commentId: string): string {
  const variant = RADAR_PUBLIC_REPLIES[radarCopyHash(commentId) % RADAR_PUBLIC_REPLIES.length];
  const handle = username?.trim().replace(/^@+/, "");
  const reply = handle ? `@${handle} ${variant}` : variant;
  assertRadarCopy(reply);
  return reply;
}

/**
 * The one automatic reply a Radar-origin thread ever gets (spec 5.6). Points
 * questions to public comments; never invites a private chat.
 */
export const RADAR_THREAD_REPLY =
  "ขอบคุณที่ทักมานะ ถ้ามีคำถาม คอมเมนต์ไว้ใต้คลิปได้เลย ทีมเราตอบในคอมเมนต์";

/** Quick-reply variant (flag RADAR_DM_QUICK_REPLY, off): the button and its payload. */
export const RADAR_QUICK_REPLY_TITLE = "ส่งลิงก์ให้เลย";
const QUICK_REPLY_PAYLOAD_PREFIX = "radar:";

export function radarQuickReplyPayload(radarCommentDmId: string): string {
  return `${QUICK_REPLY_PAYLOAD_PREFIX}${radarCommentDmId}`;
}

/** The `radar_comment_dms.id` in a quick-reply payload, or null for any other payload. */
export function parseRadarQuickReplyPayload(payload: string | null | undefined): string | null {
  if (!payload?.startsWith(QUICK_REPLY_PAYLOAD_PREFIX)) return null;
  const id = payload.slice(QUICK_REPLY_PAYLOAD_PREFIX.length);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

/** The private reply in the quick-reply flow: no link yet, one button. */
export function buildRadarQuickReplyPrompt(careerLabelTh: string | null): string {
  const label = careerLabelTh?.trim();
  const prompt = label
    ? `ได้รับคอมเมนต์แล้ว กดปุ่มด้านล่าง เดี๋ยวส่งลิงก์ Career Radar สาย ${label} ให้เลย`
    : "ได้รับคอมเมนต์แล้ว กดปุ่มด้านล่าง เดี๋ยวส่งลิงก์ Career Radar ให้เลย";
  assertRadarCopy(prompt);
  return prompt;
}

/** Throws when copy breaks a house rule. Used on every template before it is sent. */
export function assertRadarCopy(text: string): void {
  if (!text.trim()) throw new Error("Radar copy is empty");
  if (text.length > RADAR_DM_MAX_CHARS) throw new Error("Radar copy is over 1000 chars");
  if (findDashes(text).length > 0) throw new Error("Radar copy contains a dash");
}

const URL_IN_TEXT = /https:\/\/passionseed\.org\/r\/[a-z0-9][a-z0-9-]{1,31}/g;

function normalise(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

/**
 * Whether `text` is one of the fixed Radar templates, so the send gate can let
 * it through to a Radar-origin thread while blocking anything else.
 *
 * The career label is free text from `radar_reels`, so the career DM is
 * checked by shape: every line except the label and the link must match.
 */
export function isRadarFixedTemplate(text: string): boolean {
  const body = normalise(text);
  if (!body) return false;
  if (body === RADAR_THREAD_REPLY) return true;
  if (body === buildRadarQuickReplyPrompt(null)) return true;

  const urls = body.match(URL_IN_TEXT) ?? [];
  if (urls.length === 0) {
    const prompt = body.match(/^ได้รับคอมเมนต์แล้ว กดปุ่มด้านล่าง เดี๋ยวส่งลิงก์ Career Radar สาย (.{1,40}) ให้เลย$/);
    return Boolean(prompt && body === buildRadarQuickReplyPrompt(prompt[1]));
  }
  if (urls.length !== 1) return false;
  const url = urls[0];
  if (body === buildRadarHubDm(url)) return true;
  const label = body.match(/^นี่คือลิงก์ Career Radar สาย (.{1,40}) ที่ขอไว้\n/);
  if (!label) return false;
  if (body === buildRadarCareerDm(label[1], url)) return true;
  // The page line only ever carries a page title from code.
  const page = body.split("\n")[2]?.match(/^เริ่มที่ด่าน "(.{1,120})"$/);
  return Boolean(page && KNOWN_PAGE_TITLES.has(page[1]) && body === buildRadarCareerDm(label[1], url, page[1]));
}

const KNOWN_PAGE_TITLES: ReadonlySet<string> = new Set(
  Object.values(GUIDE_INDEX).flatMap((guide) => guide.pages.map((p) => p.titleTh.trim()))
);

// ---------------------------------------------------------------------------
// Short-link rows for reels (used by upsertReel)
// ---------------------------------------------------------------------------

/**
 * Short alias per career for link codes (other slugs use their first segment,
 * cut to 12 chars): the inverse of the typeable aliases (`cyber` ->
 * cybersecurity) and each code guide's `alias`, so a DM link reads like the
 * alias a student could type.
 */
const SLUG_ALIAS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(RADAR_LINK_ALIASES).map(([alias, slug]) => [slug, alias])),
  ...Object.fromEntries(Object.values(GUIDE_INDEX).map((guide) => [guide.slug, guide.alias])),
};

export function radarLinkAlias(slug: string | null): string {
  if (!slug) return "hub";
  if (Object.prototype.hasOwnProperty.call(SLUG_ALIAS, slug)) return SLUG_ALIAS[slug];
  const first = slug.split("-")[0]?.replace(/[^a-z0-9]/g, "").slice(0, 12);
  return first && first.length >= 2 ? first : "radar";
}

const CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Four random [a-z0-9] characters. `random` is injectable for tests. */
export function randomCodeSuffix(random: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 4; i += 1) {
    out += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  }
  return out;
}

/**
 * `<alias>[-<page>]-<4 random>`, at most 32 chars, always passing the SQL
 * CHECK. Page underscores become dashes (the /r resolver maps them back); a
 * long page is cut so the random part always fits.
 */
export function buildReelLinkCode(
  { slug, pageKey }: { slug: string | null; pageKey: GuidePageKey | null },
  random: () => number = Math.random
): string {
  const suffix = randomCodeSuffix(random);
  const page = slug && pageKey && RADAR_PAGE_KEY_PATTERN.test(pageKey) ? pageKey : null;
  const parts = [radarLinkAlias(slug), page].filter(Boolean) as string[];
  const head = parts.join("-").replace(/_/g, "-").slice(0, 32 - suffix.length - 1).replace(/-+$/, "");
  const code = `${head}-${suffix}`;
  if (!RADAR_LINK_CODE_PATTERN.test(code)) throw new Error(`Generated an invalid link code: ${code}`);
  return code;
}

export interface RadarReelLinkRow {
  code: string;
  field_slug: string | null;
  /** The guide page key (the column keeps its old name). */
  chapter_key: GuidePageKey | null;
  reel_id: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  is_active: boolean;
}

/** The `radar_links` row a mapped career reel gets. Hub reels use `hub-ig` instead. */
export function radarLinkRowForReel(
  reel: {
    id: string;
    fieldSlug: string | null;
    pageKey: GuidePageKey | null;
    videoKind: RadarVideoKind;
    shortcode: string | null;
  },
  random: () => number = Math.random
): RadarReelLinkRow {
  if (reel.fieldSlug !== null && !RADAR_SLUG_PATTERN.test(reel.fieldSlug)) {
    throw new Error(`Invalid radar slug: ${reel.fieldSlug}`);
  }
  const page = reel.fieldSlug && reel.pageKey && RADAR_PAGE_KEY_PATTERN.test(reel.pageKey) ? reel.pageKey : null;
  return {
    code: buildReelLinkCode({ slug: reel.fieldSlug, pageKey: page }, random),
    field_slug: reel.fieldSlug,
    chapter_key: page,
    reel_id: reel.id,
    utm_source: RADAR_DM_UTM_SOURCE,
    utm_medium: RADAR_DM_UTM_MEDIUM,
    utm_campaign: RADAR_UTM_CAMPAIGN,
    utm_content: radarUtmContent({
      slug: reel.fieldSlug,
      page,
      kind: reel.videoKind,
      shortcode: reel.shortcode,
    }),
    is_active: true,
  };
}
