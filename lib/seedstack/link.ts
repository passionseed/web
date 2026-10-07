/**
 * Device link codes for SeedStack (OAuth device-flow style).
 *
 * The CLI holds a secret device code; the student types or clicks a short
 * user code on the web. Only the device code can collect the token.
 */

import { randomBytes, randomInt } from "node:crypto";

export const LINK_TTL_MS = 10 * 60 * 1000;
export const LINK_POLL_INTERVAL_S = 3;

// No 0/O/1/I/L so codes survive being read aloud or retyped.
const USER_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const USER_CODE = /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/;

export function generateDeviceCode(): string {
  return randomBytes(32).toString("base64url");
}

export function generateUserCode(): string {
  const chars = Array.from({ length: 8 }, () => USER_CODE_ALPHABET[randomInt(USER_CODE_ALPHABET.length)]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

/** Accepts "abcd 2345", "ABCD2345", "abcd-2345"; returns "ABCD-2345" or null. */
export function normalizeUserCode(raw: string | null | undefined): string | null {
  const compact = (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length !== 8) return null;
  const code = `${compact.slice(0, 4)}-${compact.slice(4)}`;
  return USER_CODE.test(code) ? code : null;
}
