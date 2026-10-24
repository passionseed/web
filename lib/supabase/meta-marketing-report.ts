/**
 * Read-only queries behind /admin/marketing. SHIFT applications are read for
 * source and payment only: no names, handles or contacts leave the table.
 */
import { addDays } from "@/lib/meta/marketing/dates";
import type {
  AccountDayRecord,
  AdUtmRecord,
  AdsDailyRecord,
  ApplicationRecord,
  MarketingReportInput,
  MediaInsightRecord,
  MediaRecord,
  SyncRunRecordRow,
} from "@/lib/meta/marketing/report";
import { createAdminClient } from "@/utils/supabase/admin";

const PAGE_SIZE = 1000;
/** Enough rows to find the latest run of each of the three sources. */
const RECENT_RUNS = 30;

type AdminClient = ReturnType<typeof createAdminClient>;

/** Pages past PostgREST's 1000-row cap. */
async function readAll<T>(
  label: string,
  query: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await query(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`read ${label} failed: ${error.message}`);
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function readAdUtm(supabase: AdminClient, adIds: string[]): Promise<AdUtmRecord[]> {
  if (adIds.length === 0) return Promise.resolve([]);
  return readAll<AdUtmRecord>("meta_ads", (from, to) =>
    supabase.from("meta_ads").select("ad_id, utm_source, utm_content").in("ad_id", adIds).order("ad_id").range(from, to)
  );
}

function readMediaInsights(supabase: AdminClient, mediaIds: string[]): Promise<MediaInsightRecord[]> {
  if (mediaIds.length === 0) return Promise.resolve([]);
  return readAll<MediaInsightRecord>("ig_media_insights", (from, to) =>
    supabase
      .from("ig_media_insights")
      .select("media_id, snapshot_date, reach, views, likes, comments, saves, shares, follows")
      .in("media_id", mediaIds)
      .order("media_id")
      .order("snapshot_date")
      .range(from, to)
  );
}

/** Everything the report needs for an inclusive Bangkok day range. */
export async function getMarketingReportInput(since: string, until: string): Promise<MarketingReportInput> {
  const supabase = createAdminClient();
  const sinceTs = `${since}T00:00:00+07:00`;
  const untilTs = `${addDays(until, 1)}T00:00:00+07:00`;

  const [accountDays, latestFollowers, media, adsDaily, applications, runs] = await Promise.all([
    readAll<AccountDayRecord>("ig_account_daily", (from, to) =>
      supabase
        .from("ig_account_daily")
        .select("date, reach, views, profile_views, website_clicks, follows, unfollows")
        .gte("date", since)
        .lte("date", until)
        .order("date")
        .range(from, to)
    ),
    // Today's snapshot sits outside the range of complete days, so ask apart.
    supabase
      .from("ig_account_daily")
      .select("followers_count")
      .not("followers_count", "is", null)
      .order("date", { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (error) throw new Error(`read followers snapshot failed: ${error.message}`);
        return (data?.[0]?.followers_count as number | undefined) ?? null;
      }),
    readAll<MediaRecord>("ig_media", (from, to) =>
      supabase
        .from("ig_media")
        .select("id, caption, permalink, media_product_type, posted_at")
        .gte("posted_at", sinceTs)
        .lt("posted_at", untilTs)
        .order("posted_at", { ascending: false })
        .range(from, to)
    ),
    readAll<AdsDailyRecord>("meta_ads_daily", (from, to) =>
      supabase
        .from("meta_ads_daily")
        .select("date, ad_id, ad_name, campaign_id, campaign_name, currency, spend, impressions, link_clicks, landing_page_views, leads")
        .gte("date", since)
        .lte("date", until)
        .order("date")
        .order("ad_id")
        .range(from, to)
    ),
    readAll<ApplicationRecord>("shift_applications", (from, to) =>
      supabase
        .from("shift_applications")
        .select("source, paid_at")
        .gte("created_at", sinceTs)
        .lt("created_at", untilTs)
        .order("created_at")
        .range(from, to)
    ),
    supabase
      .from("meta_marketing_sync_runs")
      .select("source, status, error_code, rows_upserted, finished_at")
      .order("started_at", { ascending: false })
      .limit(RECENT_RUNS)
      .then(({ data, error }) => {
        if (error) throw new Error(`read meta_marketing_sync_runs failed: ${error.message}`);
        return (data ?? []) as SyncRunRecordRow[];
      }),
  ]);

  const [ads, mediaInsights] = await Promise.all([
    readAdUtm(supabase, [...new Set(adsDaily.map((row) => row.ad_id))]),
    readMediaInsights(supabase, media.map((m) => m.id)),
  ]);

  return { accountDays, latestFollowers, media, mediaInsights, adsDaily, ads, applications, runs };
}
