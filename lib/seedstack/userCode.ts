/**
 * The short code a student types on /shift/seedstack. Pure and browser-safe,
 * so the input can format as you type with the same rules the server checks.
 */

// No 0/O/1/I/L so codes survive being read aloud or retyped.
export const USER_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const USER_CODE = /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/;

/** Accepts "abcd 2345", "ABCD2345", "abcd-2345"; returns "ABCD-2345" or null. */
export function normalizeUserCode(raw: string | null | undefined): string | null {
  const compact = (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length !== 8) return null;
  const code = `${compact.slice(0, 4)}-${compact.slice(4)}`;
  return USER_CODE.test(code) ? code : null;
}

/** As-you-type view of whatever was typed or pasted: "ab cd2" becomes "ABCD-2". */
export function formatUserCodeInput(raw: string): string {
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return compact.length > 4 ? `${compact.slice(0, 4)}-${compact.slice(4)}` : compact;
}
