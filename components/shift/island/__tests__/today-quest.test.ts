import { keynoteQuest } from "@/lib/supabase/shift-quests/board";
import type { QuestBoard } from "@/lib/supabase/shift-quests/types";

import { IDS, MAIN_TITLES, makeBoard } from "../__fixtures__/board";
import { keynoteMode, todayQuest } from "../model";

/** The fixture board with only the given main quest still open, everything else untouched. */
function onlyMain(milestone: number, state: "active" | "submitted"): QuestBoard {
  const board = makeBoard();
  return {
    ...board,
    side: board.side.map((s) => ({ ...s, mine: null })),
    proposed: [],
    main: board.main.map((m) => {
      if (m.milestone === milestone) {
        const id = `11111111-1111-4111-8111-00000000000${milestone}`;
        return { ...m, in_flight: { instance_id: id, state, version: 1, mine: true, owner: null }, mine: m.mine && { ...m.mine, instance_id: id, state } };
      }
      return { ...m, in_flight: null, mine: null };
    }),
  };
}

describe("keynoteMode", () => {
  it("starts with nothing open, waits on work at a mentor, else goes on", () => {
    expect(keynoteMode(null, "available")).toBe("start");
    expect(keynoteMode({ kind: "main", milestone: 5 }, "submitted")).toBe("waiting");
    expect(keynoteMode({ kind: "main", milestone: 2 }, "active")).toBe("next");
    expect(keynoteMode({ kind: "main", milestone: 2 }, "clarification")).toBe("next");
  });
});

describe("todayQuest", () => {
  it("is the keynote quest, with the caller's own instance for the day's line", () => {
    const board = makeBoard();
    const quest = todayQuest(board, keynoteQuest(board));
    expect(quest).toEqual({
      ref: { kind: "side", templateId: IDS.sideVoices },
      title: "ฟังเสียงจริงอีก 5 คน",
      mode: "next",
      instanceId: IDS.sideVoicesInstance,
    });
  });

  it("says waiting when the only open quest is with a mentor", () => {
    const board = onlyMain(5, "submitted");
    expect(todayQuest(board, keynoteQuest(board))).toMatchObject({ mode: "waiting", title: MAIN_TITLES[4] });
  });

  it("with nothing open, is the first quest to start, with no instance to file under", () => {
    const board = onlyMain(2, "active");
    const idle = { ...board, main: board.main.map((m) => ({ ...m, in_flight: null, mine: null })) };
    expect(keynoteQuest(idle)).toBeNull();
    expect(todayQuest(idle, null)).toEqual({ ref: { kind: "main", milestone: 1 }, title: MAIN_TITLES[0], mode: "start", instanceId: null });
  });

  it("is null when there is neither an open quest nor one to start", () => {
    const board = makeBoard();
    const done = { ...board, side: [], proposed: [], main: board.main.map((m) => ({ ...m, in_flight: null, mine: null, done: true })) };
    expect(todayQuest(done, keynoteQuest(done))).toBeNull();
  });
});
