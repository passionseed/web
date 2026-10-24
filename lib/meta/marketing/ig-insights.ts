import { IG_GRAPH_HOST } from "@/lib/meta/graph";
import { graphGet, graphGetAll, isInvalidParameter } from "@/lib/meta/marketing/client";
import { addDays, bangkokDayStartUnix } from "@/lib/meta/marketing/dates";

/**
 * Instagram organic insights through the Instagram API with Instagram Login
 * (graph.instagram.com, IGAA token). Needs the token to carry
 * `instagram_business_basic` and `instagram_business_manage_insights`.
 */

interface InsightBreakdown {
  dimension_keys?: string[];
  results?: { dimension_values?: string[]; value?: number }[];
}

export interface GraphInsight {
  name: string;
  period?: string;
  values?: { value?: unknown; end_time?: string }[];
  total_value?: { value?: number; breakdowns?: InsightBreakdown[] };
}

export interface GraphIgMedia {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  timestamp?: string;
}

export const ACCOUNT_TOTAL_METRICS = [
  "reach",
  "views",
  "profile_views",
  "accounts_engaged",
  "total_interactions",
  "website_clicks",
] as const;

const REELS_METRICS = [
  "reach",
  "views",
  "likes",
  "comments",
  "saved",
  "shares",
  "total_interactions",
  "ig_reels_avg_watch_time",
];

const FEED_METRICS = [
  "reach",
  "views",
  "likes",
  "comments",
  "saved",
  "shares",
  "total_interactions",
  "follows",
  "profile_visits",
];

export interface IgAccountDayRow {
  ig_user_id: string;
  date: string;
  reach: number | null;
  views: number | null;
  profile_views: number | null;
  accounts_engaged: number | null;
  total_interactions: number | null;
  website_clicks: number | null;
  follows: number | null;
  unfollows: number | null;
}

export interface IgProfileSnapshot {
  followers_count: number | null;
  media_count: number | null;
}

export interface IgMediaRow {
  id: string;
  ig_user_id: string;
  media_type: string | null;
  media_product_type: string | null;
  caption: string | null;
  permalink: string | null;
  posted_at: string | null;
}

export interface IgMediaInsightsRow {
  media_id: string;
  snapshot_date: string;
  reach: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  total_interactions: number | null;
  follows: number | null;
  profile_visits: number | null;
  avg_watch_time_ms: number | null;
}

function asCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

/** Metric name -> value, reading total_value first, then a lifetime value. */
export function insightTotals(insights: GraphInsight[]): Record<string, number | null> {
  const totals: Record<string, number | null> = {};
  for (const insight of insights) {
    totals[insight.name] = asCount(insight.total_value?.value ?? insight.values?.[0]?.value);
  }
  return totals;
}

/**
 * follows_and_unfollows broken down by follow_type: FOLLOWER counts accounts
 * that followed, NON_FOLLOWER counts accounts that unfollowed.
 */
export function parseFollowBreakdown(insights: GraphInsight[]): {
  follows: number | null;
  unfollows: number | null;
} {
  const insight = insights.find((i) => i.name === "follows_and_unfollows");
  const results = insight?.total_value?.breakdowns?.[0]?.results ?? [];
  const valueFor = (type: string) =>
    asCount(results.find((r) => r.dimension_values?.[0] === type)?.value);
  return { follows: valueFor("FOLLOWER"), unfollows: valueFor("NON_FOLLOWER") };
}

export function parseAccountDay(
  igUserId: string,
  date: string,
  totals: GraphInsight[],
  follows: GraphInsight[]
): IgAccountDayRow {
  const values = insightTotals(totals);
  return {
    ig_user_id: igUserId,
    date,
    reach: values.reach ?? null,
    views: values.views ?? null,
    profile_views: values.profile_views ?? null,
    accounts_engaged: values.accounts_engaged ?? null,
    total_interactions: values.total_interactions ?? null,
    website_clicks: values.website_clicks ?? null,
    ...parseFollowBreakdown(follows),
  };
}

export function parseMediaRow(igUserId: string, media: GraphIgMedia): IgMediaRow {
  return {
    id: media.id,
    ig_user_id: igUserId,
    media_type: media.media_type ?? null,
    media_product_type: media.media_product_type ?? null,
    caption: media.caption ?? null,
    permalink: media.permalink ?? null,
    posted_at: media.timestamp ?? null,
  };
}

export function parseMediaInsights(
  mediaId: string,
  snapshotDate: string,
  insights: GraphInsight[]
): IgMediaInsightsRow {
  const values = insightTotals(insights);
  return {
    media_id: mediaId,
    snapshot_date: snapshotDate,
    reach: values.reach ?? null,
    views: values.views ?? null,
    likes: values.likes ?? null,
    comments: values.comments ?? null,
    saves: values.saved ?? null,
    shares: values.shares ?? null,
    total_interactions: values.total_interactions ?? null,
    follows: values.follows ?? null,
    profile_visits: values.profile_visits ?? null,
    avg_watch_time_ms: values.ig_reels_avg_watch_time ?? null,
  };
}

export function mediaMetricsFor(media: Pick<GraphIgMedia, "media_product_type">): string[] {
  return media.media_product_type === "REELS" ? REELS_METRICS : FEED_METRICS;
}

/**
 * Asks for every metric at once; if Meta rejects the set as invalid (one
 * metric not offered for this account or media type), retries one metric at
 * a time and drops the ones it rejects. When none survive, the original error
 * is rethrown so nothing writes an all-empty row. Permission, token and
 * rate-limit errors are rethrown straight away.
 */
export async function fetchInsightsTolerant(
  metrics: readonly string[],
  fetchMetrics: (metrics: readonly string[]) => Promise<GraphInsight[]>
): Promise<GraphInsight[]> {
  try {
    return await fetchMetrics(metrics);
  } catch (error) {
    if (!isInvalidParameter(error)) throw error;
    const insights: GraphInsight[] = [];
    for (const metric of metrics.length > 1 ? metrics : []) {
      try {
        insights.push(...(await fetchMetrics([metric])));
      } catch (single) {
        if (!isInvalidParameter(single)) throw single;
      }
    }
    if (insights.length === 0) throw error;
    return insights;
  }
}

/** Account insights for one Bangkok day. Two calls. */
export async function fetchIgAccountDay(
  igUserId: string,
  date: string,
  accessToken: string
): Promise<IgAccountDayRow> {
  const window = {
    metric_type: "total_value",
    period: "day",
    since: bangkokDayStartUnix(date),
    until: bangkokDayStartUnix(addDays(date, 1)),
  };
  const totals = await fetchInsightsTolerant(ACCOUNT_TOTAL_METRICS, async (metrics) =>
    (
      await graphGet<{ data: GraphInsight[] }>(
        IG_GRAPH_HOST,
        `${igUserId}/insights`,
        { ...window, metric: metrics.join(",") },
        accessToken
      )
    ).data
  );
  let follows: GraphInsight[] = [];
  try {
    follows = (
      await graphGet<{ data: GraphInsight[] }>(
        IG_GRAPH_HOST,
        `${igUserId}/insights`,
        { ...window, metric: "follows_and_unfollows", breakdown: "follow_type" },
        accessToken
      )
    ).data;
  } catch (error) {
    // Optional metric: an account without it still gets its reach and views.
    if (!isInvalidParameter(error)) throw error;
  }
  return parseAccountDay(igUserId, date, totals, follows);
}

export async function fetchIgProfileSnapshot(
  igUserId: string,
  accessToken: string
): Promise<IgProfileSnapshot> {
  const profile = await graphGet<{ followers_count?: number; media_count?: number }>(
    IG_GRAPH_HOST,
    igUserId,
    { fields: "followers_count,media_count" },
    accessToken
  );
  return {
    followers_count: asCount(profile.followers_count),
    media_count: asCount(profile.media_count),
  };
}

/** Posts and Reels published on or after `sinceIso`, newest first. */
export async function listIgMediaSince(
  igUserId: string,
  sinceIso: string,
  accessToken: string
): Promise<GraphIgMedia[]> {
  const isOlder = (m: GraphIgMedia) => !!m.timestamp && m.timestamp < sinceIso;
  const media = await graphGetAll<GraphIgMedia>(
    IG_GRAPH_HOST,
    `${igUserId}/media`,
    { fields: "id,caption,media_type,media_product_type,permalink,timestamp", limit: 50 },
    accessToken,
    { stopAfter: (page) => page.some(isOlder) }
  );
  return media.filter((m) => !isOlder(m));
}

export async function fetchIgMediaInsights(
  media: GraphIgMedia,
  snapshotDate: string,
  accessToken: string
): Promise<IgMediaInsightsRow> {
  const insights = await fetchInsightsTolerant(mediaMetricsFor(media), async (metrics) =>
    (
      await graphGet<{ data: GraphInsight[] }>(
        IG_GRAPH_HOST,
        `${media.id}/insights`,
        { metric: metrics.join(",") },
        accessToken
      )
    ).data
  );
  return parseMediaInsights(media.id, snapshotDate, insights);
}
