import { shareLinkView } from "@/lib/hackathon/elemental/share-rules";

import { cellColors, clearOrder, freshCells, GRID_CELLS, MAX_ANIMATED, meterHeadline as headline, meterModel, meterPlace } from "../meter-model";

const view = (devices: number, phase: "open" | "after-close" = "open") =>
  shareLinkView({ link: { kind: "student", code: "1a2b3c4d", schoolName: "x", province: null }, counts: { devices, paid: 0 }, phase });

describe("meterModel: the grid shows devices, nothing else", () => {
  it("clears one cell per device, up to a clean photo at 50", () => {
    expect(meterModel(view(0))).toEqual({ devices: 0, cleared: 0, full: false, frozen: false });
    expect(meterModel(view(12))).toMatchObject({ devices: 12, cleared: 12, full: false });
    expect(meterModel(view(50))).toMatchObject({ cleared: GRID_CELLS, full: true });
  });

  it("keeps counting past a full grid", () => {
    expect(meterModel(view(64))).toMatchObject({ devices: 64, cleared: 50, full: true });
  });

  it("freezes after sign-up closes", () => {
    expect(meterModel(view(74, "after-close")).frozen).toBe(true);
  });
});

describe("meterHeadline: the count in one line", () => {
  // The headline glues the number to its unit with a non-breaking space; read it as a space here.
  const meterHeadline = (v: Parameters<typeof headline>[0]) => headline(v).replace(/ /g, " ");
  it("says the devices while open, and that counting stopped after close", () => {
    expect(meterHeadline(view(12))).toBe("12 เครื่อง");
    expect(meterHeadline(view(74, "after-close"))).toBe("ปิดนับแล้ว · 74 เครื่อง");
    expect(meterHeadline(view(0, "after-close"))).toBe("ปิดนับแล้ว");
  });

  it("never promises a seat", () => {
    for (const n of [0, 12, 49, 50, 120]) expect(headline(view(n))).not.toMatch(/ที่นั่ง/);
  });
});

describe("the grid's pattern is the link's own", () => {
  it("clears every cell exactly once, the same way every time", () => {
    const rank = clearOrder("1a2b3c4d");
    expect([...rank].sort((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i));
    expect(clearOrder("1a2b3c4d")).toEqual(rank);
    expect(clearOrder("5e6f7a8b")).not.toEqual(rank);
    const colors = cellColors("1a2b3c4d");
    expect(cellColors("1a2b3c4d")).toEqual(colors);
    expect(colors).not.toContain("#fff4dc");
    const smoke = colors.filter((c) => ["#2a2826", "#6b6761", "#c9c4bb"].includes(c)).length;
    expect(smoke).toBeGreaterThan(5);
    expect(smoke).toBeLessThan(25);
  });

  it("puts the same place behind a link every time", () => {
    expect(meterPlace("1a2b3c4d").src).toBe(meterPlace("1a2b3c4d").src);
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
