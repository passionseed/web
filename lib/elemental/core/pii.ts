/**
 * Hard PII refusal for anything a student types into Elemental: tester
 * entries, project names, lesson answers.
 *
 * Students are minors. Where SHIFT's piiFlags (lib/supabase/shift-quests/
 * canvas-snapshot.ts) only WARNS, this REFUSES: the caller re-opens the form
 * with the text kept and names the field. The result never carries the text or
 * the part that matched, so nothing is echoed back or logged.
 *
 * It is a strict superset of piiFlags: everything piiFlags flags is refused
 * here (a jest parity test checks it over core/pii-cases.json and random
 * strings). On top of that it refuses handles of any length ("ig: x",
 * "line: a", "@a"), +country numbers, long digit runs and URLs.
 *
 * core/pii-cases.json is the shared refuse/pass list. The SQL check in the
 * elemental core migration is tested against the same list, so add a case
 * there whenever a rule here changes.
 *
 * Pure and dependency-free: the bot imports this file.
 */

export type PiiKind = "email" | "url" | "phone" | "line" | "social" | "handle";

export interface PiiRefusal<F extends string = string> {
  ok: false;
  /** The first field (in the order given) that holds something that looks like a contact. */
  field: F;
  kind: PiiKind;
}

export type PiiResult<F extends string = string> = { ok: true } | PiiRefusal<F>;

// Labels students use for social accounts. Bare "x" and "tt" are left out:
// ordinary words would trip them (they are refused only with a colon, below).
const SOCIAL_LATIN = "ig|insta(?:gram)?|fb|facebook|tiktok|twitter";
const SOCIAL_THAI = "ไอจี|อินสตา(?:แกรม)?|เฟส(?:บุ๊ก|บุ๊ค)?|ติ๊กต็อก|ติ๊กต๊อก|ทวิต(?:เตอร์)?";
const URL_TLDS = "com|net|org|co|th|io|me|ly|gg|app|dev|xyz|link|to|tv|info|biz|page|site|online|shop|store";

/**
 * Checked in this order; the first match names the kind. Each rule is a
 * widened copy of a piiFlags rule or a new one; comments name which.
 */
const RULES: readonly { kind: PiiKind; re: RegExp }[] = [
  // Emails (piiFlags' rule).
  { kind: "email", re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
  // URLs (new): a scheme, www., or a bare domain on a common TLD ("line.me/x", "shop.co").
  { kind: "url", re: /\b(?:https?|ftp):\/\/\S/i },
  { kind: "url", re: /\bwww\.[a-z0-9-]/i },
  {
    kind: "url",
    re: new RegExp(`(?:^|[^a-z0-9._%+@-])[a-z0-9][a-z0-9-]*(?:\\.[a-z0-9-]+)*\\.(?:${URL_TLDS})(?![a-z0-9-])`, "i"),
  },
  // Phones. Any 0 followed by 8 or more digits, with spaces, dots, dashes or
  // brackets between: Thai mobiles and landlines (piiFlags' two rules, widened).
  { kind: "phone", re: /(?:^|\D)0(?:[\s.()-]*\d){8}/ },
  // Any +number with 8 or more digits: +66 (piiFlags' rule, widened to every country code).
  { kind: "phone", re: /\+\s*\d(?:[\s.()-]*\d){7}/ },
  // Nine or more digits in a row, such as 66812345678 without the plus (new).
  { kind: "phone", re: /\d{9,}/ },
  // LINE ids (piiFlags' rules, with a handle of any length).
  { kind: "line", re: /ไลน์\s*(?:id\s*)?[:：=]?\s*@?[a-z0-9]/i },
  { kind: "line", re: /\bline\s*(?:id\s*)?(?:[:：=]\s*|@)@?[a-z0-9]/i },
  { kind: "line", re: /\bline\s*id\s+@?[a-z0-9]/i },
  { kind: "line", re: /\bid\s*[:：=]\s*@?[a-z0-9]/i },
  // Labelled social handles. piiFlags' rule as it is (a handle of 3 or more,
  // which also catches "igmint")...
  { kind: "social", re: new RegExp(`(?:^|[^a-z])(?:${SOCIAL_LATIN})\\s*[:：=]?\\s*@?[a-z0-9_.]{3,}`, "i") },
  // ...and any length once the label ends ("ig: x", "fb a").
  { kind: "social", re: new RegExp(`(?:^|[^a-z])(?:${SOCIAL_LATIN})(?![a-z])\\s*[:：=]?\\s*@?[a-z0-9_.]`, "i") },
  { kind: "social", re: new RegExp(`(?:${SOCIAL_THAI})\\s*[:：=]?\\s*@?[a-z0-9_.]`, "i") },
  // Short labels only with a colon or equals sign: "x: name", "tt: name", "yt: name" (new).
  {
    kind: "social",
    re: /(?:^|[^a-z])(?:x|tt|yt|youtube|discord|snap(?:chat)?|threads|telegram|whatsapp)\s*[:：=]\s*@?[a-z0-9_.]/i,
  },
  // @handles of any length (piiFlags needs 3 or more characters).
  { kind: "handle", re: /@[a-z0-9_]/i },
];

/** Thai digits as Arabic ones, so "๐๘๑ ๒๓๔ ๕๖๗๘" is read as a phone number. */
function arabicDigits(text: string): string {
  return text.replace(/[๐-๙]/g, (d) => String(d.charCodeAt(0) - 0x0e50));
}

const INVISIBLE = /[­​-‍⁠﻿]/g;

/**
 * The text as piiFlags reads it (Thai digits made Arabic), plus a folded copy:
 * NFKC (full-width "＠" and "０８１" become "@" and "081") with invisible
 * characters removed. Testing the first keeps the superset of piiFlags exact;
 * the second catches the same contact typed to slip past it.
 */
function variants(text: string): string[] {
  const plain = arabicDigits(text);
  const folded = arabicDigits(text.normalize("NFKC")).replace(INVISIBLE, "");
  return folded === plain ? [plain] : [plain, folded];
}

/** The kind of contact the text seems to hold, or null when it holds none. */
export function piiKind(text: string): PiiKind | null {
  if (!text) return null;
  const forms = variants(text);
  for (const rule of RULES) {
    if (forms.some((form) => rule.re.test(form))) return rule.kind;
  }
  return null;
}

/**
 * Refuses the first field that seems to hold a phone number, email, LINE id,
 * social handle, @handle or URL. Fields are checked in the object's key order;
 * empty, null and undefined fields pass. The result names the field and the
 * kind, never the text.
 */
export function refusePii<F extends string>(fields: Partial<Record<F, string | null | undefined>>): PiiResult<F> {
  for (const field of Object.keys(fields) as F[]) {
    const value = fields[field];
    if (typeof value !== "string") continue;
    const kind = piiKind(value);
    if (kind) return { ok: false, field, kind };
  }
  return { ok: true };
}
