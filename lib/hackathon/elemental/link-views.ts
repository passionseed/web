import { createHmac } from "crypto";

/**
 * Real-device counting for Elemental share links (?src=share-<code>, ?src=t-<code>).
 * Pure helpers; the database side is lib/supabase/hackathon-link-views.ts.
 *
 * A device is the browser's first-party id cookie (DEVICE_COOKIE), hashed with
 * a server key, so a phone that changes network (airplane mode, wifi to mobile)
 * stays one device. Private tabs get a new cookie each time, so each network
 * address can add at most PER_NETWORK_CAP devices to a link: one person with
 * many tabs can't fill it. The raw address is never stored.
 */

import { PER_NETWORK_CAP } from "./link-views-shared";

export { PER_NETWORK_CAP, TRACKED_SOURCE_RE } from "./link-views-shared";

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|curl|wget|python|node-fetch|axios/i;

export function isBotUserAgent(ua: string | null | undefined): boolean {
  return !ua || ua.length < 20 || BOT_UA.test(ua);
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

function hmac32(key: string, value: string): string {
  return createHmac("sha256", key).update(value).digest("hex").slice(0, 32);
}

/** Keyed hashes for one visit. The key must be a server secret, so the hashes can't be reversed by guessing addresses or ids. */
export function visitHashes(deviceId: string, ip: string, key: string): { deviceHash: string; ipHash: string } {
  return { deviceHash: hmac32(key, `device|${deviceId}`), ipHash: hmac32(key, `ip|${ip}`) };
}

/** A browser id we set ourselves: 32 lowercase hex characters. */
export const DEVICE_ID_RE = /^[0-9a-f]{32}$/;

/** Distinct devices, with each network address adding at most `cap`. */
export function countDevices(rows: { ipHash: string }[], cap = PER_NETWORK_CAP): number {
  const perIp = new Map<string, number>();
  for (const r of rows) perIp.set(r.ipHash, (perIp.get(r.ipHash) ?? 0) + 1);
  let n = 0;
  for (const c of perIp.values()) n += Math.min(c, cap);
  return n;
}
