import type { BoardMain, QuestBoard, QuestMine } from "@/lib/supabase/shift-quests/types";

import { IDS, MAIN_TITLES, makeBoard } from "../__fixtures__/board";
import { nextLine, nextHeadline } from "../NextStepCard";
import { nextStep } from "../nextStep";

const OPEN_DAY = { tapsToday: 0, resting: false };
const DONE_DAY = { tapsToday: 1, resting: false };

function mine(instance: string, state: QuestMine["state"], extra: Partial<QuestMine> = {}): QuestMine {
  return { instance_id: instance, state, version: 1, updated_at: "2026-11-10T08:00:00Z", latest_submission: null, latest_review: null, ...extra };
}

/** Seven untouched main quests and nothing else: a team on its first day. */
function fresh(): QuestBoard {
  const board = makeBoard();
  return {
    ...board,
    project: board.project ? { ...board.project, stage: 0, milestones_done: [] } : null,
    main: board.main.map((m): BoardMain => ({ ...m, done: false, in_flight: null, mine: null })),
    side: board.side.map((s) => ({ ...s, mine: null })),
    proposed: [],
    help_open: [],
  };
}

function withMain(board: QuestBoard, milestone: number, patch: Partial<BoardMain>): QuestBoard {
  return { ...board, main: board.main.map((m) => (m.milestone === milestone ? { ...m, ...patch } : m)) };
}

function active(board: QuestBoard, milestone: number, instance: string, state: QuestMine["state"] = "active", extra: Partial<QuestMine> = {}) {
  return withMain(board, milestone, {
    in_flight: { instance_id: instance, state, version: 1, mine: true, owner: null },
    mine: mine(instance, state, extra),
  });
}

describe("nextStep", () => {
  it("starts a new team on the first main quest, checking in first while the day is open", () => {
    const step = nextStep(fresh(), OPEN_DAY);
    expect(step).toMatchObject({ kind: "start", ref: { kind: "main", milestone: 1 }, title: MAIN_TITLES[0], instanceId: null, checksIn: true });
    expect(nextHeadline(step!)).toBe(`เริ่มที่: ${MAIN_TITLES[0]}`);
    expect(nextLine(step!)).toBe("เควสต์หลัก 1 จาก 7");
  });

  it("goes straight to the quest once the day's check-in is in", () => {
    expect(nextStep(fresh(), DONE_DAY)).toMatchObject({ kind: "start", checksIn: false });
  });

  it("continues the quest in progress, filed under the student's own instance", () => {
    const board = active(fresh(), 1, IDS.m2Instance);
    const step = nextStep(board, OPEN_DAY);
    expect(step).toMatchObject({ kind: "go", ref: { kind: "main", milestone: 1 }, instanceId: IDS.m2Instance, checksIn: true });
    expect(nextHeadline(step!)).toBe(`ทำต่อ: ${MAIN_TITLES[0]}`);
  });

  it("shows back what the student meant to do today, after the check-in only", () => {
    const board = active(fresh(), 1, IDS.m2Instance);
    expect(nextLine(nextStep(board, DONE_DAY)!, "คุยกับแม่ค้า")).toBe("วันนี้ตั้งใจว่า: คุยกับแม่ค้า");
    expect(nextLine(nextStep(board, OPEN_DAY)!, "คุยกับแม่ค้า")).toBe("เควสต์หลัก 1 จาก 7");
  });

  it("puts a mentor's question first, with their words", () => {
    let board = active(fresh(), 1, IDS.m2Instance);
    board = active(board, 2, IDS.m4Instance, "clarification", {
      latest_review: { outcome: "clarification", feedback: "  ขอรูปอีกนิด  ", created_at: "2026-11-11T08:00:00Z" },
    });
    const step = nextStep(board, DONE_DAY);
    expect(step).toMatchObject({ kind: "answer", ref: { kind: "main", milestone: 2 }, feedback: "ขอรูปอีกนิด" });
    expect(nextHeadline(step!)).toBe(`ตอบพี่เลี้ยง: ${MAIN_TITLES[1]}`);
    expect(nextLine(step!)).toBe("พี่เลี้ยงบอกว่า: ขอรูปอีกนิด");
  });

  it("while work waits on a mentor, points at a main quest to start meanwhile", () => {
    const board = active(fresh(), 1, IDS.m5Instance, "submitted");
    const step = nextStep(board, OPEN_DAY);
    expect(step).toMatchObject({ kind: "waiting", ref: { kind: "main", milestone: 2 }, waitingTitle: MAIN_TITLES[0], checksIn: true });
    expect(nextHeadline(step!)).toBe(`ระหว่างรอ เริ่มที่: ${MAIN_TITLES[1]}`);
    expect(nextLine(step!)).toBe(`ส่ง ${MAIN_TITLES[0]} แล้ว รอพี่เลี้ยงดู`);
  });

  it("with nothing to start meanwhile, shows the waiting work and asks no check-in to look at it", () => {
    let board = fresh();
    for (const m of [2, 3, 4, 5, 6, 7]) board = withMain(board, m, { done: true });
    board = active(board, 1, IDS.m5Instance, "submitted");
    const step = nextStep(board, OPEN_DAY);
    expect(step).toMatchObject({ kind: "waiting", ref: { kind: "main", milestone: 1 }, waitingTitle: null, checksIn: false });
    expect(nextHeadline(step!)).toBe(`รอพี่เลี้ยงดู: ${MAIN_TITLES[0]}`);
    expect(nextLine(step!)).toBe("ส่งแล้ว ผลจะขึ้นที่ซองจดหมาย");
  });

  it("offers a declined main quest again before a new one, as a new round", () => {
    const board = withMain(fresh(), 2, {
      mine: mine(IDS.m6Instance, "declined", {
        latest_review: { outcome: "declined", feedback: "ลองเล่าให้ชัดขึ้น", created_at: "2026-11-11T08:00:00Z" },
      }),
    });
    const step = nextStep(board, OPEN_DAY);
    expect(step).toMatchObject({ kind: "retry", ref: { kind: "main", milestone: 2 }, instanceId: null, feedback: "ลองเล่าให้ชัดขึ้น" });
    expect(nextHeadline(step!)).toBe(`ลองอีกครั้ง: ${MAIN_TITLES[1]}`);
  });

  it("never points at a main quest a teammate holds", () => {
    const board = withMain(fresh(), 1, { in_flight: { instance_id: IDS.m4Instance, state: "active", version: 1, mine: false, owner: "มิ้นต์" } });
    expect(nextStep(board, OPEN_DAY)).toMatchObject({ kind: "start", ref: { kind: "main", milestone: 2 } });
  });

  it("while resting, wakes first and never asks for a check-in", () => {
    const board = active(fresh(), 1, IDS.m2Instance, "paused");
    const step = nextStep(board, { tapsToday: 0, resting: true });
    expect(step).toMatchObject({ kind: "resting", checksIn: false });
    expect(nextHeadline(step!)).toBe("กำลังพัก");
    expect(nextLine(step!)).toBe("ต้นไม้ไม่เหี่ยว ไม่มีอะไรหาย แตะเพื่อกลับมาทำต่อ");
    expect(nextStep(fresh(), { tapsToday: 0, resting: true })).toMatchObject({ kind: "resting", ref: null });
  });

  it("is null once all seven are passed and nothing is open", () => {
    let board = fresh();
    for (const m of [1, 2, 3, 4, 5, 6, 7]) board = withMain(board, m, { done: true });
    expect(nextStep(board, OPEN_DAY)).toBeNull();
  });

  it("names a side quest as one", () => {
    const board = makeBoard();
    // The fixture's keynote is the side quest a mentor asked more about.
    const step = nextStep(board, DONE_DAY);
    expect(step).toMatchObject({ kind: "answer", ref: { kind: "side", templateId: IDS.sideVoices }, milestone: null });
    expect(nextLine({ ...step!, feedback: null })).toBe("เควสต์เสริม");
  });
});
