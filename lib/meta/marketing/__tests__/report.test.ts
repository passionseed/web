import { buildMarketingReport, type MarketingReportInput } from "@/lib/meta/marketing/report";

function input(overrides: Partial<MarketingReportInput> = {}): MarketingReportInput {
  return {
    accountDays: [],
    latestFollowers: null,
    media: [],
    mediaInsights: [],
    adsDaily: [],
    ads: [],
    applications: [],
    runs: [],
    ...overrides,
  };
}

const adDay = (ad_id: string, date: string, spend: string, extra: Partial<MarketingReportInput["adsDaily"][number]> = {}) => ({
  date,
  ad_id,
  ad_name: `ad ${ad_id}`,
  campaign_id: "c-1",
  campaign_name: "SHIFT[3]",
  currency: "THB",
  spend,
  impressions: 1000,
  link_clicks: 20,
  landing_page_views: 10,
  leads: 1,
  ...extra,
});

it("joins ad spend to paid SHIFT seats on utm_source", () => {
  const report = buildMarketingReport(
    input({
      adsDaily: [adDay("a-1", "2026-10-20", "300.50"), adDay("a-1", "2026-10-21", "99.50"), adDay("a-2", "2026-10-21", "200")],
      ads: [
        { ad_id: "a-1", utm_source: "meta_ads", utm_content: "card1_parent" },
        { ad_id: "a-2", utm_source: "meta_ads", utm_content: "card2" },
      ],
      applications: [
        { source: "meta_ads", paid_at: "2026-10-21T05:00:00Z" },
        { source: "META_ADS", paid_at: "2026-10-21T06:00:00Z" },
        { source: "meta_ads", paid_at: null },
        { source: "ig-grid", paid_at: "2026-10-20T06:00:00Z" },
        { source: null, paid_at: null },
      ],
    })
  );

  expect(report.adsTotals).toMatchObject({ spend: 600, impressions: 3000, linkClicks: 60, currency: "THB" });
  expect(report.ads.map((a) => [a.key, a.spend])).toEqual([["a-1", 400], ["a-2", 200]]);
  expect(report.campaigns).toHaveLength(1);
  expect(report.campaigns[0]).toMatchObject({ name: "SHIFT[3]", spend: 600, ctr: 0.02 });
  expect(report.sources).toEqual([
    { source: "meta_ads", spend: 600, applications: 3, paidSeats: 2, costPerPaidSeat: 300, adCount: 2 },
    { source: "ig-grid", spend: null, applications: 1, paidSeats: 1, costPerPaidSeat: null, adCount: 0 },
    { source: "direct", spend: null, applications: 1, paidSeats: 0, costPerPaidSeat: null, adCount: 0 },
  ]);
});

it("shows spend with no seats when an ad's source never converted", () => {
  const report = buildMarketingReport(
    input({
      adsDaily: [adDay("a-1", "2026-10-20", "120")],
      ads: [{ ad_id: "a-1", utm_source: "meta_ads_test", utm_content: null }],
    })
  );
  expect(report.sources).toEqual([
    { source: "meta_ads_test", spend: 120, applications: 0, paidSeats: 0, costPerPaidSeat: null, adCount: 1 },
  ]);
});

it("sums Instagram days and ranks posts by their latest snapshot", () => {
  const report = buildMarketingReport(
    input({
      accountDays: [
        { date: "2026-10-20", reach: 100, views: 300, profile_views: 5, website_clicks: 1, follows: 3, unfollows: 1 },
        { date: "2026-10-21", reach: 50, views: null, profile_views: 2, website_clicks: null, follows: 1, unfollows: 0 },
      ],
      latestFollowers: 4321,
      media: [
        { id: "m-1", caption: "first", permalink: null, media_product_type: "FEED", posted_at: "2026-10-01T00:00:00Z" },
        { id: "m-2", caption: "reel", permalink: null, media_product_type: "REELS", posted_at: "2026-10-05T00:00:00Z" },
      ],
      mediaInsights: [
        { media_id: "m-1", snapshot_date: "2026-10-20", reach: 900, views: 1, likes: 1, comments: 0, saves: 0, shares: 0, follows: 0 },
        { media_id: "m-1", snapshot_date: "2026-10-21", reach: 950, views: 1, likes: 1, comments: 0, saves: 0, shares: 0, follows: 0 },
        { media_id: "m-2", snapshot_date: "2026-10-21", reach: 2000, views: 5, likes: 9, comments: 1, saves: 2, shares: 3, follows: null },
      ],
    })
  );

  expect(report.instagram).toEqual({
    reach: 150,
    views: 300,
    profileViews: 7,
    websiteClicks: 1,
    follows: 4,
    unfollows: 1,
    followers: 4321,
    days: 2,
  });
  expect(report.topPosts.map((p) => [p.id, p.reach])).toEqual([["m-2", 2000], ["m-1", 950]]);
});

it("keeps the latest run per source", () => {
  const report = buildMarketingReport(
    input({
      runs: [
        { source: "meta_ads", status: "ok", error_code: null, rows_upserted: 4, finished_at: "2026-10-22T01:16:00Z" },
        { source: "meta_ads", status: "failed", error_code: "token_expired", rows_upserted: 0, finished_at: "2026-10-21T01:16:00Z" },
        { source: "ig_account", status: "failed", error_code: "ig_insights_permission_missing", rows_upserted: 0, finished_at: "2026-10-22T01:15:30Z" },
      ],
    })
  );
  expect(report.latestRuns).toEqual([
    expect.objectContaining({ source: "meta_ads", status: "ok" }),
    expect.objectContaining({ source: "ig_account", error_code: "ig_insights_permission_missing" }),
  ]);
});
