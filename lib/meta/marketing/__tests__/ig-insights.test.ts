/** @jest-environment node */
import {
  fetchIgAccountDay,
  fetchIgMediaInsights,
  fetchInsightsTolerant,
  listIgMediaSince,
  mediaMetricsFor,
  parseAccountDay,
  parseFollowBreakdown,
  parseMediaInsights,
  type GraphInsight,
} from "@/lib/meta/marketing/ig-insights";
import { MetaGraphApiError } from "@/lib/meta/graph";

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

function graphError(code: number, message: string, status = 400) {
  return json({ error: { code, message } }, status);
}

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

function calledUrls(): URL[] {
  return fetchMock.mock.calls.map(([url]) => new URL(url as string));
}

const totals: GraphInsight[] = [
  { name: "reach", period: "day", total_value: { value: 1520 } },
  { name: "views", period: "day", total_value: { value: 4210 } },
  { name: "profile_views", period: "day", total_value: { value: 88 } },
  { name: "website_clicks", period: "day", total_value: { value: 12 } },
];

const follows: GraphInsight[] = [
  {
    name: "follows_and_unfollows",
    total_value: {
      value: 9,
      breakdowns: [
        {
          dimension_keys: ["follow_type"],
          results: [
            { dimension_values: ["FOLLOWER"], value: 7 },
            { dimension_values: ["NON_FOLLOWER"], value: 2 },
          ],
        },
      ],
    },
  },
];

describe("parsing", () => {
  it("maps account totals and leaves missing metrics null", () => {
    expect(parseAccountDay("ig-1", "2026-10-20", totals, follows)).toEqual({
      ig_user_id: "ig-1",
      date: "2026-10-20",
      reach: 1520,
      views: 4210,
      profile_views: 88,
      accounts_engaged: null,
      total_interactions: null,
      website_clicks: 12,
      follows: 7,
      unfollows: 2,
    });
  });

  it("reads follows and unfollows from the follow_type breakdown", () => {
    expect(parseFollowBreakdown([])).toEqual({ follows: null, unfollows: null });
    expect(parseFollowBreakdown(follows)).toEqual({ follows: 7, unfollows: 2 });
  });

  it("maps lifetime media values, including saved -> saves", () => {
    const row = parseMediaInsights("m-1", "2026-10-22", [
      { name: "reach", period: "lifetime", values: [{ value: 900 }] },
      { name: "saved", period: "lifetime", values: [{ value: 31 }] },
      { name: "ig_reels_avg_watch_time", period: "lifetime", values: [{ value: 6400 }] },
    ]);
    expect(row).toMatchObject({ media_id: "m-1", snapshot_date: "2026-10-22", reach: 900, saves: 31, avg_watch_time_ms: 6400, likes: null });
  });

  it("asks Reels for watch time and feed posts for follows", () => {
    expect(mediaMetricsFor({ media_product_type: "REELS" })).toContain("ig_reels_avg_watch_time");
    expect(mediaMetricsFor({ media_product_type: "REELS" })).not.toContain("follows");
    expect(mediaMetricsFor({ media_product_type: "FEED" })).toContain("follows");
  });
});

describe("fetchInsightsTolerant", () => {
  it("retries one metric at a time when Meta rejects the set, dropping the bad one", async () => {
    const fetchMetrics = jest.fn(async (metrics: readonly string[]) => {
      if (metrics.includes("views")) throw new MetaGraphApiError("metric[0] must be one of...", 400, false, false, 100);
      return metrics.map((name) => ({ name, total_value: { value: 1 } }));
    });
    const insights = await fetchInsightsTolerant(["reach", "views", "likes"], fetchMetrics);
    expect(insights.map((i) => i.name)).toEqual(["reach", "likes"]);
  });

  it("rethrows the original error when Meta rejects every metric", async () => {
    const invalid = new MetaGraphApiError("Unsupported get request", 400, false, false, 100);
    const fetchMetrics = jest.fn().mockRejectedValue(invalid);
    await expect(fetchInsightsTolerant(["reach", "views"], fetchMetrics)).rejects.toBe(invalid);
    expect(fetchMetrics).toHaveBeenCalledTimes(3);
  });

  it("rethrows a missing permission instead of writing empty rows", async () => {
    const fetchMetrics = jest.fn().mockRejectedValue(
      new MetaGraphApiError("(#10) Application does not have permission for this action", 403, false, false, 10)
    );
    await expect(fetchInsightsTolerant(["reach", "views"], fetchMetrics)).rejects.toThrow("permission");
    expect(fetchMetrics).toHaveBeenCalledTimes(1);
  });
});

describe("Graph calls", () => {
  it("reads one Bangkok day of account insights with two GETs on graph.instagram.com", async () => {
    fetchMock.mockImplementationOnce(() => json({ data: totals })).mockImplementationOnce(() => json({ data: follows }));
    const row = await fetchIgAccountDay("ig-1", "2026-10-20", "test-token");

    expect(row.reach).toBe(1520);
    expect(row.follows).toBe(7);
    const [first, second] = calledUrls();
    expect(first.host).toBe("graph.instagram.com");
    expect(first.pathname).toBe("/v21.0/ig-1/insights");
    expect(first.searchParams.get("metric_type")).toBe("total_value");
    expect(first.searchParams.get("since")).toBe(String(Date.parse("2026-10-20T00:00:00+07:00") / 1000));
    expect(first.searchParams.get("until")).toBe(String(Date.parse("2026-10-21T00:00:00+07:00") / 1000));
    expect(second.searchParams.get("breakdown")).toBe("follow_type");
    for (const [, init] of fetchMock.mock.calls) expect(init?.method ?? "GET").toBe("GET");
  });

  it("still saves reach and views when follows_and_unfollows is not offered", async () => {
    fetchMock
      .mockImplementationOnce(() => json({ data: totals }))
      .mockImplementationOnce(() => graphError(100, "metric is not supported"));
    const row = await fetchIgAccountDay("ig-1", "2026-10-20", "test-token");
    expect(row).toMatchObject({ reach: 1520, follows: null, unfollows: null });
  });

  it("surfaces a permission error from Meta as a MetaGraphApiError", async () => {
    fetchMock.mockImplementation(() => graphError(10, "Application does not have permission for this action", 403));
    await expect(fetchIgAccountDay("ig-1", "2026-10-20", "test-token")).rejects.toBeInstanceOf(MetaGraphApiError);
  });

  it("stops paging media once a page reaches posts older than the range", async () => {
    fetchMock
      .mockImplementationOnce(() =>
        json({
          data: [
            { id: "new", timestamp: "2026-10-10T03:00:00+0000" },
            { id: "old", timestamp: "2026-08-01T03:00:00+0000" },
          ],
          paging: { next: "https://graph.instagram.com/v21.0/ig-1/media?after=x" },
        })
      );
    const media = await listIgMediaSince("ig-1", "2026-09-01T00:00:00+07:00", "test-token");
    expect(media.map((m) => m.id)).toEqual(["new"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("requests media insights without a period window", async () => {
    fetchMock.mockImplementationOnce(() => json({ data: [{ name: "reach", values: [{ value: 50 }] }] }));
    const row = await fetchIgMediaInsights({ id: "m-9", media_product_type: "FEED" }, "2026-10-22", "test-token");
    expect(row).toMatchObject({ media_id: "m-9", reach: 50 });
    expect(calledUrls()[0].pathname).toBe("/v21.0/m-9/insights");
  });
});
