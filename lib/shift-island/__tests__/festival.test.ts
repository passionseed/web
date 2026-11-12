import { bangkokDay, boothsOf, festivalOf, lanternsOf, msToBangkokMidnight, stageStepOf } from "@/lib/shift-island/festival";
import { FESTIVAL, thaiShortDate } from "@/components/shift/island/copy";
import type { IslandMapPlot, SeasonGoal, SeasonView } from "@/lib/supabase/shift-quests/types";

const DEMO = "2026-11-28";

const season = (over: Partial<SeasonView> = {}): SeasonView => ({
  name: "Season 1",
  starts_on: "2026-10-29",
  demo_day: DEMO,
  days_to_demo: 17,
  table_bar: 2,
  stage_bar: 4,
  stage_at_cutoff: 0,
  qualifies: null,
  goal: null,
  unlocks: [],
  ...over,
});

const goal = (over: Partial<SeasonGoal> = {}): SeasonGoal => ({
  milestone: 2,
  target: 10,
  count: 0,
  deadline: DEMO,
  unlock: null,
  reached: false,
  ...over,
});

const plot = (slot: number, over: Partial<IslandMapPlot> = {}): IslandMapPlot => ({
  slot,
  stage: 0,
  visitor: false,
  key: false,
  helper: false,
  lantern: false,
  name: null,
  mine: false,
  plain: false,
  ...over,
});

describe("stageStepOf", () => {
  // A 30-day season: 2026-10-29 to 2026-11-28. Thirds at 10 and 20 days elapsed.
  const at = (left: number, startsOn = "2026-10-29") => stageStepOf({ demo_day: DEMO, days_to_demo: left, starts_on: startsOn });

  it("builds in thirds of the season, by days elapsed", () => {
    expect(at(30)).toBe(0); // day 0
    expect(at(21)).toBe(0); // 9 days in
    expect(at(20)).toBe(1); // 10 days in: the first third
    expect(at(11)).toBe(1); // 19 days in
    expect(at(10)).toBe(2); // 20 days in: the second third
    expect(at(1)).toBe(2); // the day before Demo Day is never the full stage
  });

  it("is the full stage on and after Demo Day only", () => {
    expect(at(0)).toBe(3);
    expect(at(-1)).toBe(3);
    expect(at(-30)).toBe(3);
  });

  it("reads 17 days left as step 1 of a 30-day season", () => {
    expect(at(17)).toBe(1);
  });

  it("clamps days before the season starts to step 0", () => {
    expect(at(45)).toBe(0);
  });

  it("is step 0 when the season has no span (starts on or after Demo Day)", () => {
    expect(at(5, DEMO)).toBe(0);
    expect(at(5, "2026-12-01")).toBe(0);
    // Demo Day itself still wins.
    expect(at(0, DEMO)).toBe(3);
  });

  it("uses thresholds without starts_on: more than 28 days, then 14, then 0", () => {
    const without = (left: number) => stageStepOf({ demo_day: DEMO, days_to_demo: left });
    expect(without(40)).toBe(0);
    expect(without(29)).toBe(0);
    expect(without(28)).toBe(1);
    expect(without(17)).toBe(1);
    expect(without(15)).toBe(1);
    expect(without(14)).toBe(2);
    expect(without(1)).toBe(2);
    expect(without(0)).toBe(3);
    expect(without(-1)).toBe(3);
  });

  it("falls back to the thresholds when a date does not parse", () => {
    expect(stageStepOf({ demo_day: DEMO, days_to_demo: 20, starts_on: "soon" })).toBe(1);
    expect(stageStepOf({ demo_day: "2026-02-30", days_to_demo: 20, starts_on: "2026-01-01" })).toBe(1);
  });

  it("does date maths in whole UTC days across months", () => {
    // 2026-11-01 to 2026-12-01: 30 days; 10 left means 20 in.
    expect(stageStepOf({ demo_day: "2026-12-01", days_to_demo: 10, starts_on: "2026-11-01" })).toBe(2);
    expect(stageStepOf({ demo_day: "2026-12-01", days_to_demo: 11, starts_on: "2026-11-01" })).toBe(1);
  });
});

describe("lanternsOf", () => {
  it("is null without a goal", () => {
    expect(lanternsOf(null)).toBeNull();
  });

  it("is all dark at 0", () => {
    expect(lanternsOf(goal({ count: 0 }))).toEqual({ total: 8, lit: 0, reached: false, count: 0, target: 10 });
  });

  it("lights in proportion, rounding down", () => {
    expect(lanternsOf(goal({ count: 1 }))?.lit).toBe(0);
    expect(lanternsOf(goal({ count: 2 }))?.lit).toBe(1);
    expect(lanternsOf(goal({ count: 5 }))?.lit).toBe(4);
    expect(lanternsOf(goal({ count: 9 }))?.lit).toBe(7);
  });

  it("never lights all 8 before the goal is reached, even at or above the target", () => {
    expect(lanternsOf(goal({ count: 10 }))?.lit).toBe(7);
    expect(lanternsOf(goal({ count: 25 }))?.lit).toBe(7);
  });

  it("lights all 8 once reached, even if the count dropped since", () => {
    expect(lanternsOf(goal({ count: 10, reached: true }))).toEqual({ total: 8, lit: 8, reached: true, count: 10, target: 10 });
    expect(lanternsOf(goal({ count: 3, reached: true }))?.lit).toBe(8);
  });

  it("treats a target of 0 as 1", () => {
    expect(lanternsOf(goal({ target: 0, count: 0 }))?.lit).toBe(0);
    expect(lanternsOf(goal({ target: 0, count: 1 }))?.lit).toBe(7);
  });

  it("clamps negative and broken numbers to 0", () => {
    expect(lanternsOf(goal({ count: -4 }))).toMatchObject({ lit: 0, count: 0 });
    expect(lanternsOf(goal({ count: Number.NaN, target: Number.NaN }))).toMatchObject({ lit: 0, count: 0, target: 0 });
  });
});

describe("boothsOf", () => {
  const bars = { table_bar: 2, stage_bar: 4 } as const;

  it("uses season.qualifies for the viewer's own plot, whatever its tree shows", () => {
    const mine = plot(5, { mine: true, stage: 1 });
    expect(boothsOf([mine], { ...bars, qualifies: "stage" })).toEqual([{ slot: 5, kind: "stage" }]);
    expect(boothsOf([mine], { ...bars, qualifies: "table" })).toEqual([{ slot: 5, kind: "table" }]);
    expect(boothsOf([plot(5, { mine: true, stage: 6, visitor: true })], { ...bars, qualifies: null })).toEqual([]);
  });

  it("gives a consented plot a booth flag from its tree stage", () => {
    expect(boothsOf([plot(3, { stage: 2 })], { ...bars, qualifies: null })).toEqual([{ slot: 3, kind: "table" }]);
    expect(boothsOf([plot(3, { stage: 1 })], { ...bars, qualifies: null })).toEqual([]);
  });

  it("gives a star only when the stage reaches stage_bar and the visitor is drawn", () => {
    expect(boothsOf([plot(3, { stage: 4, visitor: true })], { ...bars, qualifies: null })).toEqual([{ slot: 3, kind: "stage" }]);
    // No visitor (main quest 3 not shown): only a booth flag.
    expect(boothsOf([plot(3, { stage: 6, visitor: false })], { ...bars, qualifies: null })).toEqual([{ slot: 3, kind: "table" }]);
  });

  it("never gives a plain plot anything", () => {
    expect(boothsOf([plot(3, { stage: 7, visitor: true, plain: true })], { ...bars, qualifies: "stage" })).toEqual([]);
  });

  it("is sorted by slot and lists each slot once", () => {
    const plots = [plot(9, { stage: 3 }), plot(1, { mine: true }), plot(4, { stage: 5, visitor: true }), plot(4, { stage: 5 })];
    expect(boothsOf(plots, { ...bars, qualifies: "table" })).toEqual([
      { slot: 1, kind: "table" },
      { slot: 4, kind: "stage" },
      { slot: 9, kind: "table" },
    ]);
  });

  it("never qualifies anyone against a missing or zero bar", () => {
    expect(boothsOf([plot(3, { stage: 0 })], { table_bar: 0, stage_bar: 0, qualifies: null })).toEqual([]);
  });

  it("carries a slot and a kind only: no names, no counts", () => {
    const [booth] = boothsOf([plot(3, { stage: 4, visitor: true, name: "Lamp" })], { ...bars, qualifies: null });
    expect(Object.keys(booth).sort()).toEqual(["kind", "slot"]);
  });
});

describe("festivalOf", () => {
  it("is null without a season", () => {
    expect(festivalOf(null, goal(), [plot(1, { stage: 5 })])).toBeNull();
  });

  it("puts the season's countdown, stage, lanterns and booths together", () => {
    const s = season({ goal: goal({ count: 5 }), qualifies: "table" });
    expect(festivalOf(s, null, [plot(2, { mine: true }), plot(7, { stage: 4, visitor: true, plain: true })])).toEqual({
      demoDay: DEMO,
      daysToDemo: 17,
      stageStep: 1,
      tableBar: 2,
      stageBar: 4,
      lanterns: { total: 8, lit: 4, reached: false, count: 5, target: 10 },
      booths: [{ slot: 2, kind: "table" }],
    });
  });

  it("falls back to the map's goal, and has no lanterns without any goal", () => {
    expect(festivalOf(season(), goal({ count: 10, reached: true }), [])?.lanterns?.lit).toBe(8);
    expect(festivalOf(season(), null, [])?.lanterns).toBeNull();
    // The season's own goal wins over the map's.
    expect(festivalOf(season({ goal: goal({ count: 0 }) }), goal({ reached: true }), [])?.lanterns?.lit).toBe(0);
  });

  it("is the full stage on Demo Day and after", () => {
    expect(festivalOf(season({ days_to_demo: 0 }), null, [])?.stageStep).toBe(3);
    expect(festivalOf(season({ days_to_demo: -1 }), null, [])?.stageStep).toBe(3);
  });

  it("counts down from the client's Bangkok date, rolling over at Bangkok midnight", () => {
    // 27 Nov 23:59:59 in Bangkok is 16:59:59 UTC; a second later it is Demo Day there.
    const eve = Date.UTC(2026, 10, 27, 16, 59, 59);
    const day = eve + 1000;
    // The page loaded 17 days out and was left open: the client's date wins.
    const before = festivalOf(season({ days_to_demo: 17 }), null, [], bangkokDay(eve));
    expect(before?.daysToDemo).toBe(1);
    expect(before?.stageStep).toBe(2);
    const on = festivalOf(season({ days_to_demo: 17 }), null, [], bangkokDay(day));
    expect(on?.daysToDemo).toBe(0);
    expect(on?.stageStep).toBe(3);
    expect(FESTIVAL.sign(thaiShortDate(on!.demoDay), on!.daysToDemo)).toBe("Demo Day 28 พ.ย.\nวันนี้");
    expect(festivalOf(season(), null, [], bangkokDay(Date.UTC(2026, 10, 28, 17, 0, 0)))?.daysToDemo).toBe(-1);
  });

  it("keeps the server's countdown without a client date or with a demo day that does not parse", () => {
    expect(festivalOf(season({ days_to_demo: 17 }), null, [])?.daysToDemo).toBe(17);
    expect(festivalOf(season({ days_to_demo: 17, demo_day: "soon" }), null, [], bangkokDay(Date.now()))?.daysToDemo).toBe(17);
  });
});

describe("bangkokDay and msToBangkokMidnight", () => {
  it("uses UTC+7 all year", () => {
    expect(bangkokDay(Date.UTC(2026, 10, 27, 16, 59, 59))).toBe(bangkokDay(Date.UTC(2026, 10, 27, 0, 0, 0)));
    expect(bangkokDay(Date.UTC(2026, 10, 27, 17, 0, 0))).toBe(bangkokDay(Date.UTC(2026, 10, 27, 0, 0, 0)) + 1);
    expect(msToBangkokMidnight(Date.UTC(2026, 10, 27, 16, 59, 59))).toBe(1000);
    expect(msToBangkokMidnight(Date.UTC(2026, 10, 27, 17, 0, 0))).toBe(86_400_000);
  });
});
