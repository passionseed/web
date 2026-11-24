import { REELS } from "../elemental-reels";
import { bangkokToday, filterRows, groupByDay, shotListRows } from "@/lib/reels/studio";

describe("elemental reels data", () => {
  it("has unique ids and a posting day for every video", () => {
    expect(new Set(REELS.map((r) => r.id)).size).toBe(REELS.length);
    for (const r of REELS) expect(r.day).toMatch(/^2026-(11|12)-\d{2}$/);
  });

  it("gives every video at least one row", () => {
    for (const r of REELS) expect(r.rows.length).toBeGreaterThan(0);
  });

  it("leaves a voice-over empty only on CODE shots", () => {
    for (const r of REELS) {
      for (const row of r.rows) {
        if (row.shot !== "CODE") expect({ id: r.id, time: row.time, vo: row.vo.trim() }).not.toMatchObject({ vo: "" });
      }
    }
  });

  it("has a spoken hook for every video except the silent one", () => {
    for (const r of REELS) {
      if (r.id !== "water-b") expect(r.hook.length).toBeGreaterThan(0);
    }
  });

  it("keeps outlet names out of the public file", () => {
    const text = JSON.stringify(REELS);
    for (const name of ["Matichon", "Prachachat", "Nation", "Al Jazeera", "AFP", "mgronline", "Pattaya", "Mongabay", "Thai PBS"]) {
      expect(text).not.toContain(name);
    }
  });
});

describe("reel studio helpers", () => {
  it("filters FACE lines and spoken lines, keeping each row's own index", () => {
    const reel = REELS.find((r) => r.id === "fire-1")!;
    const face = filterRows(reel.rows, "face");
    expect(face.length).toBeGreaterThan(0);
    expect(face.every((r) => r.shot === "FACE" && reel.rows[r.index].vo === r.vo)).toBe(true);
    expect(filterRows(reel.rows, "voice").every((r) => r.vo.trim() !== "")).toBe(true);
    expect(filterRows(reel.rows, "all")).toHaveLength(reel.rows.length);
    expect(shotListRows(reel).every((r) => r.shot !== "FACE")).toBe(true);
  });

  it("puts today's group first, then later days, then past days", () => {
    expect(groupByDay(REELS, "2026-11-26")[0].day).toBe("2026-11-26");
    const days = groupByDay(REELS, "2026-11-28").map((g) => g.day);
    expect(days.slice(0, 2)).toEqual(["2026-11-28", "2026-11-29"]);
    expect(days[days.length - 1]).toBe("2026-11-27");
  });

  it("reads the date in Bangkok time", () => {
    expect(bangkokToday(new Date("2026-11-25T18:30:00Z"))).toBe("2026-11-26");
  });
});
