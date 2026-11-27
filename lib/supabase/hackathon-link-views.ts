import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";
import { countDevices, PER_NETWORK_CAP, TRACKED_SOURCE_RE, visitHashes } from "@/lib/hackathon/elemental/link-views";
import { elementalCountingEndsAt } from "@/lib/hackathon/elemental/link-views-shared";

/** The secret that keys the device hashes. Set ELEMENTAL_VIEW_KEY in production; falls back to the service key. */
function hashKey(): string {
  const key = process.env.ELEMENTAL_VIEW_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("ELEMENTAL_VIEW_KEY is not set");
  return key;
}

/**
 * Record that one device opened a tracked link. Repeat visits from the same
 * device do nothing, and a network address that has already added
 * PER_NETWORK_CAP devices to this link adds no more rows (so a flood of
 * private tabs from one place can't grow the table or the count).
 * Nothing is recorded after sign-up closes. Returns whether a row was added.
 */
export async function recordLinkView(eventSlug: string, source: string, deviceId: string, ip: string): Promise<boolean> {
  if (!TRACKED_SOURCE_RE.test(source)) return false;
  if (Date.now() > elementalCountingEndsAt().getTime()) return false;
  const { deviceHash, ipHash } = visitHashes(deviceId, ip, hashKey());
  const supabase = createAdminClient();
  const { count, error: countError } = await supabase
    .from("hackathon_link_views")
    .select("id", { count: "exact", head: true })
    .eq("event_slug", eventSlug)
    .eq("source", source)
    .eq("ip_hash", ipHash);
  if (countError) throw countError;
  if ((count ?? 0) >= PER_NETWORK_CAP) return false;
  const { error } = await supabase
    .from("hackathon_link_views")
    .upsert(
      { event_slug: eventSlug, source, device_hash: deviceHash, ip_hash: ipHash },
      { onConflict: "event_slug,source,device_hash", ignoreDuplicates: true },
    );
  if (error) throw error;
  return true;
}

export type LinkStats = { devices: number; paid: number };

/**
 * Devices (capped per network) and paid seats for each tracked link, both
 * counted only up to sign-up close. Paid seats = member_count of paid sign-ups
 * whose source is that link, leaving out free seats (free_seat = true), so
 * only real money counts.
 */
export async function linkStats(eventSlug: string, sources: string[]): Promise<Map<string, LinkStats>> {
  const out = new Map<string, LinkStats>(sources.map((s) => [s, { devices: 0, paid: 0 }]));
  const wanted = sources.filter((s) => TRACKED_SOURCE_RE.test(s));
  if (wanted.length === 0) return out;
  const supabase = createAdminClient();
  const endsAt = elementalCountingEndsAt().toISOString();
  // PostgREST returns at most 1,000 rows per request: page through all of them.
  const all = async <T,>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) => {
    const rows: T[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await page(from, from + 999);
      if (error) throw error;
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) return rows;
    }
  };
  const [views, regs] = await Promise.all([
    all<{ source: string; ip_hash: string }>((from, to) =>
      supabase
        .from("hackathon_link_views")
        .select("source, ip_hash")
        .eq("event_slug", eventSlug)
        .in("source", wanted)
        .lte("created_at", endsAt)
        .order("id")
        .range(from, to),
    ),
    all<{ source: string | null; member_count: number | null }>((from, to) =>
      supabase
        .from("hackathon_event_registrations")
        .select("source, member_count")
        .eq("event_slug", eventSlug)
        .eq("status", "paid")
        .eq("free_seat", false)
        .lte("created_at", endsAt)
        .in("source", wanted)
        .order("id")
        .range(from, to),
    ),
  ]);
  const bySource = new Map<string, { ipHash: string }[]>();
  for (const v of views) {
    const list = bySource.get(v.source) ?? [];
    list.push({ ipHash: v.ip_hash });
    bySource.set(v.source, list);
  }
  for (const [s, rows] of bySource) out.get(s)!.devices = countDevices(rows);
  for (const r of regs) {
    const s = out.get(r.source as string);
    if (s) s.paid += r.member_count ?? 1;
  }
  return out;
}
