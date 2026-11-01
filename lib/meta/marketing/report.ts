import { normalizeShiftSource } from "@/lib/shift/attribution";
import { DIRECT_SOURCE } from "@/lib/shift/applicationStats";
import type { MarketingSource, SyncStatus } from "@/lib/supabase/meta-marketing";

/**
 * Pure aggregation behind /admin/marketing. Joins Meta Ads spend to SHIFT
 * applications on utm_source, the only campaign tag `shift_applications`
 * records today, so seats are attributed per source, not per ad.
 */

export interface AccountDayRecord {
  date: string;
  reach: number | null;
  views: number | null;
  profile_views: number | null;
  website_clicks: number | null;
  follows: number | null;
  unfollows: number | null;
}

export interface MediaRecord {
  id: string;
  caption: string | null;
  permalink: string | null;
  media_product_type: string | null;
  posted_at: string | null;
}

export interface MediaInsightRecord {
  media_id: string;
  snapshot_date: string;
  reach: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  follows: number | null;
}

export interface AdsDailyRecord {
  date: string;
  ad_id: string;
  ad_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  currency: string | null;
  spend: number | string;
  impressions: number;
  link_clicks: number | null;
  landing_page_views: number | null;
  leads: number | null;
}

export interface AdUtmRecord {
  ad_id: string;
  utm_source: string | null;
  utm_content: string | null;
}

export interface ApplicationRecord {
  source: string | null;
  paid_at: string | null;
}

export interface SyncRunRecordRow {
  source: MarketingSource;
  status: SyncStatus;
  error_code: string | null;
  rows_upserted: number;
  finished_at: string | null;
}

export interface MarketingReportInput {
  accountDays: AccountDayRecord[];
  /** Most recent follower total from any sync, not limited to the range. */
  latestFollowers: number | null;
  media: MediaRecord[];
  mediaInsights: MediaInsightRecord[];
  adsDaily: AdsDailyRecord[];
  ads: AdUtmRecord[];
  applications: ApplicationRecord[];
  runs: SyncRunRecordRow[];
}

export interface PostSummary extends Omit<MediaInsightRecord, "media_id" | "snapshot_date"> {
  id: string;
  caption: string | null;
  permalink: string | null;
  type: string | null;
  postedAt: string | null;
}

export interface AdSummary {
  key: string;
  name: string;
  campaignName: string | null;
  spend: number;
  impressions: number;
  linkClicks: number;
  leads: number;
  /** Link CTR, link clicks / impressions. Null with no impressions. */
  ctr: number | null;
  utmSource: string | null;
  utmContent: string | null;
}

export interface SourceSummary {
  source: string;
  spend: number | null;
  applications: number;
  paidSeats: number;
  costPerPaidSeat: number | null;
  /** Ads sharing this utm_source; their seats cannot be split between them. */
  adCount: number;
}

export interface MarketingReport {
  instagram: {
    reach: number;
    views: number;
    profileViews: number;
    websiteClicks: number;
    follows: number;
    unfollows: number;
    followers: number | null;
    days: number;
  };
  topPosts: PostSummary[];
  adsTotals: {
    spend: number;
    impressions: number;
    linkClicks: number;
    leads: number;
    currency: string | null;
  };
  campaigns: AdSummary[];
  ads: AdSummary[];
  sources: SourceSummary[];
  latestRuns: SyncRunRecordRow[];
}

const TOP_POSTS = 10;

const sum = (values: (number | null)[]) => values.reduce<number>((total, v) => total + (v ?? 0), 0);

function toNumber(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Latest snapshot per post. */
function latestInsights(rows: MediaInsightRecord[]): Map<string, MediaInsightRecord> {
  const latest = new Map<string, MediaInsightRecord>();
  for (const row of rows) {
    const current = latest.get(row.media_id);
    if (!current || row.snapshot_date > current.snapshot_date) latest.set(row.media_id, row);
  }
  return latest;
}

function buildTopPosts(media: MediaRecord[], insights: MediaInsightRecord[]): PostSummary[] {
  const latest = latestInsights(insights);
  return media
    .flatMap((m) => {
      const row = latest.get(m.id);
      if (!row) return [];
      const { media_id: _id, snapshot_date: _date, ...metrics } = row;
      return [{
        id: m.id,
        caption: m.caption,
        permalink: m.permalink,
        type: m.media_product_type,
        postedAt: m.posted_at,
        ...metrics,
      }];
    })
    .sort((a, b) => (b.reach ?? 0) - (a.reach ?? 0))
    .slice(0, TOP_POSTS);
}

function groupAds(
  rows: AdsDailyRecord[],
  keyOf: (row: AdsDailyRecord) => string,
  nameOf: (row: AdsDailyRecord) => string,
  utmByAd: Map<string, AdUtmRecord>
): AdSummary[] {
  const groups = new Map<string, AdSummary>();
  for (const row of rows) {
    const key = keyOf(row);
    const utm = utmByAd.get(row.ad_id);
    const group = groups.get(key) ?? {
      key,
      name: nameOf(row),
      campaignName: row.campaign_name,
      spend: 0,
      impressions: 0,
      linkClicks: 0,
      leads: 0,
      ctr: null,
      utmSource: utm?.utm_source ?? null,
      utmContent: utm?.utm_content ?? null,
    };
    group.spend += toNumber(row.spend);
    group.impressions += row.impressions;
    group.linkClicks += row.link_clicks ?? 0;
    group.leads += row.leads ?? 0;
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, spend: Math.round(g.spend * 100) / 100, ctr: g.impressions > 0 ? g.linkClicks / g.impressions : null }))
    .sort((a, b) => b.spend - a.spend);
}

function buildSources(ads: AdSummary[], applications: ApplicationRecord[]): SourceSummary[] {
  const bySource = new Map<string, SourceSummary>();
  const entry = (source: string) => {
    const existing = bySource.get(source);
    if (existing) return existing;
    const created: SourceSummary = { source, spend: null, applications: 0, paidSeats: 0, costPerPaidSeat: null, adCount: 0 };
    bySource.set(source, created);
    return created;
  };
  for (const ad of ads) {
    if (!ad.utmSource) continue;
    const row = entry(ad.utmSource);
    row.spend = (row.spend ?? 0) + ad.spend;
    row.adCount += 1;
  }
  for (const application of applications) {
    const row = entry(normalizeShiftSource(application.source) ?? DIRECT_SOURCE);
    row.applications += 1;
    if (application.paid_at) row.paidSeats += 1;
  }
  return [...bySource.values()]
    .map((s) => ({
      ...s,
      spend: s.spend === null ? null : Math.round(s.spend * 100) / 100,
      costPerPaidSeat: s.spend !== null && s.paidSeats > 0 ? Math.round((s.spend / s.paidSeats) * 100) / 100 : null,
    }))
    .sort((a, b) => b.paidSeats - a.paidSeats || (b.spend ?? 0) - (a.spend ?? 0) || b.applications - a.applications);
}

function latestRunPerSource(runs: SyncRunRecordRow[]): SyncRunRecordRow[] {
  const latest = new Map<MarketingSource, SyncRunRecordRow>();
  for (const run of runs) {
    const current = latest.get(run.source);
    if (!current || (run.finished_at ?? "") > (current.finished_at ?? "")) latest.set(run.source, run);
  }
  return [...latest.values()];
}

export function buildMarketingReport(input: MarketingReportInput): MarketingReport {
  const days = input.accountDays;
  const utmByAd = new Map(input.ads.map((ad) => [ad.ad_id, ad]));
  const ads = groupAds(input.adsDaily, (r) => r.ad_id, (r) => r.ad_name ?? r.ad_id, utmByAd);
  const campaigns = groupAds(
    input.adsDaily,
    (r) => r.campaign_id ?? "unknown",
    (r) => r.campaign_name ?? r.campaign_id ?? "Unknown campaign",
    new Map()
  );

  return {
    instagram: {
      reach: sum(days.map((d) => d.reach)),
      views: sum(days.map((d) => d.views)),
      profileViews: sum(days.map((d) => d.profile_views)),
      websiteClicks: sum(days.map((d) => d.website_clicks)),
      follows: sum(days.map((d) => d.follows)),
      unfollows: sum(days.map((d) => d.unfollows)),
      followers: input.latestFollowers,
      days: days.filter((d) => d.reach !== null || d.views !== null).length,
    },
    topPosts: buildTopPosts(input.media, input.mediaInsights),
    adsTotals: {
      spend: Math.round(sum(ads.map((a) => a.spend)) * 100) / 100,
      impressions: sum(ads.map((a) => a.impressions)),
      linkClicks: sum(ads.map((a) => a.linkClicks)),
      leads: sum(ads.map((a) => a.leads)),
      currency: input.adsDaily.find((r) => r.currency)?.currency ?? null,
    },
    campaigns,
    ads,
    sources: buildSources(ads, input.applications),
    latestRuns: latestRunPerSource(input.runs),
  };
}
