import { GUIDE_INDEX } from "@/lib/radar-guides";
import {
  GUIDE_PAGE_TARGETS,
  groupGuidePages,
  reelUtmContent,
  type RadarGuidePageViewRow,
  funnelRates,
  funnelWeekStart,
  groupByChannelPage,
  groupCareerRequests,
  reelDmStats,
  reelFunnelRows,
  sumFunnel,
} from "../admin-funnel";
import type { RadarGuideFunnelRow, RadarReelInsightRow, RadarReelRow } from "../types";

function funnel(overrides: Partial<RadarGuideFunnelRow>): RadarGuideFunnelRow {
  return {
    week: "2026-11-09",
    page: "cybersecurity",
    channel: "ig-comment-dm",
    utm_campaign: "radar",
    utm_content: null,
    visits: 0,
    unique_devices: 0,
    chapters_seen: 0,
    video_plays: 0,
    unmutes: 0,
    visits_with_complete: 0,
    chapters_completed: 0,
    interactive_visits: 0,
    cta_clicks: 0,
    follow_intents: 0,
    share_clicks: 0,
    intents: 0,
    career_requests: 0,
    ...overrides,
  };
}

const reel: RadarReelRow = {
  id: "r1",
  platform: "instagram",
  media_id: "17900000000000001",
  shortcode: "DA1b2C3d4",
  permalink: null,
  field_slug: "cybersecurity",
  chapter_key: "money",
  video_kind: "founder",
  angle: "salary_reveal",
  is_trial: false,
  hook_variant: 0,
  career_label_th: "ไซเบอร์",
  dm_enabled: true,
  posted_at: null,
  note: null,
  created_by: null,
  created_at: "2026-11-10T00:00:00Z",
  updated_at: "2026-11-10T00:00:00Z",
};

test("sums bigint strings and groups by channel and page", () => {
  const rows = [
    funnel({ visits: "10" as unknown as number, chapters_seen: 30, video_plays: 4, unmutes: 1 }),
    funnel({ week: "2026-11-02", visits: 5, chapters_seen: 5 }),
    funnel({ channel: "ig-bio", page: "hub", visits: 2 }),
  ];
  const groups = groupByChannelPage(rows);
  expect(groups[0]).toMatchObject({ channel: "ig-comment-dm", page: "cybersecurity", totals: { visits: 15, pagesSeen: 35 } });
  expect(groups).toHaveLength(2);
  const rates = funnelRates(sumFunnel(rows));
  expect(rates.unmutePct).toBe(0.25);
  expect(funnelRates(sumFunnel([])).pagesPerVisit).toBeNull();
});

test("per-reel rows join utm_content, the latest insights and distinct commenters", () => {
  const content = "cybersecurity-money-founder-DA1b2C3d4";
  expect(reelUtmContent(reel)).toBe(content);
  const insights: RadarReelInsightRow[] = [
    { reel_id: "r1", captured_on: "2026-11-10", reach: 1000, saved: 5, shares: 5 } as RadarReelInsightRow,
    { reel_id: "r1", captured_on: "2026-11-11", reach: 2000, saved: 10, shares: 30, avg_watch_ms: 8000 } as RadarReelInsightRow,
  ];
  const dm = reelDmStats([
    { reel_id: "r1", status: "sent", comment_id: "c1", commenter: "u1" },
    { reel_id: "r1", status: "sent", comment_id: "c2", commenter: "u1" },
    { reel_id: "r1", status: "failed", comment_id: "c3", commenter: "u2" },
    { reel_id: "r1", status: "sent", comment_id: "c4", commenter: null },
  ]);
  const [row] = reelFunnelRows(
    [reel],
    [funnel({ utm_content: content, visits: 2 }), funnel({ channel: "ig-bio", utm_content: content, visits: 1 })],
    insights,
    dm
  );
  expect(row).toMatchObject({
    utmContent: content,
    reach: 2000,
    avgWatchS: 8,
    commenters: 3,
    sent: 3,
    failed: 1,
    visits: 3,
    dmVisits: 2,
    commentersPer1k: 1.5,
    sendsSavesPerReach: 0.02,
  });
  expect(row.dmToVisit).toBeCloseTo(2 / 3);
});

test("career requests group case-insensitively, most requested first", () => {
  const groups = groupCareerRequests([
    { request_text: "นักบัญชี", status: "new", matched_field_slug: null, created_at: "2026-11-10T00:00:00Z" },
    { request_text: "Pilot", status: "new", matched_field_slug: null, created_at: "2026-11-10T00:00:00Z" },
    { request_text: " pilot ", status: "planned", matched_field_slug: "pilot", created_at: "2026-11-11T00:00:00Z" },
  ]);
  expect(groups[0]).toMatchObject({ count: 2, statuses: { new: 1, planned: 1 }, matchedFieldSlug: "pilot" });
});

test("funnel weeks start on a Bangkok Monday", () => {
  // Sunday 2026-11-15 20:00 UTC is Monday 03:00 in Bangkok.
  expect(funnelWeekStart(1, new Date("2026-11-15T20:00:00Z"))).toBe("2026-11-16");
  expect(funnelWeekStart(4, new Date("2026-11-11T05:00:00Z"))).toBe("2026-10-19");
});

function pageRow(overrides: Partial<RadarGuidePageViewRow>): RadarGuidePageViewRow {
  return {
    field_slug: "cybersecurity",
    page_key: "mythos",
    week: "2026-11-09",
    viewers: 0,
    players: 0,
    skips: 0,
    clip_plays: 0,
    clip_completes: 0,
    shares: 0,
    ctas: 0,
    ...overrides,
  };
}

test("per-page rows follow level order, with reach, skip rate and milestone flags", () => {
  const rows = groupGuidePages(
    [
      pageRow({ viewers: "60" as unknown as number, players: 50, skips: 5 }),
      pageRow({ week: "2026-11-02", viewers: 40, players: 30, skips: 5, clip_plays: 20, clip_completes: 4 }),
      pageRow({ page_key: "triage", viewers: 20, players: 8, skips: 4 }),
      pageRow({ page_key: "hook", viewers: 3 }),
    ],
    [GUIDE_INDEX.cybersecurity]
  );
  const cyberPages = GUIDE_INDEX.cybersecurity.pages.length;
  expect(rows).toHaveLength(cyberPages + 1);
  expect(rows.slice(0, cyberPages).map((r) => r.order)).toEqual(
    [...GUIDE_INDEX.cybersecurity.pages].sort((a, b) => a.order - b.order).map((p) => p.order)
  );
  const mythos = rows.find((r) => r.pageKey === "mythos")!;
  expect(mythos).toMatchObject({ viewers: 100, players: 80, skips: 10, reachPct: 1, playPct: 0.8 });
  expect(mythos.skipPct).toBeCloseTo(0.125);
  expect(mythos.clipCompletePct).toBeCloseTo(0.2);
  expect(mythos.belowTarget).toEqual(["clipCompletePct"]);
  const triage = rows.find((r) => r.pageKey === "triage")!;
  expect(triage.reachPct).toBeCloseTo(0.2);
  expect(triage.skipPct).toBe(0.5);
  expect(triage.belowTarget).toEqual(expect.arrayContaining(["reachPct", "playPct", "skipPct"]));
  // A legacy deck chapter key is kept, last, labelled by its key.
  expect(rows[rows.length - 1]).toMatchObject({ pageKey: "hook", order: null, titleTh: "hook", reachPct: null });
  // Pages nobody reached still show: reach 0 is flagged, other rates are empty.
  expect(rows.find((r) => r.pageKey === "next")).toMatchObject({ viewers: 0, reachPct: 0, playPct: null, belowTarget: ["reachPct"] });
  expect(GUIDE_PAGE_TARGETS.skipPct).toBeLessThan(1);
});
