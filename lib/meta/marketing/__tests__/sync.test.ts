/** @jest-environment node */
import { runMetaMarketingSync, type SyncOptions } from "@/lib/meta/marketing/sync";
import {
  recordSyncRun,
  upsertIgAccountDays,
  upsertIgMedia,
  upsertIgMediaInsights,
  upsertIgProfileSnapshot,
  upsertMetaAds,
  upsertMetaAdsDaily,
} from "@/lib/supabase/meta-marketing";

jest.mock("@/lib/supabase/meta-marketing", () => {
  const count = (rows: unknown[]) => Promise.resolve(rows.length);
  return {
    recordSyncRun: jest.fn().mockResolvedValue(undefined),
    upsertIgAccountDays: jest.fn(count),
    upsertIgMedia: jest.fn(count),
    upsertIgMediaInsights: jest.fn(count),
    upsertIgProfileSnapshot: jest.fn().mockResolvedValue(1),
    upsertMetaAds: jest.fn(count),
    upsertMetaAdsDaily: jest.fn(count),
  };
});

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

const fetchMock = jest.fn();
const ENV_KEYS = [
  "INSTAGRAM_BUSINESS_ACCOUNT_ID",
  "META_PAGE_ACCESS_TOKEN",
  "META_IG_INSIGHTS_ACCESS_TOKEN",
  "META_ADS_ACCESS_TOKEN",
  "META_AD_ACCOUNT_ID",
];
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  for (const key of ENV_KEYS) delete process.env[key];
});

afterAll(() => {
  jest.restoreAllMocks();
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function options(overrides: Partial<SyncOptions> = {}): SyncOptions {
  return {
    range: { since: "2026-10-19", until: "2026-10-21" },
    mediaSince: "2026-07-23",
    sources: ["meta_ads", "ig_account", "ig_media"],
    trigger: "cron",
    deadlineMs: Date.now() + 60_000,
    ...overrides,
  };
}

it("skips every source cleanly when no Meta env vars are set, and logs each skip", async () => {
  const results = await runMetaMarketingSync(options());

  expect(results.map((r) => [r.source, r.status, r.errorCode])).toEqual([
    ["meta_ads", "skipped", "missing_env_meta_ads"],
    ["ig_account", "skipped", "missing_env_instagram"],
    ["ig_media", "skipped", "missing_env_instagram"],
  ]);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(recordSyncRun).toHaveBeenCalledTimes(3);
});

it("reports a missing insights permission without writing rows", async () => {
  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID = "ig-1";
  process.env.META_PAGE_ACCESS_TOKEN = "test-token";
  fetchMock.mockImplementation(() =>
    json({ error: { code: 10, message: "(#10) Application does not have permission for this action" } }, 403)
  );

  const [result] = await runMetaMarketingSync(options({ sources: ["ig_account"] }));

  expect(result).toMatchObject({ source: "ig_account", status: "failed", errorCode: "ig_insights_permission_missing" });
  expect(upsertIgAccountDays).not.toHaveBeenCalled();
  expect(recordSyncRun).toHaveBeenCalledWith(
    expect.objectContaining({ source: "ig_account", status: "failed", errorCode: "ig_insights_permission_missing" })
  );
});

it("prefers the dedicated insights token over the DM token", async () => {
  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID = "ig-1";
  process.env.META_PAGE_ACCESS_TOKEN = "dm-token";
  process.env.META_IG_INSIGHTS_ACCESS_TOKEN = "insights-token";
  fetchMock.mockImplementation(() => json({ data: [] }));

  await runMetaMarketingSync(options({ sources: ["ig_account"], range: { since: "2026-10-21", until: "2026-10-21" } }));

  const tokens = fetchMock.mock.calls.map(([url]) => new URL(url as string).searchParams.get("access_token"));
  expect(new Set(tokens)).toEqual(new Set(["insights-token"]));
});

it("upserts one account row per day plus today's follower snapshot", async () => {
  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID = "ig-1";
  process.env.META_PAGE_ACCESS_TOKEN = "test-token";
  fetchMock.mockImplementation((url: string) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/insights")) return json({ data: [{ name: "reach", total_value: { value: 10 } }] });
    return json({ followers_count: 4321, media_count: 210 });
  });

  const [result] = await runMetaMarketingSync(options({ sources: ["ig_account"] }));

  expect(result).toMatchObject({ status: "ok", rowsUpserted: 4 });
  expect(upsertIgAccountDays).toHaveBeenCalledTimes(3);
  expect(jest.mocked(upsertIgAccountDays).mock.calls.map(([rows]) => rows[0].date)).toEqual([
    "2026-10-19",
    "2026-10-20",
    "2026-10-21",
  ]);
  expect(upsertIgProfileSnapshot).toHaveBeenCalledWith("ig-1", expect.any(String), {
    followers_count: 4321,
    media_count: 210,
  });
});

it("stops at the deadline and says where to resume", async () => {
  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID = "ig-1";
  process.env.META_PAGE_ACCESS_TOKEN = "test-token";

  const [result] = await runMetaMarketingSync(options({ sources: ["ig_account"], deadlineMs: Date.now() - 1 }));

  expect(result).toMatchObject({ status: "partial", errorCode: "deadline", resumeFrom: "2026-10-19" });
  expect(fetchMock).not.toHaveBeenCalled();
});

it("syncs ads daily rows, then the metadata of the ads that ran", async () => {
  process.env.META_ADS_ACCESS_TOKEN = "ads-token";
  process.env.META_AD_ACCOUNT_ID = "act_123";
  fetchMock.mockImplementation((url: string) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/v21.0/act_123/insights") {
      return json({
        data: [
          { date_start: "2026-10-20", ad_id: "a-1", spend: "100.00", impressions: "1000" },
          { date_start: "2026-10-21", ad_id: "a-1", spend: "50.00", impressions: "400" },
        ],
      });
    }
    return json({ "a-1": { id: "a-1", name: "card1", creative: { url_tags: "utm_source=meta_ads" } } });
  });

  const [result] = await runMetaMarketingSync(options({ sources: ["meta_ads"] }));

  expect(result).toMatchObject({ source: "meta_ads", status: "ok", rowsUpserted: 3 });
  expect(jest.mocked(upsertMetaAdsDaily).mock.calls[0][0]).toHaveLength(2);
  expect(jest.mocked(upsertMetaAds).mock.calls[0][0][0]).toMatchObject({ ad_id: "a-1", ad_account_id: "123", utm_source: "meta_ads" });
});

it("keeps going past one media item Meta will not report on", async () => {
  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID = "ig-1";
  process.env.META_PAGE_ACCESS_TOKEN = "test-token";
  fetchMock.mockImplementation((url: string) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/media")) {
      return json({
        data: [
          { id: "m-1", media_product_type: "FEED", timestamp: "2026-10-10T00:00:00+0000" },
          { id: "m-2", media_product_type: "REELS", timestamp: "2026-10-09T00:00:00+0000" },
        ],
      });
    }
    if (parsed.pathname.includes("m-1")) return json({ error: { code: 100, message: "Unsupported get request" } }, 400);
    return json({ data: [{ name: "reach", values: [{ value: 77 }] }] });
  });

  const [result] = await runMetaMarketingSync(options({ sources: ["ig_media"] }));

  expect(upsertIgMedia).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: "m-1" })]));
  expect(jest.mocked(upsertIgMediaInsights).mock.calls[0][0]).toEqual([
    expect.objectContaining({ media_id: "m-2", reach: 77 }),
  ]);
  expect(result).toMatchObject({ status: "partial", errorCode: "skipped_1_media" });
});
