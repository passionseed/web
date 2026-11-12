/**
 * Writes for the Meta marketing sync. Every write is an upsert on the table's
 * natural key (id + date), so reruns and overlapping backfills are safe.
 */
import type { MetaAdRow, MetaAdsDailyRow } from "@/lib/meta/marketing/ads-insights";
import type {
  IgAccountDayRow,
  IgMediaInsightsRow,
  IgMediaRow,
  IgProfileSnapshot,
} from "@/lib/meta/marketing/ig-insights";
import { createAdminClient } from "@/utils/supabase/admin";

/** Rows per upsert request, well under PostgREST's payload limit. */
const CHUNK = 500;

export type MarketingSource = "ig_account" | "ig_media" | "meta_ads";
export type SyncTrigger = "cron" | "manual";
export type SyncStatus = "ok" | "partial" | "skipped" | "failed";

export interface SyncRunRecord {
  source: MarketingSource;
  trigger: SyncTrigger;
  since: string | null;
  until: string | null;
  status: SyncStatus;
  errorCode: string | null;
  rowsUpserted: number;
  startedAt: string;
}

async function upsertRows<T extends object>(
  table: string,
  rows: T[],
  onConflict: string
): Promise<number> {
  if (rows.length === 0) return 0;
  const supabase = createAdminClient();
  const syncedAt = new Date().toISOString();
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map((row) => ({ ...row, synced_at: syncedAt }));
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(`upsert ${table} failed: ${error.message}`);
  }
  return rows.length;
}

export function upsertIgAccountDays(rows: IgAccountDayRow[]): Promise<number> {
  return upsertRows("ig_account_daily", rows, "ig_user_id,date");
}

/**
 * Follower total as observed on `date`. Sent as its own upsert so a backfill
 * of insight columns never blanks a snapshot taken on an earlier run.
 */
export function upsertIgProfileSnapshot(
  igUserId: string,
  date: string,
  snapshot: IgProfileSnapshot
): Promise<number> {
  return upsertRows("ig_account_daily", [{ ig_user_id: igUserId, date, ...snapshot }], "ig_user_id,date");
}

export function upsertIgMedia(rows: IgMediaRow[]): Promise<number> {
  return upsertRows("ig_media", rows, "id");
}

export function upsertIgMediaInsights(rows: IgMediaInsightsRow[]): Promise<number> {
  return upsertRows("ig_media_insights", rows, "media_id,snapshot_date");
}

export function upsertMetaAdsDaily(rows: MetaAdsDailyRow[]): Promise<number> {
  return upsertRows("meta_ads_daily", rows, "date,ad_id");
}

export function upsertMetaAds(rows: MetaAdRow[]): Promise<number> {
  return upsertRows("meta_ads", rows, "ad_id");
}

/** Never throws: a missing log row must not fail the sync itself. */
export async function recordSyncRun(run: SyncRunRecord): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from("meta_marketing_sync_runs")
      .insert({
        source: run.source,
        trigger: run.trigger,
        since: run.since,
        until: run.until,
        status: run.status,
        error_code: run.errorCode,
        rows_upserted: run.rowsUpserted,
        started_at: run.startedAt,
        finished_at: new Date().toISOString(),
      });
    if (error) console.error("[meta marketing] run log insert failed", { code: error.code });
  } catch {
    console.error("[meta marketing] run log unavailable");
  }
}
