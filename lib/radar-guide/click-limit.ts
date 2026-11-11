/**
 * Best-effort cap on short-link click logging (app/r/[code]/route.ts), per
 * instance: at most LIMIT logged clicks per client key per minute. It only
 * decides whether a click is written to radar_link_clicks; the redirect
 * always happens. A cold start forgets everything, which is fine: the goal is
 * to keep a simple loop from growing the table and skewing click counts.
 */
export const CLICK_LOG_LIMIT_PER_MINUTE = 20;
const WINDOW_MS = 60_000;
/** Keeps memory bounded under a spray of distinct keys. */
const MAX_KEYS = 5_000;

type Bucket = { start: number; count: number };

export function createClickLimiter(limit = CLICK_LOG_LIMIT_PER_MINUTE, now: () => number = Date.now) {
  const buckets = new Map<string, Bucket>();
  return function allow(key: string): boolean {
    const t = now();
    const bucket = buckets.get(key);
    if (!bucket || t - bucket.start >= WINDOW_MS) {
      if (!bucket && buckets.size >= MAX_KEYS) {
        // Drop expired windows first; if every key is live, refuse new ones.
        for (const [k, b] of buckets) if (t - b.start >= WINDOW_MS) buckets.delete(k);
        if (buckets.size >= MAX_KEYS) return false;
      }
      buckets.set(key, { start: t, count: 1 });
      return true;
    }
    if (bucket.count >= limit) return false;
    bucket.count += 1;
    return true;
  };
}

/** The caller's address as the platform reports it, or "unknown". */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
