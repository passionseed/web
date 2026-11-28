import { shareLinkView } from "@/lib/hackathon/elemental/share-rules";
import type { StoryProofStatus } from "@/lib/hackathon/elemental/story-proof";

import {
  cellColors,
  clearOrder,
  freshCells,
  GRID_CELLS,
  GRID_COLUMNS,
  GRID_ROWS,
  MAX_ANIMATED,
  meterHeadline as headline,
  meterModel,
  meterPlace,
  tierEdge,
} from "../meter-model";

const link = (devices: number, opts: { phase?: "open" | "after-close"; storyProof?: StoryProofStatus } = {}) =>
  shareLinkView({ link: { kind: "student", code: "1a2b3c4d", schoolName: "x", province: null }, counts: { devices, paid: 0 }, phase: opts.phase ?? "open", storyProof: opts.storyProof });
const team = (devices: number, extra: { solo?: boolean; storyUnlocked?: boolean } = {}) => ({ devices, solo: extra.solo ?? false, storyUnlocked: extra.storyUnlocked });
// The headline glues the number to its unit with no-break spaces; read them as spaces here.
const meterHeadline = (m: Parameters<typeof headline>[0]) => headline(m).replace(/\u00a0/g, " ").replace(/\u2060/g, "");

describe("meterModel: the team's way to its next name style", () => {
  it("counts the team's devices toward colours, fonts, then effects", () => {
    expect(meterModel(link(0), team(0))).toMatchObject({ mode: "team", devices: 0, cleared: 0, next: { part: "color", left: 10 }, allUnlocked: false });
    expect(meterModel(link(6), team(14))).toMatchObject({ devices: 14, linkDevices: 6, next: { part: "font", left: 11 } });
    expect(meterModel(link(12), team(31)).tiers.map((t) => t.unlocked)).toEqual([true, true, false]);
    expect(meterModel(link(40), team(64))).toMatchObject({ cleared: GRID_CELLS, next: null, allUnlocked: true, byStory: false });
  });

  it("opens everything with a live Story proof, the team's or this person's own", () => {
    expect(meterModel(link(8), team(14, { storyUnlocked: true }))).toMatchObject({ allUnlocked: true, byStory: true, next: null });
    expect(meterModel(link(8, { storyProof: "unlocked" }), team(14))).toMatchObject({ allUnlocked: true, byStory: true });
    expect(meterModel(link(8, { storyProof: "revoked" }), team(14))).toMatchObject({ allUnlocked: false, next: { part: "font" } });
  });

  it("is a team of one for a solo sign-up, and never shows fewer devices than the link has", () => {
    expect(meterModel(link(12), team(12, { solo: true }))).toMatchObject({ solo: true, devices: 12 });
    expect(meterModel(link(9), team(4)).devices).toBe(9);
  });

  it("just counts the link without team data, and freezes after close", () => {
    expect(meterModel(link(12))).toMatchObject({ mode: "count", devices: 12, cleared: 12, next: null, tiers: [] });
    expect(meterModel(link(30, { phase: "after-close" }), team(52)).frozen).toBe(true);
  });
});

describe("meterHeadline: what's next, in one line", () => {
  it("says the devices left to the next style", () => {
    expect(meterHeadline(meterModel(link(6), team(6)))).toBe("อีก 4 เครื่อง ปลดล็อกสี");
    expect(meterHeadline(meterModel(link(12), team(31)))).toBe("อีก 19 เครื่อง ปลดล็อกเอฟเฟกต์");
    expect(meterHeadline(meterModel(link(8), team(14, { storyUnlocked: true })))).toBe("ปลดล็อกครบแล้ว");
  });

  it("counts without team data, and says counting stopped after close", () => {
    expect(meterHeadline(meterModel(link(12)))).toBe("12 เครื่อง");
    expect(meterHeadline(meterModel(link(30, { phase: "after-close" }), team(52)))).toBe("ปิดนับแล้ว · 52 เครื่อง");
    expect(meterHeadline(meterModel(link(0, { phase: "after-close" })))).toBe("ปิดนับแล้ว");
  });
});

describe("the grid fills column by column, so the styles are bands", () => {
  it("clears every cell once, a column (5 devices) at a time, the same way every time", () => {
    const rank = clearOrder("1a2b3c4d");
    expect([...rank].sort((a, b) => a - b)).toEqual(Array.from({ length: GRID_CELLS }, (_, i) => i));
    expect(clearOrder("1a2b3c4d")).toEqual(rank);
    for (let row = 0; row < GRID_ROWS; row++) {
      expect(Math.floor(rank[row * GRID_COLUMNS] / GRID_ROWS)).toBe(0);
      expect(Math.floor(rank[row * GRID_COLUMNS + 4] / GRID_ROWS)).toBe(4);
    }
  });

  it("puts the colour and font edges at 2 and 5 columns", () => {
    expect(tierEdge(10)).toBe(0.2);
    expect(tierEdge(25)).toBe(0.5);
    expect(tierEdge(50)).toBe(1);
  });

  it("mixes fire and smoke, never the blank-looking hottest fire", () => {
    const colors = cellColors("1a2b3c4d");
    expect(colors).not.toContain("#fff4dc");
    const smoke = colors.filter((c) => ["#2a2826", "#6b6761", "#c9c4bb"].includes(c)).length;
    expect(smoke).toBeGreaterThan(5);
    expect(smoke).toBeLessThan(25);
    expect(meterPlace("1a2b3c4d").src).toMatch(/places/);
  });
});

describe("freshCells: what animates on open", () => {
  const rank = clearOrder("1a2b3c4d");
  it("animates nothing on a first visit or with no change", () => {
    expect(freshCells(rank, 12, null).size).toBe(0);
    expect(freshCells(rank, 12, 12).size).toBe(0);
  });

  it("animates the new cells, at most 8, the newest ones", () => {
    expect(freshCells(rank, 14, 12).size).toBe(2);
    const many = freshCells(rank, 40, 10);
    expect(many.size).toBe(MAX_ANIMATED);
    for (const cell of many) expect(rank[cell]).toBeGreaterThanOrEqual(40 - MAX_ANIMATED);
  });
});
