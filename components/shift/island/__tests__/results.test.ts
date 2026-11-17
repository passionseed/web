import { IDS, MAIN_TITLES, makeBoard } from "../__fixtures__/board";
import { FRESH_WITHOUT_MARK_MS, RESULTS_SHOWN, isFresh, questResults } from "../results";

describe("questResults", () => {
  it("lists the student's own reviewed work, newest first, with the mentor's words", () => {
    const results = questResults(makeBoard());
    expect(results.map((r) => [r.title, r.outcome, r.feedback])).toEqual([
      ["ฟังเสียงจริงอีก 5 คน", "clarification", "ขอรูปหรือโน้ตเพิ่มอีกนิด"],
      [MAIN_TITLES[5], "declined", "ลองเล่าให้ชัดขึ้นว่าใครใช้"],
    ]);
    expect(results[0].ref).toEqual({ kind: "side", templateId: IDS.sideVoices });
    expect(results[1].ref).toEqual({ kind: "main", milestone: 6 });
  });

  it("skips unknown outcomes and unreadable times, and keeps an empty note as none", () => {
    const board = makeBoard();
    board.main[0].mine = {
      instance_id: IDS.m2Instance,
      state: "approved",
      version: 1,
      updated_at: "2026-11-12T08:00:00Z",
      latest_submission: null,
      latest_review: { outcome: "approved", feedback: "   ", created_at: "2026-11-12T08:00:00Z" },
    };
    board.main[1].mine = { ...board.main[0].mine, latest_review: { outcome: "withdrawn", feedback: null, created_at: "2026-11-12T09:00:00Z" } };
    board.main[2].mine = { ...board.main[0].mine, latest_review: { outcome: "approved", feedback: null, created_at: "not a date" } };
    const results = questResults(board);
    expect(results[0]).toMatchObject({ title: MAIN_TITLES[0], outcome: "approved", feedback: null });
    expect(results).toHaveLength(3);
  });

  it("includes a proposed quest's review", () => {
    const board = makeBoard();
    board.proposed[0] = {
      ...board.proposed[0],
      latest_review: { outcome: "approved", feedback: "ดีมาก", created_at: "2026-11-13T08:00:00Z" },
    };
    expect(questResults(board)[0]).toMatchObject({ ref: { kind: "proposed", instanceId: IDS.proposed }, outcome: "approved" });
  });

  it(`keeps the newest ${RESULTS_SHOWN}`, () => {
    const board = makeBoard();
    board.side = Array.from({ length: RESULTS_SHOWN + 3 }, (_, i) => ({
      ...board.side[0],
      template_id: `side-${i}`,
      title: `เควสต์ ${i}`,
      mine: {
        instance_id: `i-${i}`,
        state: "approved" as const,
        version: 1,
        updated_at: "2026-11-01T00:00:00Z",
        latest_submission: null,
        latest_review: { outcome: "approved", feedback: null, created_at: new Date(Date.UTC(2026, 10, 1 + i)).toISOString() },
      },
    }));
    const results = questResults(board);
    expect(results).toHaveLength(RESULTS_SHOWN);
    expect(results[0].title).toBe(`เควสต์ ${RESULTS_SHOWN + 2}`);
  });
});

describe("isFresh", () => {
  const result = { key: "k", ref: { kind: "main", milestone: 1 } as const, title: "t", outcome: "approved" as const, feedback: null, at: "2026-11-10T08:00:00Z" };
  const at = Date.parse(result.at);

  it("is newer than the last time the envelope was opened", () => {
    expect(isFresh(result, at - 1, at + 10)).toBe(true);
    expect(isFresh(result, at, at + 10)).toBe(false);
  });

  it("without a mark, counts the last week only", () => {
    expect(isFresh(result, null, at + FRESH_WITHOUT_MARK_MS - 1)).toBe(true);
    expect(isFresh(result, null, at + FRESH_WITHOUT_MARK_MS)).toBe(false);
  });
});
