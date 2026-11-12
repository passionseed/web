/**
 * Privacy filters for the AI island news (ข่าวเกาะ). Everything the model
 * reads goes through scrubText first; everything it writes goes through
 * checkSummary before it is stored. Pure functions, no I/O.
 *
 * What is removed or refused:
 * - every display name the database lists in `redact` (everyone ever on the
 *   team or credited on its work: the whole name and each word of it), and
 *   every team name in `teams` (other teams not shown on the island: whole
 *   names only), case-insensitive;
 * - in the model's output, also an honorific followed by a name (คุณ, พี่,
 *   ครู, อาจารย์, ลุง, ป้า, Mr, Ms, Mrs, Miss, Dr), which catches testers'
 *   and other people's names the database never knew;
 * - emails, links (http, www and bare domains), Thai and international phone
 *   numbers and other long digit runs (Discord ids), @handles, Discord
 *   mentions, and LINE, Instagram, Facebook, TikTok or Discord ids written
 *   as "line: xxx" or "ไอดีไลน์ xxx".
 * Removing too much is safe; leaking a name or a contact is not.
 */

/** What a removed piece is replaced with in the model's input. The model is told never to write these. */
export const PLACEHOLDERS = { name: "[ชื่อ]", contact: "[ติดต่อ]", link: "[ลิงก์]" } as const;

/** The longest summary the island and Discord show. */
export const MAX_SUMMARY = 220;

const INVISIBLE = /[​-‍⁠﻿]/g;
const LATIN_EDGE = /[A-Za-z0-9]/;
/** Characters that split a display name into words. */
const NAME_SPLIT = /[\s._\-|/\\,()[\]{}"'`~!?:;*+=#&^%$@<>]+/;
/** Anything but letters, Thai vowel and tone marks, and digits at either end of a name. */
const EDGE_PUNCT = /^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+$/gu;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Code points, so Thai vowels and tone marks count as characters. */
function length(text: string): number {
  return [...text].length;
}

function isLatin(word: string): boolean {
  return /^[A-Za-z0-9]+$/.test(word);
}

/**
 * The strings to remove for a list of display names: each whole name and each
 * word of it, longest first. A word must have at least `minWord` characters
 * (Latin words at least 2, matched as whole words only, so "Al" never eats
 * "Also").
 */
export function redactTerms(redact: readonly unknown[], minWord = 2): string[] {
  const terms = new Set<string>();
  for (const raw of redact) {
    if (typeof raw !== "string") continue;
    const full = raw.normalize("NFC").replace(INVISIBLE, "").trim().replace(EDGE_PUNCT, "");
    if (length(full) >= 2) terms.add(full);
    for (const part of full.split(NAME_SPLIT)) {
      const word = part.replace(EDGE_PUNCT, "");
      if (!word) continue;
      if (isLatin(word) ? length(word) >= 2 : length(word) >= minWord) terms.add(word);
    }
  }
  return [...terms].sort((a, b) => length(b) - length(a));
}

function termPattern(term: string): string {
  const body = escapeRegExp(term).replace(/\s+/g, "\\s+");
  const start = LATIN_EDGE.test(term[0]) ? "(?<![A-Za-z0-9])" : "";
  const end = LATIN_EDGE.test(term[term.length - 1]) ? "(?![A-Za-z0-9])" : "";
  return `${start}${body}${end}`;
}

/** One case-insensitive pattern for every term, or null when there is nothing to redact. */
export function redactPattern(redact: readonly unknown[], minWord = 2): RegExp | null {
  const terms = redactTerms(redact, minWord);
  return terms.length ? new RegExp(terms.map(termPattern).join("|"), "giu") : null;
}

/** Whole names only (team names), longest first, as one case-insensitive pattern, or null. */
export function wholePattern(names: readonly unknown[]): RegExp | null {
  const terms = [
    ...new Set(
      names
        .filter((n): n is string => typeof n === "string")
        .map((n) => n.normalize("NFC").replace(INVISIBLE, "").trim())
        .filter((n) => length(n) >= 2),
    ),
  ].sort((a, b) => length(b) - length(a));
  return terms.length ? new RegExp(terms.map(termPattern).join("|"), "giu") : null;
}

/**
 * An honorific and then a name: "คุณสมชาย", "พี่ บี", "Mr Smith". Thai words
 * that only start or end like one (คุณภาพ, คุณค่า, พี่เลี้ยง, ครูที่,
 * ขอบคุณ, เป้าหมาย) are left alone.
 * For the model's output only: a name the database never knew (a tester, a
 * teacher, someone the team helped) is still refused.
 */
const HONORIFIC_NAME = new RegExp(
  [
    "(?:(?<!ขอบ|บุญ|พระ)คุณ|พี่|ครู|อาจารย์|ลุง|(?<!เ)ป้า)\\s?(?!(?:เลี้ยง|ภาพ|ค่า|สมบัติ|ลักษณะ|ประโยชน์|ธรรม|ครู|น้อง|ที่|ใน|และ|กับ|ของ|ประจำ|แนะแนว|ทุกคน|หลาย|ใหญ่|ผู้|ช่วย|เขา|เค้า|เอง|ท่าน|ๆ))[ก-ฮเ-ไ]",
    "(?<![A-Za-z])(?:Mr|Mrs|Ms|Miss|Dr)\\.?\\s+[A-Z][a-z]",
  ].join("|"),
  "u",
);

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"'`]+/giu;
const DOMAIN =
  /(?<![\p{L}\p{N}@.])(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|th|me|app|dev|ly|gg|xyz|ai|so|site|link|page|to|tv|info|biz|cc|us|uk|sg|shop|store)(?![a-z0-9-])(?:\/[^\s<>"'`]*)?/giu;
const MENTION = /<(?:@[!&]?|#)\d+>|@(?:everyone|here)\b/giu;
/** "line: abc", "LINE ID abc", "ig = abc", "ไอดีไลน์ abc": the id itself is ASCII on every one of these apps. */
const SOCIAL_ID =
  /(?<![A-Za-z])(?:line|ไลน์|ig|instagram|ไอจี|fb|facebook|เฟซบุ๊ก|เฟสบุ๊ค|tiktok|ติ๊กต็อก|discord|ดิสคอร์ด)\s*(?:(?:id|ไอดี)\s*[:：=]?|[:：=])\s*@?[A-Za-z0-9._-]{3,}|ไอดี\s*(?:ไลน์|line|ไอจี|ig)\s*[:：=]?\s*@?[A-Za-z0-9._-]{3,}/giu;
const HANDLE = /(^|[^\p{L}\p{N}_.])@[\p{L}\p{N}_.]{2,32}/gu;
/** A phone number or any other long number: 9 or more digits, spaces, dots, dashes or brackets between them allowed. */
const LONG_NUMBER = /(?<![\p{N}])(?:\+|\()?\d(?:[\d\s().-]*\d)?(?![\p{N}])/gu;
const MIN_DIGITS = 9;

function replaceLongNumbers(text: string, replacement: string): string {
  return text.replace(LONG_NUMBER, (match) => (match.replace(/\D/g, "").length >= MIN_DIGITS ? replacement : match));
}

function hasLongNumber(text: string): boolean {
  for (const match of text.matchAll(LONG_NUMBER)) if (match[0].replace(/\D/g, "").length >= MIN_DIGITS) return true;
  return false;
}

/**
 * Text for the model: names, contacts and links replaced with placeholders,
 * angle brackets dropped (so nothing can close the <team_data> block),
 * whitespace collapsed. Null and empty stay null.
 */
export function scrubText(
  text: string | null | undefined,
  redact: readonly unknown[] = [],
  teams: readonly unknown[] = [],
): string | null {
  if (typeof text !== "string") return null;
  let out = text.normalize("NFC").replace(INVISIBLE, "");
  out = out.replace(EMAIL, PLACEHOLDERS.contact);
  out = out.replace(URL_PATTERN, PLACEHOLDERS.link);
  out = out.replace(DOMAIN, PLACEHOLDERS.link);
  out = out.replace(MENTION, PLACEHOLDERS.contact);
  out = out.replace(SOCIAL_ID, PLACEHOLDERS.contact);
  out = out.replace(HANDLE, `$1${PLACEHOLDERS.contact}`);
  out = replaceLongNumbers(out, PLACEHOLDERS.contact);
  const hidden = wholePattern(teams);
  if (hidden) out = out.replace(hidden, PLACEHOLDERS.name);
  const names = redactPattern(redact);
  if (names) out = out.replace(names, PLACEHOLDERS.name);
  out = out.replace(/[<>]/g, " ").replace(/\s+/g, " ").trim();
  return out || null;
}

/** True when the text holds an email, a link, a phone or long number, a handle, a mention or a social id. */
export function hasContact(text: string): boolean {
  const t = text.normalize("NFC").replace(INVISIBLE, "");
  const tests = [EMAIL, URL_PATTERN, DOMAIN, MENTION, SOCIAL_ID, HANDLE];
  for (const pattern of tests) {
    pattern.lastIndex = 0;
    if (pattern.test(t)) {
      pattern.lastIndex = 0;
      return true;
    }
  }
  return hasLongNumber(t);
}

/**
 * True when the text names a member. For the model's output, Thai words of
 * 2 characters are left out (they hide inside ordinary words, and the input
 * never carried them); whole names and longer words are always checked.
 */
export function namesMember(text: string, redact: readonly unknown[], teams: readonly unknown[] = []): boolean {
  const t = text.normalize("NFC").replace(INVISIBLE, "");
  const pattern = redactPattern(redact, 3);
  if (pattern?.test(t)) return true;
  if (wholePattern(teams)?.test(t)) return true;
  return HONORIFIC_NAME.test(t);
}

const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}️⃣]/gu;

/**
 * The model's summary tidied for the island: em and en dashes become a
 * comma, emoji and markdown marks go, whitespace collapses to one line.
 */
export function cleanSummary(text: string): string {
  return text
    .normalize("NFC")
    .replace(INVISIBLE, "")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(EMOJI, "")
    .replace(/\*\*|__|`|^\s*#+\s*/gm, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/,(\s*,)+/g, ",")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .trim();
}

/** Talking down, ranking, comparing or hype: never in island news. */
const TONE = /น้อง|เด็กๆ|เด็ก\s?ๆ|อันดับ|ดีที่สุด|เก่งที่สุด|เจ๋งที่สุด|ดีกว่าทีม|เก่งกว่าทีม|เหนือกว่า|ชนะทีม|แพ้ทีม|!{2,}/u;
const PLACEHOLDER_LEFT = /\[(?:ชื่อ|ติดต่อ|ลิงก์)\]/u;

export type SummaryProblem = "empty" | "too_long" | "name" | "contact" | "placeholder" | "tone";

export type SummaryCheck = { ok: true; summary: string } | { ok: false; problem: SummaryProblem };

/**
 * The model's summary, cleaned, or the first problem that keeps it off the
 * island: empty, over MAX_SUMMARY characters, a member's name, a hidden
 * team's name or an honorific with a name, a contact or link, a leftover
 * placeholder, or ranking and hype.
 */
export function checkSummary(text: unknown, redact: readonly unknown[], teams: readonly unknown[] = []): SummaryCheck {
  if (typeof text !== "string") return { ok: false, problem: "empty" };
  const summary = cleanSummary(text);
  if (!summary) return { ok: false, problem: "empty" };
  if (length(summary) > MAX_SUMMARY) return { ok: false, problem: "too_long" };
  if (PLACEHOLDER_LEFT.test(summary)) return { ok: false, problem: "placeholder" };
  if (namesMember(summary, redact, teams)) return { ok: false, problem: "name" };
  if (hasContact(summary)) return { ok: false, problem: "contact" };
  if (TONE.test(summary)) return { ok: false, problem: "tone" };
  return { ok: true, summary };
}
