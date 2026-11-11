/**
 * Aggregation for the admin funnel tab (spec 6, item 4;
 * docs/features/radar-guides-in-code.md 4.2). Pure.
 *
 * Input rows come from `analytics_radar_guide_funnel` (one row per week, page,
 * channel, campaign and utm_content), `analytics_radar_guide_pages` (one row
 * per week, career and guide page), `radar_reel_insights` and
 * `radar_comment_dms`. Counts may arrive as bigint strings, so every number
 * goes through `num`.
 *
 * "Pages" are code guide pages (levels). The funnel view still names its
 * columns `chapters_seen` / `chapters_completed`; only the labels change.
 */
import type { GuideIndexEntry } from "./guide-types";
import { radarUtmContent } from "./utm";
import type { RadarGuideFunnelRow, RadarReelInsightRow, RadarReelRow } from "./types";

export function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** a / b, or null when b is 0. */
export function ratio(a: number, b: number): number | null {
  return b > 0 ? a / b : null;
}

export function formatPct(value: number | null, digits = 0): string {
  return value === null ? "-" : `${(value * 100).toFixed(digits)}%`;
}

export interface FunnelTotals {
  visits: number;
  /** Sum of weekly unique devices; a device seen in two weeks counts twice. */
  devices: number;
  /** Guide pages (or deck chapters) seen, from the view's `chapters_seen`. */
  pagesSeen: number;
  plays: number;
  unmutes: number;
  completes: number;
  interactive: number;
  cta: number;
  follow: number;
  share: number;
  intents: number;
  requests: number;
}

function emptyTotals(): FunnelTotals {
  return {
    visits: 0,
    devices: 0,
    pagesSeen: 0,
    plays: 0,
    unmutes: 0,
    completes: 0,
    interactive: 0,
    cta: 0,
    follow: 0,
    share: 0,
    intents: 0,
    requests: 0,
  };
}

function addRow(totals: FunnelTotals, row: RadarGuideFunnelRow): void {
  totals.visits += num(row.visits);
  totals.devices += num(row.unique_devices);
  totals.pagesSeen += num(row.chapters_seen);
  totals.plays += num(row.video_plays);
  totals.unmutes += num(row.unmutes);
  totals.completes += num(row.visits_with_complete);
  totals.interactive += num(row.interactive_visits);
  totals.cta += num(row.cta_clicks);
  totals.follow += num(row.follow_intents);
  totals.share += num(row.share_clicks);
  totals.intents += num(row.intents);
  totals.requests += num(row.career_requests);
}

export function sumFunnel(rows: readonly RadarGuideFunnelRow[]): FunnelTotals {
  const totals = emptyTotals();
  for (const row of rows) addRow(totals, row);
  return totals;
}

export interface FunnelRates {
  pagesPerVisit: number | null;
  /** Unmutes per play. */
  unmutePct: number | null;
  /** Visits with a complete per play. */
  completePct: number | null;
  /** Visits with an interactive tap per visit. */
  interactivePct: number | null;
  followPct: number | null;
  sharePct: number | null;
}

export function funnelRates(t: FunnelTotals): FunnelRates {
  return {
    pagesPerVisit: ratio(t.pagesSeen, t.visits),
    unmutePct: ratio(t.unmutes, t.plays),
    completePct: ratio(t.completes, t.plays),
    interactivePct: ratio(t.interactive, t.visits),
    followPct: ratio(t.follow, t.visits),
    sharePct: ratio(t.share, t.visits),
  };
}

export interface ChannelPageRow {
  channel: string;
  page: string;
  totals: FunnelTotals;
}

/** Channel x page table, biggest first. */
export function groupByChannelPage(rows: readonly RadarGuideFunnelRow[]): ChannelPageRow[] {
  const groups = new Map<string, ChannelPageRow>();
  for (const row of rows) {
    const key = `${row.channel}\u0000${row.page}`;
    let group = groups.get(key);
    if (!group) {
      group = { channel: row.channel, page: row.page, totals: emptyTotals() };
      groups.set(key, group);
    }
    addRow(group.totals, row);
  }
  return [...groups.values()].sort(
    (a, b) => b.totals.visits - a.totals.visits || a.channel.localeCompare(b.channel) || a.page.localeCompare(b.page)
  );
}

/** Visits per (utm_source-derived channel, utm_content), for link and reel joins. */
export function visitsByContent(
  rows: readonly RadarGuideFunnelRow[],
  channel?: string
): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows) {
    if (!row.utm_content) continue;
    if (channel && row.channel !== channel) continue;
    out.set(row.utm_content, (out.get(row.utm_content) ?? 0) + num(row.visits));
  }
  return out;
}

/** Latest snapshot per reel (insights are cumulative lifetime numbers). */
export function latestInsights(rows: readonly RadarReelInsightRow[]): Map<string, RadarReelInsightRow> {
  const out = new Map<string, RadarReelInsightRow>();
  for (const row of rows) {
    const current = out.get(row.reel_id);
    if (!current || row.captured_on > current.captured_on) out.set(row.reel_id, row);
  }
  return out;
}

export interface ReelDmStats {
  /** Distinct commenters we claimed a DM for. */
  commenters: number;
  sent: number;
  failed: number;
}

export interface ReelFunnelRow {
  reel: RadarReelRow;
  utmContent: string;
  reach: number | null;
  views: number | null;
  avgWatchS: number | null;
  commenters: number;
  sent: number;
  failed: number;
  visits: number;
  dmVisits: number;
  commentersPer1k: number | null;
  sendsSavesPerReach: number | null;
  dmToVisit: number | null;
}

/** The utm_content the reel's DM link carries (spec 5.3), including its guide page. */
export function reelUtmContent(
  reel: Pick<RadarReelRow, "field_slug" | "chapter_key" | "video_kind" | "shortcode">
): string {
  return radarUtmContent({
    slug: reel.field_slug,
    page: reel.chapter_key,
    kind: reel.video_kind,
    shortcode: reel.shortcode,
  });
}

export function reelFunnelRows(
  reels: readonly RadarReelRow[],
  funnel: readonly RadarGuideFunnelRow[],
  insights: readonly RadarReelInsightRow[],
  dmStats: ReadonlyMap<string, ReelDmStats>
): ReelFunnelRow[] {
  const allVisits = visitsByContent(funnel);
  const dmVisits = visitsByContent(funnel, "ig-comment-dm");
  const latest = latestInsights(insights);
  return reels.map((reel) => {
    const utmContent = reelUtmContent(reel);
    const snapshot = latest.get(reel.id) ?? null;
    const stats = dmStats.get(reel.id) ?? { commenters: 0, sent: 0, failed: 0 };
    const reach = snapshot?.reach ?? null;
    const shares = num(snapshot?.shares);
    const saved = num(snapshot?.saved);
    const visitsDm = dmVisits.get(utmContent) ?? 0;
    return {
      reel,
      utmContent,
      reach,
      views: snapshot?.views ?? null,
      avgWatchS: snapshot?.avg_watch_ms != null ? snapshot.avg_watch_ms / 1000 : null,
      commenters: stats.commenters,
      sent: stats.sent,
      failed: stats.failed,
      visits: allVisits.get(utmContent) ?? 0,
      dmVisits: visitsDm,
      commentersPer1k: reach ? (stats.commenters / reach) * 1000 : null,
      sendsSavesPerReach: reach && snapshot ? (shares + saved) / reach : null,
      dmToVisit: ratio(visitsDm, stats.commenters),
    };
  });
}

/** Counts radar_comment_dms rows per reel; commenters are distinct IG users (or comments when unknown). */
export function reelDmStats(
  rows: ReadonlyArray<{ reel_id: string | null; status: string; comment_id: string; commenter: string | null }>
): Map<string, ReelDmStats> {
  const out = new Map<string, ReelDmStats & { people: Set<string> }>();
  for (const row of rows) {
    if (!row.reel_id) continue;
    let stats = out.get(row.reel_id);
    if (!stats) {
      stats = { commenters: 0, sent: 0, failed: 0, people: new Set() };
      out.set(row.reel_id, stats);
    }
    stats.people.add(row.commenter ?? `comment:${row.comment_id}`);
    if (row.status === "sent") stats.sent += 1;
    if (row.status === "failed") stats.failed += 1;
  }
  return new Map(
    [...out].map(([id, { people, ...rest }]) => [id, { ...rest, commenters: people.size }])
  );
}

export interface CareerRequestGroup {
  text: string;
  count: number;
  statuses: Record<string, number>;
  matchedFieldSlug: string | null;
  lastAt: string;
}

/** Groups career requests by lower(trimmed text), most requested first. */
export function groupCareerRequests(
  rows: ReadonlyArray<{ request_text: string; status: string; matched_field_slug: string | null; created_at: string }>
): CareerRequestGroup[] {
  const groups = new Map<string, CareerRequestGroup>();
  for (const row of rows) {
    const key = row.request_text.trim().replace(/\s+/g, " ").toLocaleLowerCase();
    let group = groups.get(key);
    if (!group) {
      group = { text: row.request_text.trim(), count: 0, statuses: {}, matchedFieldSlug: null, lastAt: row.created_at };
      groups.set(key, group);
    }
    group.count += 1;
    group.statuses[row.status] = (group.statuses[row.status] ?? 0) + 1;
    group.matchedFieldSlug ??= row.matched_field_slug;
    if (row.created_at > group.lastAt) group.lastAt = row.created_at;
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt));
}

/** Monday (Asia/Bangkok) `weeks - 1` weeks before `now`, as YYYY-MM-DD, matching the view's `week`. */
export function funnelWeekStart(weeks: number, now: Date = new Date()): string {
  const bangkok = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const day = (bangkok.getUTCDay() + 6) % 7; // Monday = 0
  bangkok.setUTCDate(bangkok.getUTCDate() - day - (Math.max(1, weeks) - 1) * 7);
  return bangkok.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Per guide page (analytics_radar_guide_pages)
// ---------------------------------------------------------------------------

/** `public.analytics_radar_guide_pages` (admin-only view, migration 20261111100200). */
export interface RadarGuidePageViewRow {
  field_slug: string | null;
  page_key: string;
  week: string;
  viewers: number;
  players: number;
  skips: number;
  clip_plays: number;
  clip_completes: number;
  shares: number;
  ctas: number;
}

export interface GuidePageFunnelRow {
  slug: string;
  pageKey: string;
  /** Level number from GUIDE_INDEX; null for keys the code guide does not have (deck chapters). */
  order: number | null;
  titleTh: string;
  viewers: number;
  players: number;
  skips: number;
  clipPlays: number;
  clipCompletes: number;
  shares: number;
  ctas: number;
  /** Viewers of this page per viewer of the guide's first page. */
  reachPct: number | null;
  /** Viewers who tapped a game on the page. */
  playPct: number | null;
  /** "ข้ามเกม ดูเฉลย" taps per player. */
  skipPct: number | null;
  /** Clip completes per clip play. */
  clipCompletePct: number | null;
  /** Below the page's milestone target (see GUIDE_PAGE_TARGETS). */
  belowTarget: Array<keyof typeof GUIDE_PAGE_TARGETS>;
}

/**
 * Pilot milestone targets per page, used only to flag rows in the admin.
 * Reach: share of first-page viewers still arriving. Play: viewers who play.
 * Skip: at most this share of players skip. Clip: completes per play.
 */
export const GUIDE_PAGE_TARGETS = {
  reachPct: 0.35,
  playPct: 0.6,
  skipPct: 0.3,
  clipCompletePct: 0.4,
} as const;

/**
 * One row per (career, page), summed over weeks. Every page of each code
 * guide in `guides` is listed in level order, even with no traffic, so drop
 * off is visible; keys the guide does not know follow, labelled by key.
 */
export function groupGuidePages(
  rows: readonly RadarGuidePageViewRow[],
  guides: readonly Pick<GuideIndexEntry, "slug" | "pages">[]
): GuidePageFunnelRow[] {
  const sums = new Map<string, Omit<GuidePageFunnelRow, "order" | "titleTh" | "reachPct" | "playPct" | "skipPct" | "clipCompletePct" | "belowTarget">>();
  const keyOf = (slug: string, page: string) => `${slug}\u0000${page}`;
  const ensure = (slug: string, pageKey: string) => {
    const key = keyOf(slug, pageKey);
    let sum = sums.get(key);
    if (!sum) {
      sum = { slug, pageKey, viewers: 0, players: 0, skips: 0, clipPlays: 0, clipCompletes: 0, shares: 0, ctas: 0 };
      sums.set(key, sum);
    }
    return sum;
  };
  for (const guide of guides) for (const page of guide.pages) ensure(guide.slug, page.key);
  for (const row of rows) {
    if (!row.page_key) continue;
    const sum = ensure(row.field_slug ?? "hub", row.page_key);
    sum.viewers += num(row.viewers);
    sum.players += num(row.players);
    sum.skips += num(row.skips);
    sum.clipPlays += num(row.clip_plays);
    sum.clipCompletes += num(row.clip_completes);
    sum.shares += num(row.shares);
    sum.ctas += num(row.ctas);
  }

  const pageMeta = new Map<string, { order: number; titleTh: string }>();
  const firstViewers = new Map<string, number>();
  for (const guide of guides) {
    const sorted = [...guide.pages].sort((a, b) => a.order - b.order);
    for (const page of sorted) pageMeta.set(keyOf(guide.slug, page.key), { order: page.order, titleTh: page.titleTh });
    if (sorted[0]) firstViewers.set(guide.slug, sums.get(keyOf(guide.slug, sorted[0].key))?.viewers ?? 0);
  }

  return [...sums.values()]
    .map((sum) => {
      const meta = pageMeta.get(keyOf(sum.slug, sum.pageKey));
      const first = firstViewers.get(sum.slug) ?? 0;
      const rates = {
        reachPct: meta ? ratio(sum.viewers, first) : null,
        playPct: ratio(sum.players, sum.viewers),
        skipPct: ratio(sum.skips, sum.players),
        clipCompletePct: ratio(sum.clipCompletes, sum.clipPlays),
      };
      const belowTarget = (Object.keys(GUIDE_PAGE_TARGETS) as Array<keyof typeof GUIDE_PAGE_TARGETS>).filter((k) => {
        const value = rates[k];
        if (value === null) return false;
        return k === "skipPct" ? value > GUIDE_PAGE_TARGETS[k] : value < GUIDE_PAGE_TARGETS[k];
      });
      return {
        ...sum,
        order: meta?.order ?? null,
        titleTh: meta?.titleTh ?? sum.pageKey,
        ...rates,
        belowTarget,
      };
    })
    .sort(
      (a, b) =>
        a.slug.localeCompare(b.slug) ||
        (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
        a.pageKey.localeCompare(b.pageKey)
    );
}
