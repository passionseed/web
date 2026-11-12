/**
 * Share and follow targets for the Radar guide (spec 2.8). Pure.
 *
 * The IG account is `CONTACT` from lib/content/pathlab-page.ts; this module
 * re-exports it rather than adding a second constant for the handle.
 */
import { CONTACT } from "@/lib/content/pathlab-page";
import { GUIDE_INDEX } from "@/lib/radar-guides";
import type { GuideShareTarget, UaApp } from "./types";
import { buildRadarUrl, RADAR_ORIGIN } from "./utm";

export { CONTACT };

/**
 * PassionSeed's TikTok profile. Null until the founder confirms the account
 * URL; while null, TikTok visitors get the IG follow link instead.
 */
export const PASSIONSEED_TIKTOK_URL: string | null = null;

/**
 * The career URL tagged as a share: utm_source=share. With a code guide
 * `page`, the link opens the page the student is on and utm_content is
 * `<slug>-<page>`; otherwise it is `<slug>`. `content` overrides the tag (the
 * profile card shares `<slug>-card` and lands on the guide cover).
 */
export function radarShareUrl(slug: string, page: string | null = null, content?: string): string {
  return buildRadarUrl({
    slug,
    page,
    utm: {
      source: "share",
      medium: "share",
      campaign: "radar",
      content: content ?? (page ? `${slug}-${page}` : slug),
    },
  });
}

/**
 * utm_content for a shared profile card. Matches what `/r/<alias>-card`
 * tags (lib/radar-guide/short-links.ts), so both routes count together.
 */
export const radarProfileShareTag = (slug: string) => `${slug}-card`;

/**
 * The typeable link shared with, and printed on, the profile card:
 * `passionseed.org/r/cyber-card`. It lands on the guide cover (a friend starts
 * from level 1) tagged utm_source=share, utm_content=`<slug>-card`. A plain
 * `/r/cyber` would be counted as TikTok alias traffic instead.
 */
export function radarProfileShortLink(slug: string, origin: string = RADAR_ORIGIN): { url: string; label: string } {
  const guide = Object.prototype.hasOwnProperty.call(GUIDE_INDEX, slug) ? GUIDE_INDEX[slug] : null;
  const url = `${origin.replace(/\/$/, "")}/r/${guide?.alias || slug}-card`;
  return { url, label: url.replace(/^https?:\/\//, "") };
}

/** The text sent with a share. No dashes, no username, no tracking ids. */
export function radarShareText(careerNameTh: string | null | undefined): string {
  const name = (careerNameTh ?? "").trim();
  return name
    ? `${name} ทำงานอะไร เงินเดือนเท่าไร AI จะมาแทนไหม ดูข้อมูลจริงได้ที่นี่`
    : "อาชีพนี้ทำงานอะไร เงินเดือนเท่าไร ดูข้อมูลจริงได้ที่นี่";
}

/** Share text from inside a code guide (a game run, not a report). No dashes, no names. */
export function radarGuideShareText(careerNameTh: string | null | undefined): string {
  const name = (careerNameTh ?? "").trim();
  return name
    ? `ลองเล่นไกด์สาย${name} เป็นด่านสั้นๆ ใช้ข้อมูลจริง แล้วดูว่าสายนี้ใช่เราไหม`
    : "ลองเล่นไกด์อาชีพ เป็นด่านสั้นๆ ใช้ข้อมูลจริง แล้วดูว่าสายนี้ใช่เราไหม";
}

/**
 * Text sent with a profile card ("โปรไฟล์สายไซเบอร์ของฉัน"): the card title
 * and its trait labels only. Never a name, never free text the student typed.
 */
export function radarProfileShareText(titleTh: string, traitLabelsTh: readonly string[]): string {
  const traits = traitLabelsTh
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3);
  const head = titleTh.trim() || "โปรไฟล์ของฉัน";
  return traits.length
    ? `${head}: ${traits.join(" · ")} ลองเล่นแล้วดูว่าของเธอได้อะไร`
    : `${head} ลองเล่นแล้วดูว่าของเธอได้อะไร`;
}

/** LINE's share endpoint, with the text and link in one message. */
export function lineShareHref(text: string, url: string): string {
  return `https://line.me/R/share?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

/**
 * The native share sheet replaces the two buttons only when the browser says it
 * can share this payload and the visitor is not in Instagram's in-app browser
 * (where `navigator.share` is unreliable).
 */
export function shouldUseNativeShare({
  uaApp,
  canShare,
}: {
  uaApp: UaApp | null;
  canShare: boolean;
}): boolean {
  return canShare && uaApp !== "instagram";
}

/** Reads `navigator.canShare?.(data)` safely; false on the server or on any error. */
export function browserCanShare(data: ShareData): boolean {
  if (typeof navigator === "undefined") return false;
  try {
    return typeof navigator.share === "function" && navigator.canShare?.(data) === true;
  } catch {
    return false;
  }
}

export type FollowPlatform = "instagram" | "tiktok";

export interface FollowTarget {
  platform: FollowPlatform;
  href: string;
  labelTh: string;
}

export const FOLLOW_IG_LABEL_TH = `ติดตาม @${CONTACT.handle} จะได้ไม่พลาดอาชีพถัดไป`;
export const FOLLOW_TIKTOK_LABEL_TH = "ติดตามใน TikTok";

/** A TikTok visitor: the TikTok in-app browser, or a last touch tagged `tiktok-*`. */
export function isTikTokVisitor({
  uaApp,
  utmSource,
}: {
  uaApp: UaApp | null;
  utmSource: string | null;
}): boolean {
  return uaApp === "tiktok" || (utmSource ?? "").startsWith("tiktok-");
}

/**
 * TikTok visitors follow on TikTok when the profile URL is set; everyone else
 * (and TikTok visitors while it is unset) follows the IG account.
 */
export function followTarget({
  uaApp,
  utmSource,
  tiktokUrl = PASSIONSEED_TIKTOK_URL,
}: {
  uaApp: UaApp | null;
  utmSource: string | null;
  tiktokUrl?: string | null;
}): FollowTarget {
  if (tiktokUrl && isTikTokVisitor({ uaApp, utmSource })) {
    return { platform: "tiktok", href: tiktokUrl, labelTh: FOLLOW_TIKTOK_LABEL_TH };
  }
  return { platform: "instagram", href: CONTACT.href, labelTh: FOLLOW_IG_LABEL_TH };
}

// ---------------------------------------------------------------------------
// Other careers (end of a run)
// ---------------------------------------------------------------------------

/** The pilot careers, offered as request chips and "ดูอาชีพอื่น" cards. Thai names from radar_fields. */
export const RADAR_PILOT_CAREERS: readonly { slug: string; nameTh: string }[] = [
  { slug: "cybersecurity", nameTh: "ไซเบอร์ซีเคียวริตี้" },
  { slug: "ai-engineer", nameTh: "วิศวกร AI" },
  { slug: "software-engineer", nameTh: "นักพัฒนาซอฟต์แวร์" },
  { slug: "data-scientist", nameTh: "นักวิทยาศาสตร์ข้อมูล" },
];

export interface OtherCareerCard {
  slug: string;
  nameTh: string;
  /** A code guide's cold open (its first level's title); null for deck careers. */
  hookTh: string | null;
  href: string;
}

/** The other pilot careers, code guides first, never the current one. */
export function otherCareerCards(currentSlug: string): OtherCareerCard[] {
  return RADAR_PILOT_CAREERS.filter((c) => c.slug !== currentSlug)
    .map((career) => {
      const guide = Object.prototype.hasOwnProperty.call(GUIDE_INDEX, career.slug) ? GUIDE_INDEX[career.slug] : null;
      const first = guide ? [...guide.pages].sort((a, b) => a.order - b.order)[0] : null;
      return {
        slug: career.slug,
        nameTh: guide?.nameTh ?? career.nameTh,
        hookTh: first?.titleTh ?? null,
        href: `/radar/${career.slug}`,
      };
    })
    .sort((a, b) => Number(b.hookTh !== null) - Number(a.hookTh !== null));
}

export type { GuideShareTarget };
