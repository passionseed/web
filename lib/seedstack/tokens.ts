/**
 * SeedStack CLI tokens.
 *
 * A student mints one on /shift/seedstack after consent and pastes it into
 * OpenCode. We store sha256(raw) only; the raw value is shown once.
 * Tokens can only write the owner's own progress events.
 */

import { createHash, randomBytes } from "node:crypto";

export const SEEDSTACK_TOKEN_PREFIX = "psss_";
export const SEEDSTACK_TOKEN_TTL_DAYS = 120;
const TOKEN_BYTES = 32;

export function generateSeedstackToken(): string {
  return `${SEEDSTACK_TOKEN_PREFIX}${randomBytes(TOKEN_BYTES).toString("base64url")}`;
}

export function sha256Hex(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function tokenExpiry(now = Date.now()): string {
  return new Date(now + SEEDSTACK_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/** Pulls `psss_...` out of `Authorization: Bearer psss_...`, else null. */
export function extractSeedstackBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const [scheme, value] = header.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !value) return null;
  return value.startsWith(SEEDSTACK_TOKEN_PREFIX) ? value : null;
}
