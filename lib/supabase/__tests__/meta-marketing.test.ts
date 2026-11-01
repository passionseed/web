/** @jest-environment node */
import {
  recordSyncRun,
  upsertIgAccountDays,
  upsertIgProfileSnapshot,
  upsertMetaAdsDaily,
} from "@/lib/supabase/meta-marketing";
import type { MetaAdsDailyRow } from "@/lib/meta/marketing/ads-insights";
import { createAdminClient } from "@/utils/supabase/admin";

jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));

const upsert = jest.fn();
const insert = jest.fn();
const from = jest.fn(() => ({ upsert, insert }));

beforeEach(() => {
  upsert.mockReset().mockResolvedValue({ error: null });
  insert.mockReset().mockResolvedValue({ error: null });
  from.mockClear();
  jest.mocked(createAdminClient).mockReturnValue({ from } as unknown as ReturnType<typeof createAdminClient>);
});

function adRow(i: number): MetaAdsDailyRow {
  return {
    ad_account_id: "123",
    date: "2026-10-20",
    ad_id: `a-${i}`,
    ad_name: null,
    adset_id: null,
    adset_name: null,
    campaign_id: null,
    campaign_name: null,
    objective: null,
    currency: "THB",
    spend: 1,
    impressions: 1,
    reach: null,
    clicks: null,
    link_clicks: null,
    ctr: null,
    cpc: null,
    landing_page_views: null,
    leads: null,
    initiate_checkouts: null,
    messaging_conversations: null,
    actions: [],
  };
}

it("upserts ads on (date, ad_id) in chunks so reruns replace rows", async () => {
  const count = await upsertMetaAdsDaily(Array.from({ length: 501 }, (_, i) => adRow(i)));

  expect(count).toBe(501);
  expect(from).toHaveBeenCalledWith("meta_ads_daily");
  expect(upsert).toHaveBeenCalledTimes(2);
  expect(upsert.mock.calls[0][0]).toHaveLength(500);
  expect(upsert.mock.calls[0][1]).toEqual({ onConflict: "date,ad_id" });
  expect(upsert.mock.calls[0][0][0]).toHaveProperty("synced_at");
});

it("skips the request entirely for no rows", async () => {
  expect(await upsertMetaAdsDaily([])).toBe(0);
  expect(upsert).not.toHaveBeenCalled();
});

it("never sends followers_count with day insights, so a backfill cannot blank a snapshot", async () => {
  await upsertIgAccountDays([
    {
      ig_user_id: "ig-1",
      date: "2026-10-20",
      reach: 1,
      views: 2,
      profile_views: null,
      accounts_engaged: null,
      total_interactions: null,
      website_clicks: null,
      follows: null,
      unfollows: null,
    },
  ]);
  await upsertIgProfileSnapshot("ig-1", "2026-10-22", { followers_count: 4321, media_count: 210 });

  const [dayRows, dayOptions] = upsert.mock.calls[0];
  expect(dayRows[0]).not.toHaveProperty("followers_count");
  expect(dayOptions).toEqual({ onConflict: "ig_user_id,date" });
  const [snapshotRows] = upsert.mock.calls[1];
  expect(Object.keys(snapshotRows[0]).sort()).toEqual(
    ["date", "followers_count", "ig_user_id", "media_count", "synced_at"].sort()
  );
});

it("throws with the table name when an upsert fails", async () => {
  upsert.mockResolvedValueOnce({ error: { message: "relation does not exist" } });
  await expect(upsertMetaAdsDaily([adRow(1)])).rejects.toThrow("upsert meta_ads_daily failed");
});

it("logs a run without throwing even when the insert fails", async () => {
  insert.mockResolvedValueOnce({ error: { code: "42P01" } });
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  await expect(
    recordSyncRun({
      source: "meta_ads",
      trigger: "cron",
      since: "2026-10-19",
      until: "2026-10-21",
      status: "ok",
      errorCode: null,
      rowsUpserted: 3,
      startedAt: "2026-10-22T01:15:00.000Z",
    })
  ).resolves.toBeUndefined();
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({ source: "meta_ads", rows_upserted: 3 }));
  log.mockRestore();
});
