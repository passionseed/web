/**
 * Device link codes for SeedStack (OAuth device-flow style).
 *
 * The CLI holds a secret device code; the student types or clicks a short
 * user code on the web. Only the device code can collect the token.
 */

import { randomBytes, randomInt } from "node:crypto";

import { USER_CODE_ALPHABET } from "./userCode";

export { normalizeUserCode } from "./userCode";

export const LINK_TTL_MS = 10 * 60 * 1000;
export const LINK_POLL_INTERVAL_S = 3;

export function generateDeviceCode(): string {
  return randomBytes(32).toString("base64url");
}

export function generateUserCode(): string {
  const chars = Array.from({ length: 8 }, () => USER_CODE_ALPHABET[randomInt(USER_CODE_ALPHABET.length)]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}
