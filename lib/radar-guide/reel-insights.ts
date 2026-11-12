/**
 * Daily Instagram insights snapshot for mapped Radar reels (spec 5.7).
 *
 * The cron route wires Graph and Supabase in; everything here takes them as
 * arguments so it can be tested without either. Missing permissions or
 * metrics are logged and skipped, never fatal.
 */
import type { RadarReelInsightRow } from "./types";

/** Asked for together; Instagram supports all of these on reels. */
export const REEL_CORE_METRICS = [
  "views",
  "reach",
  "saved",
  "shares",
  "comments",
  "likes",
  "ig_reels_avg_watch_time",
] as const;

/**
 * Asked for one at a time, because Instagram fails the whole request when one
 * metric is unavailable for the media type or the token's permissions.
 */
export const REEL_OPTIONAL_METRICS = ["follows", "profile_visits", "total_interactions"] as const;

/** How far back to keep snapshotting a reel. */
export const REEL_INSIGHTS_DAYS = 30;

export type FetchInsights = (mediaId: string, metrics: string[]) => Promise<Record<string, number>>;

function intOrNull(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

/** The Bangkok calendar date, so one snapshot per Thai day. */
export function bangkokDate(now: number): string {
  return new Date(now + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Maps Graph metric names to the table's columns; everything also goes in `raw`. */
export function insightsToRow(
  reelId: string,
  capturedOn: string,
  metrics: Record<string, number>
): Omit<RadarReelInsightRow, "created_at"> {
  return {
    reel_id: reelId,
    captured_on: capturedOn,
    views: intOrNull(metrics.views),
    reach: intOrNull(metrics.reach),
    saved: intOrNull(metrics.saved),
    shares: intOrNull(metrics.shares),
    comments: intOrNull(metrics.comments),
    likes: intOrNull(metrics.likes),
    // Instagram reports ig_reels_avg_watch_time in milliseconds.
    avg_watch_ms: intOrNull(metrics.ig_reels_avg_watch_time),
    follows: intOrNull(metrics.follows),
    profile_visits: intOrNull(metrics.profile_visits),
    raw: { ...metrics },
  };
}

function shortError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const code = message.match(/"code"\s*:\s*(\d+)/)?.[1] ?? (error as { code?: number })?.code;
  return code ? `meta_${code}` : message.slice(0, 80);
}

/**
 * Every metric Instagram will give for one reel. The core group is one call;
 * if it fails, each core metric is retried alone so one unsupported metric
 * does not lose the rest. Optional metrics are always asked for alone.
 */
export async function collectReelMetrics(
  mediaId: string,
  fetchInsights: FetchInsights
): Promise<{ metrics: Record<string, number>; missing: string[] }> {
  const metrics: Record<string, number> = {};
  const missing: string[] = [];

  const one = async (metric: string) => {
    try {
      Object.assign(metrics, await fetchInsights(mediaId, [metric]));
    } catch (error) {
      missing.push(`${metric}:${shortError(error)}`);
    }
  };

  try {
    Object.assign(metrics, await fetchInsights(mediaId, [...REEL_CORE_METRICS]));
  } catch {
    for (const metric of REEL_CORE_METRICS) await one(metric);
  }
  for (const metric of REEL_OPTIONAL_METRICS) await one(metric);

  return { metrics, missing };
}

export interface ReelInsightsTarget {
  id: string;
  media_id: string | null;
}

export interface ReelInsightsRunResult {
  captured: number;
  skipped: number;
  failed: number;
  stoppedEarly: boolean;
}

/** Snapshots each reel; one failure never stops the rest. */
export async function runReelInsights({
  reels,
  fetchInsights,
  save,
  now,
  deadline,
}: {
  reels: ReelInsightsTarget[];
  fetchInsights: FetchInsights;
  save: (row: Omit<RadarReelInsightRow, "created_at">) => Promise<void>;
  now: number;
  deadline: number;
}): Promise<ReelInsightsRunResult> {
  const capturedOn = bangkokDate(now);
  const result: ReelInsightsRunResult = { captured: 0, skipped: 0, failed: 0, stoppedEarly: false };

  for (const reel of reels) {
    if (Date.now() > deadline) {
      result.stoppedEarly = true;
      break;
    }
    if (!reel.media_id) {
      result.skipped += 1;
      continue;
    }
    try {
      const { metrics, missing } = await collectReelMetrics(reel.media_id, fetchInsights);
      if (missing.length > 0) {
        console.warn("Radar reel insights: metrics unavailable", {
          errorCode: "radar_insights_metric_missing",
          reelId: reel.id,
          missing,
        });
      }
      if (Object.keys(metrics).length === 0) {
        result.skipped += 1;
        continue;
      }
      await save(insightsToRow(reel.id, capturedOn, metrics));
      result.captured += 1;
    } catch (error) {
      result.failed += 1;
      console.error("Radar reel insights: reel failed", {
        errorCode: "radar_insights_reel_failed",
        reelId: reel.id,
        message: shortError(error),
      });
    }
  }
  return result;
}
