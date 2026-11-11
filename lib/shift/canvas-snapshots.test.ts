import { bangkokDay, buildSnapshots, cleanNote, MAX_CHANGE_NOTE, NO_CHANGE, snapshotStats, trendOf } from "./canvas-snapshots";
import type { ShiftCanvasStats } from "@/lib/whiteboard/shift-overview";

const BOARD = "a7a510a6-1f7d-4228-b23f-5e15a57acb2e";

function canvas(frameId: string, notes = 2): { row: { boardId: string } & ShiftCanvasStats; markdown: string } {
  return {
    row: {
      boardId: BOARD,
      frameId,
      project: `p-${frameId}`,
      title: frameId,
      owner: "owner-1",
      editors: [],
      zones: [
        { kind: "problem", title: "🎯 ปัญหา", notes: 1 },
        { kind: "interview", title: "🎤 สัมภาษณ์", notes: notes - 1 },
        { kind: "daily", day: 1, title: "📅 วันที่ 1", notes: 0 },
      ],
      notes,
      versions: 3,
      lastEdited: 1,
    },
    markdown: `# ${frameId} with ${notes} notes`,
  };
}

describe("bangkokDay", () => {
  it("counts days in Bangkok time, so the late-evening job lands on the same day", () => {
    expect(bangkokDay(new Date("2026-11-10T16:45:00Z"))).toBe("2026-11-10");
    expect(bangkokDay(new Date("2026-11-10T17:00:00Z"))).toBe("2026-11-11");
  });
});

describe("snapshotStats", () => {
  it("keeps the numbers the trend shows", () => {
    expect(snapshotStats(canvas("a", 3).row)).toEqual({
      notes: 3,
      versions: 3,
      interviews: 2,
      references: 0,
      tests: 0,
      pivots: 0,
      daysLogged: 0,
      days: 1,
      beliefs: { problem: true, target: false, idea: false, ship: false },
    });
  });
});

describe("cleanNote", () => {
  it("tidies a note and keeps it within the table's limit", () => {
    expect(cleanNote("  Added two\n interviews. ")).toBe("Added two interviews.");
    expect(cleanNote("   ")).toBeNull();
    expect(cleanNote(null)).toBeNull();
    expect(cleanNote("x".repeat(MAX_CHANGE_NOTE + 50))).toHaveLength(MAX_CHANGE_NOTE);
  });
});

describe("buildSnapshots", () => {
  it("asks the model only about canvases that changed, with the last snapshot to compare", async () => {
    const describe = jest.fn(async (before: string | null) => (before ? "Added an interview." : "Started: one problem note."));
    const same = canvas("same");
    const grew = canvas("grew", 3);
    const fresh = canvas("fresh");
    const previous = new Map([
      [`${BOARD}:same`, { markdown: same.markdown }],
      [`${BOARD}:grew`, { markdown: "# grew with 2 notes" }],
    ]);
    const out = await buildSnapshots([same, grew, fresh], previous, "2026-11-10", describe);
    expect(out.map((s) => [s.frameId, s.changeNote])).toEqual([
      ["same", NO_CHANGE],
      ["grew", "Added an interview."],
      ["fresh", "Started: one problem note."],
    ]);
    expect(describe).toHaveBeenCalledTimes(2);
    expect(describe).toHaveBeenCalledWith("# grew with 2 notes", grew.markdown);
    expect(describe).toHaveBeenCalledWith(null, fresh.markdown);
    expect(out[1]).toMatchObject({ boardId: BOARD, project: "p-grew", ownerId: "owner-1", day: "2026-11-10", markdown: grew.markdown });
  });

  it("keeps everyone's numbers when one note fails", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const describe = jest.fn(async (_b: string | null, now: string) => {
      if (now.includes("bad")) throw new Error("overloaded");
      return "Fine.";
    });
    const out = await buildSnapshots([canvas("bad"), canvas("good")], new Map(), "2026-11-10", describe);
    expect(out.map((s) => [s.frameId, s.changeNote, s.stats.notes])).toEqual([
      ["bad", null, 2],
      ["good", "Fine.", 2],
    ]);
    spy.mockRestore();
  });
});

describe("trendOf", () => {
  it("orders days newest first and shows what grew since the day before", () => {
    const stats = (notes: number, interviews: number) => ({ ...snapshotStats(canvas("a").row), notes, interviews });
    const rows = trendOf([
      { day: "2026-11-09", stats: stats(2, 1), changeNote: "Started." },
      { day: "2026-11-11", stats: stats(5, 3), changeNote: "Added interviews." },
      { day: "2026-11-10", stats: stats(2, 1), changeNote: NO_CHANGE },
    ]);
    expect(rows.map((r) => [r.day, r.delta])).toEqual([
      ["2026-11-11", { notes: 3, interviews: 2 }],
      ["2026-11-10", {}],
      ["2026-11-09", {}],
    ]);
  });
});
