/** @jest-environment node */
import {
  destinationUrls,
  fetchAds,
  fetchAdsDaily,
  normalizeAdAccountId,
  parseAdDay,
  parseAdRow,
  utmFor,
  type GraphAdInsight,
} from "@/lib/meta/marketing/ads-insights";

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const insight: GraphAdInsight = {
  date_start: "2026-10-20",
  date_stop: "2026-10-20",
  account_currency: "THB",
  campaign_id: "c-1",
  campaign_name: "SHIFT[3] carousel",
  adset_id: "s-1",
  adset_name: "Parents 35-55",
  ad_id: "a-1",
  ad_name: "card1_parent",
  objective: "OUTCOME_LEADS",
  spend: "412.37",
  impressions: "10234",
  reach: "8120",
  clicks: "301",
  inline_link_clicks: "188",
  ctr: "2.941176",
  cpc: "1.37",
  actions: [
    { action_type: "link_click", value: "188" },
    { action_type: "landing_page_view", value: "140" },
    { action_type: "lead", value: "6" },
    { action_type: "offsite_conversion.fb_pixel_lead", value: "6" },
    { action_type: "offsite_conversion.fb_pixel_initiate_checkout", value: "11" },
  ],
};

describe("parseAdDay", () => {
  it("turns Meta's string numbers into numbers and picks one result per action", () => {
    expect(parseAdDay("123", insight)).toMatchObject({
      ad_account_id: "123",
      date: "2026-10-20",
      ad_id: "a-1",
      currency: "THB",
      spend: 412.37,
      impressions: 10234,
      reach: 8120,
      clicks: 301,
      link_clicks: 188,
      ctr: 2.941176,
      cpc: 1.37,
      landing_page_views: 140,
      // "lead" and its pixel twin describe the same 6 leads; never summed.
      leads: 6,
      initiate_checkouts: 11,
      messaging_conversations: null,
    });
  });

  it("defaults missing spend and impressions to zero", () => {
    const row = parseAdDay("123", { date_start: "2026-10-21", ad_id: "a-2" });
    expect(row.spend).toBe(0);
    expect(row.impressions).toBe(0);
    expect(row.cpc).toBeNull();
    expect(row.actions).toEqual([]);
  });
});

describe("destinations and UTM", () => {
  const carousel = {
    url_tags: "utm_source=meta_ads&utm_medium=paid_social&utm_campaign=shift3_carousel",
    object_story_spec: {
      link_data: {
        link: "https://passionseed.org/shift/3?utm_content=card1_parent",
        child_attachments: [
          { link: "https://passionseed.org/shift/3?utm_content=card1_parent" },
          { link: "https://passionseed.org/shift/3?utm_content=card2" },
        ],
      },
    },
  };

  it("collects every carousel card link once", () => {
    expect(destinationUrls(carousel)).toEqual([
      "https://passionseed.org/shift/3?utm_content=card1_parent",
      "https://passionseed.org/shift/3?utm_content=card2",
    ]);
  });

  it("prefers url_tags, then the first link carrying a tag", () => {
    expect(utmFor(destinationUrls(carousel), carousel.url_tags)).toEqual({
      utm_source: "meta_ads",
      utm_medium: "paid_social",
      utm_campaign: "shift3_carousel",
      utm_content: "card1_parent",
    });
  });

  it("reads utm_source from a /go/ short link and normalizes it like applications do", () => {
    expect(utmFor(["https://passionseed.org/go/IG_Reel_07"], undefined).utm_source).toBe("ig_reel_07");
    expect(utmFor(["not a url"], "utm_source=bad source!").utm_source).toBeNull();
  });

  it("reads video call-to-action and dynamic creative links", () => {
    expect(
      destinationUrls({
        object_story_spec: { video_data: { call_to_action: { value: { link: "https://passionseed.org/shift" } } } },
        asset_feed_spec: { link_urls: [{ website_url: "https://passionseed.org/shift/apply" }] },
      })
    ).toEqual(["https://passionseed.org/shift", "https://passionseed.org/shift/apply"]);
  });

  it("builds the ad row with its UTM", () => {
    expect(parseAdRow("123", { id: "a-1", name: "card1_parent", creative: carousel })).toMatchObject({
      ad_id: "a-1",
      ad_account_id: "123",
      utm_source: "meta_ads",
      destination_urls: expect.arrayContaining(["https://passionseed.org/shift/3?utm_content=card2"]),
    });
  });

  it("accepts the ad account id with or without act_", () => {
    expect(normalizeAdAccountId("act_998877")).toBe("998877");
    expect(normalizeAdAccountId(" 998877 ")).toBe("998877");
  });
});

describe("Marketing API calls", () => {
  it("reads per-ad daily insights from graph.facebook.com and follows paging", async () => {
    fetchMock
      .mockImplementationOnce(() =>
        json({ data: [insight], paging: { next: "https://graph.facebook.com/v21.0/act_123/insights?after=abc" } })
      )
      .mockImplementationOnce(() => json({ data: [{ ...insight, date_start: "2026-10-21" }] }));

    const rows = await fetchAdsDaily("123", "2026-10-20", "2026-10-21", "test-token");

    expect(rows.map((r) => r.date)).toEqual(["2026-10-20", "2026-10-21"]);
    const first = new URL(fetchMock.mock.calls[0][0] as string);
    expect(first.host).toBe("graph.facebook.com");
    expect(first.pathname).toBe("/v21.0/act_123/insights");
    expect(first.searchParams.get("level")).toBe("ad");
    expect(first.searchParams.get("time_increment")).toBe("1");
    expect(JSON.parse(first.searchParams.get("time_range")!)).toEqual({ since: "2026-10-20", until: "2026-10-21" });
    for (const [, init] of fetchMock.mock.calls) expect(init?.method ?? "GET").toBe("GET");
  });

  it("looks ads up 50 ids at a time", async () => {
    fetchMock.mockImplementation((url: string) => {
      const ids = new URL(url).searchParams.get("ids")!.split(",");
      return json(Object.fromEntries(ids.map((id) => [id, { id, name: `ad ${id}` }])));
    });
    const ids = Array.from({ length: 51 }, (_, i) => `a-${i}`);
    const ads = await fetchAds("123", ids, "test-token");
    expect(ads).toHaveLength(51);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
