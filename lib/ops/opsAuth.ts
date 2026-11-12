import { timingSafeEqual } from "crypto";

/**
 * True when `authorization` is `Bearer <value>` for any of the named env vars.
 * An unset or empty env var never matches, so a missing secret locks the
 * route instead of opening it. Constant-time per candidate.
 */
export function hasBearerSecret(authorization: string | null, ...envNames: string[]): boolean {
  if (!authorization?.startsWith("Bearer ")) return false;
  const presented = Buffer.from(authorization.slice("Bearer ".length));
  return envNames.some((name) => {
    const secret = process.env[name];
    if (!secret) return false;
    const expected = Buffer.from(secret);
    return expected.length === presented.length && timingSafeEqual(expected, presented);
  });
}
