/**
 * The post-payment link a SHIFT student opens to connect Discord:
 * /shift/join/{token}. Pure helpers, shared by the auth callback, the proxy
 * onboarding gate, and the admin "copy link" route.
 */

export const SHIFT_JOIN_PREFIX = "/shift/join/";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;

/** 24 URL-safe characters, 144 bits of randomness. */
export function newShiftJoinToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Buffer.from(bytes).toString("base64url");
}

export function isShiftJoinToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

export function shiftJoinPath(token: string): string {
  return `${SHIFT_JOIN_PREFIX}${token}`;
}

/** The token when `path` is exactly a join link, else null. */
export function tokenFromShiftJoinPath(path: string): string | null {
  if (!path.startsWith(SHIFT_JOIN_PREFIX)) return null;
  const token = path.slice(SHIFT_JOIN_PREFIX.length).split(/[/?#]/)[0];
  return isShiftJoinToken(token) ? token : null;
}
