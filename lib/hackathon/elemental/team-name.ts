/**
 * Team names show on invite links that students send each other, so rude
 * names are turned away, in the browser and again on the server.
 *
 * The check folds case, spacing, punctuation, repeated letters and common
 * look-alike digits ("f.u.c.k", "fuuuck", "sh1t") before matching. Thai words
 * that are also parts of ordinary words (หี in หีบ, แม่ง in แม่งาน, สัด in
 * สัดส่วน) are left out on purpose: a missed rude name can be renamed by staff,
 * a blocked ordinary name just confuses a student.
 */

// Not "cum", "cock", "rape" or "boob": they sit inside document, peacock, grape and (folded) bob.
const LATIN = [
  "fuck", "fuk", "fck", "fvck", "shit", "bitch", "cunt", "dick", "pussy", "asshole",
  "nigger", "nigga", "faggot", "slut", "whore", "porn", "nazi", "hitler",
  "penis", "vagina", "tits", "jizz", "milf", "horny", "wtf", "stfu",
];

const THAI = [
  "เหี้ย", "ควย", "เย็ด", "เงี่ยน", "กะหรี่", "ส้นตีน", "มึง", "ระยำ", "จัญไร",
  "อีดอก", "อีตัว", "ชาติหมา", "ไอ้สัตว์", "สัส", "แตด", "ร่าน", "ดอกทอง", "พ่อมึง", "แม่มึง",
];

const LOOKALIKE: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s" };

/** Lowercase, look-alikes swapped, and everything but letters dropped; runs of one letter become one. */
export function foldName(raw: string): string {
  return raw
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LOOKALIKE[c] ?? c)
    .replace(/[^\p{L}\p{M}]/gu, "")
    .replace(/(.)\1+/gu, "$1");
}

const FOLDED = [...LATIN, ...THAI].map(foldName);

/** "ทีม ไฟป่า", without doubling when the name already starts with ทีม ("ทีมไฟป่า"). */
export function teamLabel(name: string): string {
  const n = name.trim();
  return /^ทีม/.test(n) ? n : `ทีม ${n}`;
}

/** True when a team name contains a rude word. */
export function isRudeTeamName(name: string): boolean {
  const folded = foldName(name);
  return FOLDED.some((w) => folded.includes(w));
}
