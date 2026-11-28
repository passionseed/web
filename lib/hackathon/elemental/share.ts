import { ELEMENTAL, prizeTotal, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";

import { elementalRegistrationOpen } from "./registration";

/**
 * Share links: a personal poster and link per student or teacher, counting
 * the real devices that open it. Sharing earns looks only (team-name styles
 * and the board), never a free seat (Big, 2026-11-27). Rules: ./share-rules.ts.
 */
export const SHARE = {
  /** How often an open share page refreshes its numbers. */
  pollMs: 20_000,
} as const;

/** The share page is on only when ELEMENTAL_SHARE_OPEN=1 and sign-up is still open. */
export function shareOpen(env: NodeJS.ProcessEnv = process.env, now: Date = new Date()): boolean {
  return env.ELEMENTAL_SHARE_OPEN === "1" && elementalRegistrationOpen(now);
}

/** The end of Demo Day, Bangkok time: share pages stay up, read-only, until then. */
export function shareReadOnlyEndsAt(): Date {
  return new Date(`${ELEMENTAL.demoDay.date}T23:59:59+07:00`);
}

/**
 * Where sharing is, with ELEMENTAL_SHARE_OPEN=1 as the master switch:
 * - "open": until sign-up closes. Links can be made, shared and counted.
 * - "after-close": from sign-up close to the end of Demo Day. Pages stay up
 *   read-only (numbers frozen at close). No new links, no poster actions.
 * - "off": the switch is off, or Demo Day is over.
 */
export type SharePhase = "open" | "after-close" | "off";
export function sharePhase(env: NodeJS.ProcessEnv = process.env, now: Date = new Date()): SharePhase {
  if (env.ELEMENTAL_SHARE_OPEN !== "1") return "off";
  if (elementalRegistrationOpen(now)) return "open";
  return now.getTime() <= shareReadOnlyEndsAt().getTime() ? "after-close" : "off";
}

/**
 * A sharer's code: the first 8 characters of their sign-up's id, never the
 * pay token. It is printed on the poster and its QR code tags share-<code>,
 * so sign-ups from the poster show up under that tag on the admin page.
 */
export function shareCode(registrationId: string): string {
  return registrationId.replace(/-/g, "").slice(0, 8).toLowerCase();
}
export const SHARE_CODE_RE = /^[0-9a-f]{8}$/;
/** The codes the demo pages use; their posters work without a link where demos are on. */
export const SHARE_DEMO_CODE = "1a2b3c4d";
export const TEACHER_DEMO_CODE = "7e4c0b2a";

/**
 * The made-up demo pages (/hackathon/join/demo, /hackathon/join/demo/share):
 * on in development and on Vercel preview deployments, so a PR's preview can
 * be walked through without a real sign-up. Never in production.
 */
export function demoPagesOn(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "development" || env.VERCEL_ENV === "preview";
}
export type ShareKind = "student" | "teacher";

export const shareSource = (code: string) => `share-${code}`;
/** A teacher's link tags ?src=t-<code>, so the admin page can tell the two apart. */
export const teacherSource = (code: string) => `t-${code}`;
export const linkSource = (kind: ShareKind, code: string) => (kind === "teacher" ? teacherSource(code) : shareSource(code));
export const linkUrl = (kind: ShareKind, code: string) => `https://www.${ELEMENTAL.url}?src=${linkSource(kind, code)}`;
export const shareUrl = (code: string) => linkUrl("student", code);

const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";

/**
 * A school name folded for matching: no "โรงเรียน" or "รร." in front, Thai
 * digits as 0-9, no spaces or punctuation. scripts/build-elemental-schools.mjs
 * folds the same way.
 */
export function foldSchoolName(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(โรงเรียน|รร\.?)\s*/, "")
    .replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d)))
    .toLowerCase()
    .replace(/[\s.,()\-–_'"“”]/g, "");
}

/** [key, name without "โรงเรียน", province] */
export type SchoolRow = readonly [string, string, string];

/**
 * Schools matching what was typed, best first: the whole name, then the
 * start of the name, then anywhere in it; shorter names first. Each word
 * typed must match the name or the province ("สตรีวิทยา 2", "ยุพราช เชียงใหม่").
 */
export function rankSchools(rows: readonly SchoolRow[], query: string, limit = 12): SchoolRow[] {
  const words = query
    .split(/\s+/)
    .map(foldSchoolName)
    .filter(Boolean);
  if (words.length === 0) return [];
  const whole = foldSchoolName(query);
  const scored: { row: SchoolRow; score: number }[] = [];
  for (const row of rows) {
    const name = foldSchoolName(row[1]);
    const prov = foldSchoolName(row[2]);
    if (!words.every((w) => name.includes(w) || prov.includes(w))) continue;
    const score = name === whole ? 0 : name.startsWith(words[0]) ? 1 : name.includes(whole) ? 2 : 3;
    scored.push({ row, score });
  }
  scored.sort((a, b) => a.score - b.score || a.row[1].length - b.row[1].length || a.row[1].localeCompare(b.row[1], "th"));
  return scored.slice(0, limit).map((s) => s.row);
}

/** A school someone typed because it isn't on the list: one key per spelling, so it still counts once. */
export function customSchoolKey(name: string): string {
  return `custom:${foldSchoolName(name).slice(0, 80)}`;
}

// --- Link previews and in-app browsers (from main: #423, #417) ---

/**
 * The line under an Elemental link preview (LINE, Facebook, X) and in search:
 * what it is, when, where, who for, the prize and both prices. All facts come
 * from facts.ts, so the preview changes with them.
 */
export function elementalShareDescription(): string {
  return `${ELEMENTAL.edition} Hackathon: ดิน น้ำ ลม ไฟ ${thaiDateLine()} ${ELEMENTAL.venueTh} สำหรับนักเรียน ${ELEMENTAL.gradesTh} รางวัลรวม ${prizeTotal()} บาท สมัครคนเดียว ฿${ELEMENTAL.priceBaht} มากับเพื่อน ฿${ELEMENTAL.groupPriceBaht} ต่อคน`;
}

/**
 * Where the person is reading the result, for the Story share. Most arrive
 * from a friend's Story, so inside Instagram's own browser, where the share
 * sheet often can't take an image (Android's WebView has no Web Share at
 * all). Knowing the app lets the page show the way that works there: press
 * and hold the card to save it, or open the page in a real browser.
 */
export type InAppBrowser = "instagram" | "facebook" | "line" | "tiktok" | "webview";

export function inAppBrowser(userAgent: string): InAppBrowser | null {
  if (/Instagram/i.test(userAgent)) return "instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(userAgent)) return "facebook";
  if (/\bLine\//i.test(userAgent)) return "line";
  if (/TikTok|musical_ly|BytedanceWebview/i.test(userAgent)) return "tiktok";
  if (/; wv\)/.test(userAgent)) return "webview";
  return null;
}

/** The same page, asking LINE to open it in the phone's browser (LINE's documented openExternalBrowser=1). */
export function lineExternalUrl(url: string): string {
  const u = new URL(url);
  u.searchParams.set("openExternalBrowser", "1");
  return u.toString();
}
