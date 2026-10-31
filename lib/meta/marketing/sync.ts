import { fetchAds, fetchAdsDaily, normalizeAdAccountId } from "@/lib/meta/marketing/ads-insights";
import { errorCodeFor, isMissingPermission } from "@/lib/meta/marketing/client";
import { addDays, bangkokDay, daysBetween, type DayRange } from "@/lib/meta/marketing/dates";
import {
  fetchIgAccountDay,
  fetchIgMediaInsights,
  fetchIgProfileSnapshot,
  listIgMediaSince,
  parseMediaRow,
  type IgMediaInsightsRow,
} from "@/lib/meta/marketing/ig-insights";
import { MetaGraphApiError } from "@/lib/meta/graph";
import {
  recordSyncRun,
  upsertIgAccountDays,
  upsertIgMedia,
  upsertIgMediaInsights,
  upsertIgProfileSnapshot,
  upsertMetaAds,
  upsertMetaAdsDaily,
  type MarketingSource,
  type SyncStatus,
  type SyncTrigger,
} from "@/lib/supabase/meta-marketing";

/**
 * Read-only daily sync of Instagram organic insights and Meta Ads results.
 * Only ever GETs from Meta; it never sends, edits or changes anything there.
 */

export const MARKETING_SOURCES: MarketingSource[] = ["meta_ads", "ig_account", "ig_media"];

/** A scheduled run re-reads this many days: Meta revises insights for ~48h. */
export const CRON_TRAILING_DAYS = 3;
/** A scheduled run refreshes lifetime insights for posts this recent. */
export const MEDIA_LOOKBACK_DAYS = 90;
/** Ads insights are requested in windows this long to keep responses small. */
const ADS_WINDOW_DAYS = 31;

export interface SourceResult {
  source: MarketingSource;
  status: SyncStatus;
  errorCode: string | null;
  rowsUpserted: number;
  /** First day not reached before the deadline; rerun from here. */
  resumeFrom?: string;
}

export interface SyncOptions {
  range: DayRange;
  /** Posts published on or after this day get a fresh insights snapshot. */
  mediaSince: string;
  sources: MarketingSource[];
  trigger: SyncTrigger;
  deadlineMs: number;
}

/** Codes shown on the admin page; each maps to a setup step in the docs. */
export const SYNC_ERROR_CODES = {
  igNotConfigured: "missing_env_instagram",
  igPermission: "ig_insights_permission_missing",
  adsNotConfigured: "missing_env_meta_ads",
  adsPermission: "ads_read_permission_missing",
} as const;

function igConfig() {
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  // A dedicated read-only insights token is preferred; the DM token works too
  // once it carries instagram_business_manage_insights.
  const token = process.env.META_IG_INSIGHTS_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN;
  return igUserId && token ? { igUserId, token } : null;
}

function adsConfig() {
  const accountId = process.env.META_AD_ACCOUNT_ID;
  const token = process.env.META_ADS_ACCESS_TOKEN;
  return accountId && token ? { adAccountId: normalizeAdAccountId(accountId), token } : null;
}

/** Stop on anything a retry within this run cannot fix. */
function isFatal(error: unknown): boolean {
  return (
    error instanceof MetaGraphApiError &&
    (error.isRateLimited || error.isTokenExpired || isMissingPermission(error))
  );
}

function failure(
  source: MarketingSource,
  error: unknown,
  rowsUpserted: number,
  permissionCode: string
): SourceResult {
  return {
    source,
    status: rowsUpserted > 0 ? "partial" : "failed",
    errorCode: errorCodeFor(error, permissionCode),
    rowsUpserted,
  };
}

async function syncIgAccount(options: SyncOptions): Promise<SourceResult> {
  const config = igConfig();
  if (!config) {
    return { source: "ig_account", status: "skipped", errorCode: SYNC_ERROR_CODES.igNotConfigured, rowsUpserted: 0 };
  }
  let rows = 0;
  try {
    for (const day of daysBetween(options.range.since, options.range.until)) {
      if (Date.now() >= options.deadlineMs) {
        return { source: "ig_account", status: "partial", errorCode: "deadline", rowsUpserted: rows, resumeFrom: day };
      }
      rows += await upsertIgAccountDays([await fetchIgAccountDay(config.igUserId, day, config.token)]);
    }
    const snapshot = await fetchIgProfileSnapshot(config.igUserId, config.token);
    rows += await upsertIgProfileSnapshot(config.igUserId, bangkokDay(), snapshot);
    return { source: "ig_account", status: "ok", errorCode: null, rowsUpserted: rows };
  } catch (error) {
    return failure("ig_account", error, rows, SYNC_ERROR_CODES.igPermission);
  }
}

async function syncIgMedia(options: SyncOptions): Promise<SourceResult> {
  const config = igConfig();
  if (!config) {
    return { source: "ig_media", status: "skipped", errorCode: SYNC_ERROR_CODES.igNotConfigured, rowsUpserted: 0 };
  }
  const snapshotDate = bangkokDay();
  const insights: IgMediaInsightsRow[] = [];
  let rows = 0;
  let skipped = 0;
  let stopped: unknown = null;
  let reachedDeadline = false;
  try {
    const media = await listIgMediaSince(config.igUserId, `${options.mediaSince}T00:00:00+07:00`, config.token);
    rows += await upsertIgMedia(media.map((m) => parseMediaRow(config.igUserId, m)));
    for (const item of media) {
      if (Date.now() >= options.deadlineMs) {
        reachedDeadline = true;
        break;
      }
      try {
        insights.push(await fetchIgMediaInsights(item, snapshotDate, config.token));
      } catch (error) {
        if (isFatal(error)) {
          stopped = error;
          break;
        }
        // One post Meta will not report on (too old, deleted) is not fatal.
        skipped += 1;
      }
    }
  } catch (error) {
    stopped = error;
  }

  try {
    rows += await upsertIgMediaInsights(insights);
  } catch (error) {
    return failure("ig_media", error, rows, SYNC_ERROR_CODES.igPermission);
  }
  if (stopped) return failure("ig_media", stopped, rows, SYNC_ERROR_CODES.igPermission);
  if (reachedDeadline) return { source: "ig_media", status: "partial", errorCode: "deadline", rowsUpserted: rows };
  if (skipped > 0) return { source: "ig_media", status: "partial", errorCode: `skipped_${skipped}_media`, rowsUpserted: rows };
  return { source: "ig_media", status: "ok", errorCode: null, rowsUpserted: rows };
}

async function syncMetaAds(options: SyncOptions): Promise<SourceResult> {
  const config = adsConfig();
  if (!config) {
    return { source: "meta_ads", status: "skipped", errorCode: SYNC_ERROR_CODES.adsNotConfigured, rowsUpserted: 0 };
  }
  let rows = 0;
  const adIds = new Set<string>();
  try {
    for (let since = options.range.since; since <= options.range.until; since = addDays(since, ADS_WINDOW_DAYS)) {
      if (Date.now() >= options.deadlineMs) {
        return { source: "meta_ads", status: "partial", errorCode: "deadline", rowsUpserted: rows, resumeFrom: since };
      }
      const windowEnd = addDays(since, ADS_WINDOW_DAYS - 1);
      const until = windowEnd < options.range.until ? windowEnd : options.range.until;
      const daily = await fetchAdsDaily(config.adAccountId, since, until, config.token);
      rows += await upsertMetaAdsDaily(daily);
      for (const row of daily) adIds.add(row.ad_id);
    }
    rows += await upsertMetaAds(await fetchAds(config.adAccountId, [...adIds], config.token));
    return { source: "meta_ads", status: "ok", errorCode: null, rowsUpserted: rows };
  } catch (error) {
    return failure("meta_ads", error, rows, SYNC_ERROR_CODES.adsPermission);
  }
}

const RUNNERS: Record<MarketingSource, (options: SyncOptions) => Promise<SourceResult>> = {
  meta_ads: syncMetaAds,
  ig_account: syncIgAccount,
  ig_media: syncIgMedia,
};

/** Runs each requested source in turn and logs one run row per source. */
export async function runMetaMarketingSync(options: SyncOptions): Promise<SourceResult[]> {
  const results: SourceResult[] = [];
  for (const source of MARKETING_SOURCES.filter((s) => options.sources.includes(s))) {
    const startedAt = new Date().toISOString();
    const result = await RUNNERS[source](options);
    if (result.errorCode && result.status !== "skipped") {
      console.error("[meta marketing] source did not finish", { source, errorCode: result.errorCode });
    }
    await recordSyncRun({
      source,
      trigger: options.trigger,
      since: source === "ig_media" ? options.mediaSince : options.range.since,
      until: options.range.until,
      status: result.status,
      errorCode: result.errorCode,
      rowsUpserted: result.rowsUpserted,
      startedAt,
    });
    results.push(result);
  }
  return results;
}
