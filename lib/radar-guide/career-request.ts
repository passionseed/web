/**
 * "อยากให้ทำอาชีพไหนต่อ?" validation. Pure.
 *
 * Mirrors `private.submit_radar_career_request` in
 * supabase/migrations/20261111100200_radar_guide_events.sql. Change both together.
 *
 * Only real contact data is rejected: URLs, domains, @handles, emails and runs
 * of 8 or more digits. There are no Thai keyword blocks, because
 * เชฟร้านเบอร์เกอร์, อินฟลูเอนเซอร์ไอจี and ไลน์แมน are real careers.
 */

export const CAREER_REQUEST_MIN_CHARS = 2;
export const CAREER_REQUEST_MAX_CHARS = 80;

export type CareerRequestInvalidReason = "too_short" | "too_long" | "contact";

export type CareerRequestValidation =
  | { ok: true; text: string }
  | { ok: false; reason: CareerRequestInvalidReason };

/**
 * SQL: `v_text ~* '(https?://|www\.|\.(com|net|org|co|me|th|io|ly|gg)\y|@[a-z0-9_.]{2,}|[0-9][0-9 -]{6,}[0-9])'`.
 * Postgres `\y` after the TLD means "not followed by a word character"; in a
 * UTF-8 locale Thai letters are word characters, hence the Unicode lookahead.
 */
const CONTACT_PATTERN =
  /(https?:\/\/|www\.|\.(com|net|org|co|me|th|io|ly|gg)(?![\p{L}\p{N}_])|@[a-z0-9_.]{2,}|[0-9][0-9 -]{6,}[0-9])/iu;

/** `btrim(regexp_replace(text, '\s+', ' ', 'g'))` */
export function normalizeCareerRequest(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/** Length in code points, like Postgres `char_length`. */
function charLength(text: string): number {
  return Array.from(text).length;
}

export function hasContactDetails(text: string): boolean {
  return CONTACT_PATTERN.test(text);
}

export function validateCareerRequest(text: string | null | undefined): CareerRequestValidation {
  const normalized = normalizeCareerRequest(text);
  const length = charLength(normalized);
  if (length < CAREER_REQUEST_MIN_CHARS) return { ok: false, reason: "too_short" };
  if (length > CAREER_REQUEST_MAX_CHARS) return { ok: false, reason: "too_long" };
  if (hasContactDetails(normalized)) return { ok: false, reason: "contact" };
  return { ok: true, text: normalized };
}
