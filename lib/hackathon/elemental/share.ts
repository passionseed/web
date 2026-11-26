import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import { elementalRegistrationOpen } from "./registration";

/**
 * Share the poster in your school's LINE group, get a free seat
 * (company-brain decisions/log.md, 2026-11-26):
 * - the group is a whole school or a year group with 100+ members;
 * - one free seat per school, and only the first 30 count (Big, 2026-11-26:
 *   "only 1 per school", "first 30");
 * - each sharer gets their own poster, whose QR code tags ?src=share-<code>.
 * The 24-hour hold is Claude's pick: long enough to get the poster into the
 * group, short enough that a school isn't blocked by someone who never posts.
 */
export const SHARE = {
  seats: 30,
  minMembers: 100,
  holdHours: 24,
  /** Where sharers send their screenshot: PassionSeed's IG inbox, which staff share. */
  proofUrl: "https://ig.me/m/passion_seed.th",
  proofHandle: "@passion_seed.th",
} as const;

/** The share page is on only when ELEMENTAL_SHARE_OPEN=1 and sign-up is still open. */
export function shareOpen(env: NodeJS.ProcessEnv = process.env, now: Date = new Date()): boolean {
  return env.ELEMENTAL_SHARE_OPEN === "1" && elementalRegistrationOpen(now);
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
/** The code the demo (/hackathon/join/demo/share) uses; its poster works without a claim where demos are on. */
export const SHARE_DEMO_CODE = "1a2b3c4d";

/**
 * The made-up demo pages (/hackathon/join/demo, /hackathon/join/demo/share):
 * on in development and on Vercel preview deployments, so a PR's preview can
 * be walked through without a real sign-up. Never in production.
 */
export function demoPagesOn(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "development" || env.VERCEL_ENV === "preview";
}
export const shareSource = (code: string) => `share-${code}`;
export const shareUrl = (code: string) => `https://www.${ELEMENTAL.url}?src=${shareSource(code)}`;

/** What a free seat does to a sign-up: one seat's price comes off; at ฿0 it is paid. */
export function freeSeatOutcome(amountBaht: number, memberCount: number): { amountBaht: number; paid: boolean } {
  const seat = Math.round(amountBaht / Math.max(1, memberCount));
  const left = Math.max(0, amountBaht - seat);
  return { amountBaht: left, paid: left === 0 };
}

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
