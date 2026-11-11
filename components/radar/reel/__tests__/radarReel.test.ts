import { numberTokens } from "@/lib/radar-guide/guide-lint";
import type { CareerGuide, Fact, GuidePage } from "@/lib/radar-guide/guide-types";
import { loadRadarFixture, RADAR_FIXTURE_SLUGS } from "@/lib/radar-guide/__fixtures__";
import { findDashes } from "@/lib/radar-guide/thai-copy";

import { DEMO_LEAD_IN_MS } from "@/components/radar/guide/shell/DemoPlayer";

import { demoCameraCues, DEMO_REVEAL_MS, locateDemoStep } from "../demoDriver";
import { buildDemoReelPlan, demoReelProblems, DEMO_REEL_TARGET_S, DEMO_REEL_TIMING, pageDemoSteps } from "../demoReel";
import { buildRadarReelPayload, clipText, factBackedLine, isRadarReelPayload, toReelLine, type RadarReelPayload } from "../payload";
import {
  buildRadarReelTimeline,
  RADAR_REEL_BEAT,
  RADAR_REEL_TARGET,
  radarReelSceneIds,
} from "../radarReel";

// ---------------------------------------------------------------------------
// Fixture guide: real shapes, made-up numbers (the real content is U3's).
// ---------------------------------------------------------------------------

const FACTS: Fact[] = [
  {
    id: "f.pay",
    claimEn: "Entry security analysts in Thailand earn about 35,500 baht a month",
    values: ["35,500"],
    sources: [{ outlet: "JobsDB", url: "https://th.jobsdb.com/x", publishedAt: "2026-10" }],
    asOf: "2026-11-11",
    badge: "confirmed",
  },
  {
    id: "f.gap",
    claimEn: "The workforce gap is 4.8 million people",
    values: ["4.8"],
    sources: [{ outlet: "ISC2", url: "https://www.isc2.org/x", publishedAt: "2026-10" }],
    asOf: "2026-11-11",
    badge: "vendor",
  },
  {
    id: "f.rumour",
    claimEn: "Unverified: 90 percent of jobs are remote",
    values: ["90"],
    sources: [{ outlet: "Blog", url: "https://example.org/x", publishedAt: "2026-10" }],
    asOf: "2026-11-11",
    badge: "pending",
  },
  { id: "sim.alerts", claimEn: "Simulated alert queue of 10 alerts", values: ["10"], sources: [], asOf: "2026-11-11", badge: "simulated" },
];

function guidePage(key: string, order: number, over: Partial<GuidePage> = {}): GuidePage {
  return {
    key,
    order,
    titleTh: `ด่าน ${key}`,
    questionTh: `คำถามของ ${key}`,
    navLabelTh: key,
    asOf: "2026-11-11",
    minutes: 2,
    blocks: [],
    factIds: [],
    og: { headlineTh: `หัวข้อ ${key}` },
    ...over,
  };
}

const MONEY = guidePage("money", 2, {
  factIds: ["f.pay", "f.gap", "f.rumour"],
  og: { headlineTh: "เงินเดือนแรกเท่าไร", stat: { th: "เฉลี่ย 35,500 บาท", factIds: ["f.pay"] } },
  reel: { format: "founder", hook: { th: "เริ่มงานได้เดือนละเท่าไร" }, variantsTh: ["ก", "ข"], sendToFriendTh: "ส่งให้เพื่อนที่อยากรู้", visual: [] },
  blocks: [
    { kind: "dialogue", id: "d1", lines: [{ speaker: "host", text: { th: "มาดูเงินเดือนจริงกัน" } }] },
    { kind: "item", id: "i1", item: "stat", text: { th: "เฉลี่ย 35,500 บาทต่อเดือน", factIds: ["f.pay"] } },
    { kind: "item", id: "i2", item: "intel", text: { th: "ทั่วโลกยังขาดคน 4.8 ล้านคน", factIds: ["f.gap"] } },
    { kind: "item", id: "i3", item: "notification", text: { th: "งานรีโมต 90%", factIds: ["f.rumour"] } },
    { kind: "item", id: "i4", item: "terminal", text: { th: "แจ้งเตือน 10 รายการ", factIds: ["sim.alerts"] }, simulated: true },
    { kind: "copy", id: "c1", role: "body", text: { th: "เงินเดือน 99,999 บาท" } },
    {
      kind: "beat",
      id: "b1",
      unlockLabelTh: "ต่อ",
      blocks: [{ kind: "item", id: "i5", item: "chat", text: { th: "ทักษะสำคัญกว่าใบเซอร์" } }],
    },
  ],
});

const TRIAGE = guidePage("triage", 3, {
  reel: { format: "demo", hook: { th: "งานจริงคือจับผิด AI" }, variantsTh: ["ก", "ข"], sendToFriendTh: "ส่งให้เพื่อนสายเกม", visual: [] },
  blocks: [
    { kind: "dialogue", id: "d1", lines: [{ speaker: "host", text: { th: "ลองคัดแจ้งเตือนดู" } }] },
    {
      kind: "game",
      id: "sort",
      game: { engine: "FlipCards", data: { highlightTh: "x", cards: [] } },
      track: { done: "triage:done", value: "score" },
      answersTh: ["เฉลย"],
      demoScript: [
        { at: 0, action: "tap", target: "alert-1" },
        { at: 900, action: "tap", target: "bin-real" },
        { at: 2100, action: "tap", target: "alert-2" },
      ],
    },
    {
      kind: "beat",
      id: "b2",
      unlockLabelTh: "ต่อ",
      blocks: [
        {
          kind: "bespoke",
          id: "pipe",
          component: "BucketPipe",
          fallbackTh: ["x"],
          demoScript: [
            { at: 300, action: "tap", target: "pipe-open" },
            { at: 1500, action: "wait" },
          ],
        },
      ],
    },
  ],
});

const GUIDE: CareerGuide = {
  meta: {
    slug: "cybersecurity",
    alias: "cyber",
    nameTh: "ไซเบอร์ซีเคียวริตี้",
    nameEn: "Cybersecurity",
    accent: "#5cff5c",
    status: "draft",
    asOf: "2026-11-11",
    intentPathSlug: "cybersecurity",
    pages: [],
  },
  pages: [
    guidePage("mythos", 1, {
      og: { headlineTh: "แฮกเกอร์ในหนังไม่ใช่ของจริง" },
      blocks: [{ kind: "link", id: "first", labelTh: "ทำห้องฝึกแรกให้จบ", href: "https://tryhackme.com", cta: "first-step" }],
    }),
    MONEY,
    TRIAGE,
  ],
  facts: FACTS,
  banned: [],
};

function allText(payload: RadarReelPayload): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.entries(v).forEach(([k, c]) => k !== "notes" && walk(c));
  };
  walk(payload);
  return out;
}

function expectWellFormedTimeline(payload: RadarReelPayload) {
  const timeline = buildRadarReelTimeline(payload);
  const [min, max] = RADAR_REEL_TARGET[payload.mode];
  expect(timeline.seconds).toBeGreaterThanOrEqual(min);
  expect(timeline.seconds).toBeLessThanOrEqual(max);
  expect(timeline.scenes[0].start).toBe(0);
  expect(timeline.scenes[timeline.scenes.length - 1].end).toBeCloseTo(timeline.seconds, 3);
  timeline.scenes.forEach((scene, i) => {
    expect(scene.end).toBeGreaterThan(scene.start);
    if (i > 0) expect(scene.start).toBeCloseTo(timeline.scenes[i - 1].end, 3);
  });
  const { cues } = timeline;
  expect(cues.seconds).toBe(timeline.seconds);
  expect(cues.beat).toBeCloseTo(RADAR_REEL_BEAT, 6);
  expect(cues.cuts).toEqual(timeline.scenes.map((s) => s.start));
  for (const t of [...cues.slams, ...cues.pops, cues.coin]) {
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThan(timeline.seconds);
  }
  expect([...cues.pops].sort((a, b) => a - b)).toEqual(cues.pops);
  const moodTimes = (cues.moods ?? []).map(([t]) => t);
  expect([...moodTimes].sort((a, b) => a - b)).toEqual(moodTimes);
  return timeline;
}

describe("radar reel timeline", () => {
  it.each(RADAR_FIXTURE_SLUGS)("%s: the card-only career reel stays within 25-35s", (slug) => {
    for (const platform of ["ig", "tt"] as const) {
      const payload = buildRadarReelPayload({ dump: loadRadarFixture(slug), platform });
      const timeline = expectWellFormedTimeline(payload);
      expect(timeline.scenes[0].id).toBe("hook");
      expect(timeline.scenes[timeline.scenes.length - 1].id).toBe("end");
      expect(payload.notes.length).toBeGreaterThan(0);
    }
  });

  it("a guide career reel fits too, with or without a dump", () => {
    expectWellFormedTimeline(buildRadarReelPayload({ dump: loadRadarFixture("cybersecurity"), guide: GUIDE, platform: "ig" }));
    expectWellFormedTimeline(buildRadarReelPayload({ guide: GUIDE, platform: "ig" }));
  });

  it("stretches a sparse reel up to the minimum", () => {
    const dump = loadRadarFixture("cybersecurity");
    dump.radar_cards = dump.radar_cards.filter((c) => c.kind === "hook");
    const payload = buildRadarReelPayload({ dump, platform: "ig" });
    expect(radarReelSceneIds(payload)).toEqual(["hook", "end"]);
    expectWellFormedTimeline(payload);
  });

  it("page reels show the hook, that level's lines and the end card", () => {
    const payload = buildRadarReelPayload({ guide: GUIDE, platform: "ig", page: "money" });
    expect(payload.mode).toBe("page");
    expect(payload.page).toBe("money");
    expect(radarReelSceneIds(payload)).toEqual(["hook", "money", "day", "end"]);
    expectWellFormedTimeline(payload);
  });

  it("a page reel needs a guide and a real page", () => {
    expect(() => buildRadarReelPayload({ dump: loadRadarFixture("cybersecurity"), platform: "ig", page: "money" })).toThrow(/needs the career's code guide/);
    expect(() => buildRadarReelPayload({ guide: GUIDE, platform: "ig", page: "nope" })).toThrow(/no page "nope"/);
  });

  it("compare reels put two careers side by side", () => {
    const payload = buildRadarReelPayload({
      dump: loadRadarFixture("cybersecurity"),
      guide: GUIDE,
      platform: "ig",
      compareWith: { dump: loadRadarFixture("data-scientist") },
    });
    expect(radarReelSceneIds(payload)).toEqual(["hook", "compare", "end"]);
    expect(payload.compare?.left.money?.text).toBe("เฉลี่ย 35,500 บาทต่อเดือน");
    expect(payload.compare?.left.firstStep).toBe("ทำห้องฝึกแรกให้จบ");
    expect(payload.compare?.right.nameTh).toBeTruthy();
    expectWellFormedTimeline(payload);
  });
});

describe("radar reel payload", () => {
  it.each(RADAR_FIXTURE_SLUGS)("%s: no dashes reach the screen", (slug) => {
    for (const guide of [null, GUIDE]) {
      const payload = buildRadarReelPayload({ dump: loadRadarFixture(slug), guide: slug === "cybersecurity" ? guide : null, platform: "ig" });
      for (const text of allText(payload)) expect(findDashes(text)).toEqual([]);
    }
  });

  it("uses only fact-backed numbers from a guide", () => {
    const backed = new Set(FACTS.filter((f) => f.badge === "confirmed" || f.badge === "vendor").flatMap((f) => [...numberTokens(f.claimEn), ...(f.values ?? []).flatMap(numberTokens)]));
    for (const page of [null, "money"]) {
      const payload = buildRadarReelPayload({ guide: GUIDE, platform: "ig", page });
      // Outlet names (ISC2) are labels, not claims.
      const numbers = allText({ ...payload, sources: [] })
        .filter((t) => !t.startsWith("passionseed.org"))
        .flatMap(numberTokens);
      for (const n of numbers) expect([page, n, backed.has(n)]).toEqual([page, n, true]);
      expect(numbers.length).toBeGreaterThan(0);
    }
    const money = buildRadarReelPayload({ guide: GUIDE, platform: "ig", page: "money" });
    expect(money.money?.rows.map((r) => r.text)).toEqual(["เฉลี่ย 35,500 บาทต่อเดือน", "ทั่วโลกยังขาดคน 4.8 ล้านคน"]);
    expect(money.money?.rows[0].highlight).toBe("35,500");
    expect(money.hook.stat?.text).toBe("เฉลี่ย 35,500 บาท");
    expect(money.day?.items).toEqual(["มาดูเงินเดือนจริงกัน", "ทักษะสำคัญกว่าใบเซอร์"]);
    expect(money.sources).toEqual(["JobsDB", "ISC2"]);
    expect(JSON.stringify(money)).not.toMatch(/99,999|90%|แจ้งเตือน 10/);
  });

  it("drops pending, simulated and unbacked lines", () => {
    expect(factBackedLine({ th: "งานรีโมต 90%", factIds: ["f.rumour"] }, MONEY, FACTS)).toBeNull();
    expect(factBackedLine({ th: "แจ้งเตือน 10 รายการ", factIds: ["sim.alerts"] }, MONEY, FACTS)).toBeNull();
    expect(factBackedLine({ th: "เงินเดือน 99,999 บาท", factIds: ["f.pay"] }, MONEY, FACTS)).toBeNull();
    expect(factBackedLine({ th: "เฉลี่ย ๓๕,๕๐๐ บาท", factIds: ["f.pay"] }, MONEY, FACTS)?.numeric).toBe(true);
    expect(factBackedLine({ th: "ปีการศึกษา 2569 ม.6", factIds: ["f.pay"] }, MONEY, [{ ...FACTS[0], claimEn: "in 2026" }])).not.toBeNull();
  });

  it("labels the AI score as our estimate", () => {
    const payload = buildRadarReelPayload({ dump: loadRadarFixture("software-engineer"), platform: "ig" });
    expect(payload.ai?.score).toBe(7);
    expect(payload.ai?.label).toBe("ทีมเราประเมิน");
  });

  it("IG ends on the comment keyword, TikTok on the typeable alias", () => {
    const dump = loadRadarFixture("cybersecurity");
    const ig = buildRadarReelPayload({ dump, platform: "ig" });
    const tt = buildRadarReelPayload({ dump, platform: "tt" });
    expect(ig.end).toMatchObject({ kind: "comment_radar", keyword: "RADAR", sub: "รับลิงก์ทาง DM" });
    expect(tt.end).toMatchObject({ kind: "tiktok_alias", keyword: "passionseed.org/r/cyber" });
    const page = buildRadarReelPayload({ guide: GUIDE, platform: "tt", page: "money" });
    expect(page.end).toMatchObject({ keyword: "passionseed.org/r/cyber-money", sendToFriend: "ส่งให้เพื่อนที่อยากรู้" });
  });

  it("is recognised by the studio's payload check", () => {
    const payload = buildRadarReelPayload({ dump: loadRadarFixture("ai-engineer"), platform: "ig" });
    expect(isRadarReelPayload(payload)).toBe(true);
    expect(isRadarReelPayload({ version: 2 })).toBe(false);
    expect(isRadarReelPayload(null)).toBe(false);
  });

  it("clips at word boundaries and finds the number to light up", () => {
    const clipped = clipText("ภาพยนตร์มักแสดงให้เห็นแฮกเกอร์อัจฉริยะที่สามารถเจาะระบบได้ในชั่วข้ามคืน", 20);
    expect(Array.from(clipped).length).toBeLessThanOrEqual(20);
    expect(clipped.endsWith("…")).toBe(true);
    expect(toReelLine("เฉลี่ย ฿35,500/เดือน · JobsDB").highlight).toBe("฿35,500");
    expect(toReelLine("+21% (2025-2035) เทียบงานทั่วไป").highlight).toBe("+21%");
    expect(toReelLine("ไม่มีตัวเลข").highlight).toBeNull();
  });
});

describe("demo reel timeline", () => {
  const plan = buildDemoReelPlan({ slug: "cybersecurity", alias: "cyber", platform: "ig", page: TRIAGE });

  it("plays every block's script in page order, after a lead-in", () => {
    const steps = pageDemoSteps(TRIAGE);
    expect(steps.map((s) => ("target" in s ? s.target : "wait"))).toEqual(["alert-1", "bin-real", "alert-2", "pipe-open", "wait"]);
    expect(steps[0].at).toBe(DEMO_REEL_TIMING.leadInMs);
  });

  it("steps ascend and stay within the reel's target length", () => {
    const ats = plan.steps.map((s) => s.at);
    expect([...ats].sort((a, b) => a - b)).toEqual(ats);
    expect(plan.pageStartMs + ats[ats.length - 1]).toBeLessThan(plan.endStartMs);
    expect(plan.seconds).toBeGreaterThanOrEqual(DEMO_REEL_TARGET_S[0]);
    expect(plan.seconds).toBeLessThanOrEqual(DEMO_REEL_TARGET_S[1]);
    expect(demoReelProblems(plan)).toEqual([]);
  });

  it("scores taps as slams and ends on the comment keyword", () => {
    const { cues } = plan;
    expect(cues.seconds).toBe(plan.seconds);
    expect(cues.cuts).toEqual([0, plan.pageStartMs / 1000, plan.endStartMs / 1000]);
    for (const t of [...cues.slams, ...cues.pops, cues.coin]) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThan(plan.seconds);
    }
    expect([...cues.slams].sort((a, b) => a - b)).toEqual(cues.slams);
    expect(plan.hookTh).toBe("งานจริงคือจับผิด AI");
    expect(plan.end).toMatchObject({ keyword: "RADAR", sendToFriend: "ส่งให้เพื่อนสายเกม" });
  });

  it("flags a level with no demo script and a reel that runs too long", () => {
    const empty = buildDemoReelPlan({ slug: "cybersecurity", alias: "cyber", platform: "ig", page: MONEY });
    expect(demoReelProblems(empty).join(" ")).toMatch(/no demoScript/);
    const long = buildDemoReelPlan({
      slug: "cybersecurity",
      alias: "cyber",
      platform: "tt",
      page: guidePage("long", 9, {
        blocks: [
          { kind: "bespoke", id: "x", component: "X", fallbackTh: ["x"], demoScript: [{ at: 0, action: "wait" }, { at: 60_000, action: "wait" }] },
        ],
      }),
    });
    expect(demoReelProblems(long).join(" ")).toMatch(/must be 8 to 45s/);
    expect(long.end.keyword).toBe("passionseed.org/r/cyber-long");
  });
});

describe("demo reel camera (PageFrame follows the level's DemoPlayer)", () => {
  it("the reel's lead-in is DemoPlayer's lead-in, so the fingertip lands when the tap does", () => {
    expect(DEMO_REEL_TIMING.leadInMs).toBe(DEMO_LEAD_IN_MS);
  });

  it("reveals each tap or type target before the step, never before the level shows", () => {
    const cues = demoCameraCues([
      { at: 100, action: "tap", target: "a" },
      { at: 900, action: "scroll", target: "b" },
      { at: 1500, action: "type", target: "c", text: "hi" },
      { at: 2000, action: "wait" },
    ]);
    expect(cues.map((c) => `${c.kind}:${c.at}`)).toEqual(["reveal:0", "touch:100", `reveal:${1500 - DEMO_REVEAL_MS}`, "touch:1500"]);
  });

  it("reports a missing target instead of throwing, and finds a present one", () => {
    document.body.innerHTML = '<div id="root"><button data-demo="lab.cmd-ls_-a">ls -a</button></div>';
    const root = document.getElementById("root")!;
    expect(locateDemoStep({ at: 10, action: "tap", target: "lab.cmd-ls_-a" }, root)).toEqual({ point: expect.any(Object) });
    expect(locateDemoStep({ at: 10, action: "tap", target: "nope" }, root).miss).toMatch(/no \[data-demo="nope"\]/);
    expect(locateDemoStep({ at: 10, action: "wait" }, root)).toEqual({ point: null });
  });
});
