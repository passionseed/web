/**
 * Last line of defence before text reaches the public company brain.
 * Returns the kind of sensitive data found, or null when the text is clean.
 */

export type PiiKind = "email" | "phone" | "thai_id" | "card" | "token";

const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
// Thai mobiles and landlines (0X..., +66...) and other international numbers.
const PHONE = /(?:\+\d{1,3}[ -]?\(?\d{1,4}\)?(?:[ -]?\d{2,4}){2,4}|(?<![\d-])0\d{1,2}[ -]?\d{3,4}[ -]?\d{4}(?![\d-]))/;
// 13 digits, plain or written 1-2345-67890-12-3.
const THAI_ID = /(?<![\d-])(?:\d{13}|\d[ -]\d{4}[ -]\d{5}[ -]\d{2}[ -]\d)(?![\d-])/;
// 13 to 19 digits, plain or in groups of four (dates like 2026-10-21 do not match).
const CARD = /(?<![\d-])(?:\d{13,19}|\d{4}([ -])\d{4}\1\d{4}\1\d{1,7})(?![\d-])/;
const TOKENS = [
  /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}/,
  /\bsk-[A-Za-z0-9_-]{20,}/,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  // Any long unbroken key-like run.
  /[A-Za-z0-9+/_=-]{40,}/,
];

export function findPii(text: string): PiiKind | null {
  // Event ids are UUIDs and may contain digit runs; they are safe to publish.
  const clean = text.replace(UUID, "");
  if (EMAIL.test(clean)) return "email";
  if (THAI_ID.test(clean)) return "thai_id";
  if (CARD.test(clean)) return "card";
  if (PHONE.test(clean)) return "phone";
  if (TOKENS.some((pattern) => pattern.test(clean))) return "token";
  return null;
}
