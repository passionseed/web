import {
  bangkokDate,
  collectReelMetrics,
  insightsToRow,
  REEL_CORE_METRICS,
  runReelInsights,
  type FetchInsights,
} from "../reel-insights";

describe("bangkokDate", () => {
  it("uses the Thai calendar day", () => {
    expect(bangkokDate(Date.parse("2026-11-11T16:59:00Z"))).toBe("2026-11-11");
    expect(bangkokDate(Date.parse("2026-11-11T17:01:00Z"))).toBe("2026-11-12");
  });
});

describe("insightsToRow", () => {
  it("maps known metrics and keeps everything in raw", () => {
    const row = insightsToRow("reel-1", "2026-11-11", {
      views: 1200,
      reach: 900,
      saved: 40,
      shares: 12,
      comments: 30,
      likes: 85,
      ig_reels_avg_watch_time: 7421.6,
      follows: 3,
      total_interactions: 170,
    });
    expect(row).toEqual({
      reel_id: "reel-1",
      captured_on: "2026-11-11",
      views: 1200,
      reach: 900,
      saved: 40,
      shares: 12,
      comments: 30,
      likes: 85,
      avg_watch_ms: 7422,
      follows: 3,
      profile_visits: null,
      raw: expect.objectContaining({ total_interactions: 170 }),
    });
  });
});

describe("collectReelMetrics", () => {
  it("asks for the core group once and each optional metric alone", async () => {
    const calls: string[][] = [];
    const fetch: FetchInsights = async (_id, metrics) => {
      calls.push(metrics);
      if (metrics.includes("profile_visits")) throw new Error('{"error":{"code":100}}');
      return Object.fromEntries(metrics.map((m) => [m, 1]));
    };
    const { metrics, missing } = await collectReelMetrics("17900000000000001", fetch);
    expect(calls[0]).toEqual([...REEL_CORE_METRICS]);
    expect(metrics.views).toBe(1);
    expect(metrics.follows).toBe(1);
    expect(metrics.profile_visits).toBeUndefined();
    expect(missing).toEqual(["profile_visits:meta_100"]);
  });

  it("falls back to one metric at a time when the core group fails", async () => {
    const fetch: FetchInsights = async (_id, metrics) => {
      if (metrics.length > 1 || metrics[0] === "ig_reels_avg_watch_time") throw new Error("unsupported");
      return { [metrics[0]]: 5 };
    };
    const { metrics, missing } = await collectReelMetrics("17900000000000001", fetch);
    expect(metrics.views).toBe(5);
    expect(metrics.ig_reels_avg_watch_time).toBeUndefined();
    expect(missing.some((m) => m.startsWith("ig_reels_avg_watch_time"))).toBe(true);
  });
});

describe("runReelInsights", () => {
  it("saves one row per reel and keeps going past failures", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    const saved: string[] = [];
    const result = await runReelInsights({
      reels: [
        { id: "a", media_id: "17900000000000001" },
        { id: "b", media_id: null },
        { id: "c", media_id: "17900000000000003" },
        { id: "d", media_id: "17900000000000004" },
      ],
      fetchInsights: async (mediaId, metrics) => {
        if (mediaId.endsWith("3")) throw new Error("no permission");
        return Object.fromEntries(metrics.map((m) => [m, 2]));
      },
      save: async (row) => {
        if (row.reel_id === "d") throw new Error("db write failed");
        saved.push(row.reel_id);
      },
      now: Date.parse("2026-11-11T03:15:00Z"),
      deadline: Date.now() + 60_000,
    });
    expect(saved).toEqual(["a"]);
    expect(result).toEqual({ captured: 1, skipped: 2, failed: 1, stoppedEarly: false });
    warn.mockRestore();
    error.mockRestore();
  });

  it("stops at the deadline", async () => {
    const result = await runReelInsights({
      reels: [{ id: "a", media_id: "17900000000000001" }],
      fetchInsights: async () => ({ views: 1 }),
      save: async () => {},
      now: Date.now(),
      deadline: Date.now() - 1,
    });
    expect(result.stoppedEarly).toBe(true);
    expect(result.captured).toBe(0);
  });
});
