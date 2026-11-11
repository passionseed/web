/**
 * Thai copy checks shared by the script lint, `radar:dump` and page metadata. Pure.
 */

/**
 * Dash characters banned in user-facing copy: em dash (U+2014), en dash
 * (U+2013), plus the look-alike figure dash (U+2012) and horizontal bar (U+2015).
 */
const DASH_CHARS = "\u2012\u2013\u2014\u2015";
const DASH_GLOBAL = new RegExp(`[${DASH_CHARS}]`, "g");

export interface DashHit {
  /** UTF-16 index of the dash in the text. */
  index: number;
  char: string;
  /** Up to 12 characters either side, for error messages. */
  context: string;
}

export function findDashes(text: string | null | undefined): DashHit[] {
  if (!text) return [];
  const hits: DashHit[] = [];
  for (const match of text.matchAll(DASH_GLOBAL)) {
    const index = match.index ?? 0;
    hits.push({
      index,
      char: match[0],
      context: text.slice(Math.max(0, index - 12), index + 13),
    });
  }
  return hits;
}

export function hasDashes(text: string | null | undefined): boolean {
  return findDashes(text).length > 0;
}

/**
 * Replaces dashes for display: a dash between two numbers (a range such as
 * 25,000 en-dash 35,000) becomes "-", a dash at either end is dropped, any other dash
 * becomes ", ". Used where data has not been swept yet, such as link previews.
 */
export function sanitizeDashes(text: string): string {
  const pattern = new RegExp(`\\s*[${DASH_CHARS}]+\\s*`, "g");
  const out = text.replace(pattern, (match, offset: number, whole: string) => {
    const before = whole.slice(0, offset);
    const after = whole.slice(offset + match.length);
    if (!before.trim() || !after.trim()) return "";
    // A range keeps a hyphen, also with a short unit on the first number
    // ("25k–70k+" becomes "25k-70k+", not "25k, 70k+").
    if (/[0-9๐-๙][a-zA-Z%+]{0,3}$/.test(before) && /^[$฿]?[0-9๐-๙]/.test(after)) return "-";
    if (/[,:;]$/.test(before)) return " ";
    return ", ";
  });
  return out.trim();
}

/**
 * Spelled Thai number words. Each is only a number on its own; the false
 * positives below are removed before matching.
 */
const SPELLED_NUMBERS = ["สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน", "เปอร์เซ็นต์", "เท่า", "ครึ่ง"];

/** Common words that contain a number word but state no quantity. */
const NUMBER_WORD_FALSE_POSITIVES = [
  "เรียบร้อย",
  "ร้อยเรียง",
  "พันธ", // พันธุ์ พันธ์ สัมพันธ์ พันธมิตร
  "ผูกพัน",
  "เกี่ยวพัน",
  "พัวพัน",
  "ล้านนา",
  "เท่าไหร่",
  "เท่าไร",
  "เท่าใด",
  "เท่านั้น",
  "เท่ากัน",
  "เท่ากับ",
  "เท่าที่",
  "เท่าเทียม",
  "เท่าทัน",
];

const DIGITS = /[0-9๐-๙]/;

/**
 * True when the text states a number: Arabic digits, Thai digits (๐-๙), a
 * percent sign, or a spelled number (สิบ ร้อย พัน หมื่น แสน ล้าน เปอร์เซ็นต์
 * เท่า ครึ่ง). Errs toward true: a false positive asks for a source, a false
 * negative ships an unsourced number.
 */
export function containsNumber(text: string | null | undefined): boolean {
  if (!text) return false;
  if (DIGITS.test(text) || text.includes("%")) return true;
  let stripped = text;
  for (const word of NUMBER_WORD_FALSE_POSITIVES) stripped = stripped.split(word).join(" ");
  return SPELLED_NUMBERS.some((word) => stripped.includes(word));
}

/** Code points that are Thai script (U+0E00-U+0E7F). */
export function countThaiChars(text: string): number {
  let count = 0;
  for (const ch of text) if (/[฀-๿]/.test(ch)) count += 1;
  return count;
}
