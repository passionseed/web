import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

/** Share links that count devices: ?src=share-<code> (students) and ?src=t-<code> (teachers). Safe to import in the browser. */
export const TRACKED_SOURCE_RE = /^(share|t)-[a-z0-9_-]{1,40}$/;

/** Devices one network address can add to one link. A home or a classroom wifi can have a few real phones. */
export const PER_NETWORK_CAP = 5;

/** First-party cookie that keeps one browser one device even when its network address changes (airplane mode, wifi ↔ mobile). */
export const DEVICE_COOKIE = "el_vid";

/**
 * Counting stops when sign-up closes (Fri 4 Dec 23:59 Bangkok): views after it,
 * and paid sign-ups created after it, never count toward a link, a seat or the board.
 */
export function elementalCountingEndsAt(): Date {
  return new Date(`${ELEMENTAL.registrationClosesOn}T23:59:59+07:00`);
}
