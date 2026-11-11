import {
  helpFor,
  keynoteQuest,
  mainTileStatus,
  missingTitles,
  proposedTileStatus,
  sideTileStatus,
  starterQuest,
} from "../board";
import type { BoardMain, BoardProposed, BoardSide, QuestBoard, QuestMine, QuestState } from "../types";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function mine(state: QuestState, updatedAt = "2026-11-10T10:00:00Z", id = uuid(900)): QuestMine {
  return { instance_id: id, state, version: 2, updated_at: updatedAt, latest_submission: null, latest_review: null };
}

function main(milestone: number, over: Partial<BoardMain> = {}): BoardMain {
  return {
    milestone,
    template_id: uuid(milestone),
    slug: `m${milestone}`,
    title: `Main ${milestone}`,
    purpose: "",
    evidence_criteria: "",
    reflection_prompt: "",
    done: false,
    in_flight: null,
    mine: null,
    ...over,
  };
}

function side(slug: string, over: Partial<BoardSide> = {}): BoardSide {
  return {
    template_id: uuid(100 + slug.length),
    slug,
    title: `Side ${slug}`,
    purpose: "",
    examples: "",
    evidence_criteria: "",
    reflection_prompt: "",
    route_keys: null,
    route_match: true,
    branch_of: 1,
    requires_milestones: [],
    requires_slugs: [],
    icon: null,
    repeatable: false,
    sort_order: 110,
    locked: false,
    missing_milestones: [],
    missing_slugs: [],
    approved: false,
    mine: null,
    ...over,
  };
}

function proposed(state: QuestState, over: Partial<BoardProposed> = {}): BoardProposed {
  return { ...mine(state), title: "Mine", goal: "", criteria: "", ...over };
}

function board(over: Partial<QuestBoard> = {}): QuestBoard {
  return { project: null, main: [], side: [], proposed: [], help_open: [], ...over };
}

describe("mainTileStatus", () => {
  it("is held when a teammate holds the milestone, whatever else is true", () => {
    const inFlight = { instance_id: uuid(1), state: "active" as const, version: 1, mine: false, owner: "Ploy" };
    expect(mainTileStatus(main(1, { in_flight: inFlight }))).toBe("held");
    expect(mainTileStatus(main(1, { in_flight: inFlight, done: true }))).toBe("held");
  });

  it.each(["active", "paused", "submitted", "clarification", "appealed"] as const)(
    "shows the caller's own in-flight state %s",
    (state) => {
      const inFlight = { instance_id: uuid(1), state, version: 1, mine: true, owner: "Me" };
      expect(mainTileStatus(main(1, { in_flight: inFlight, mine: mine(state) }))).toBe(state);
    }
  );

  it("is done, declined or available otherwise", () => {
    expect(mainTileStatus(main(1, { done: true }))).toBe("done");
    expect(mainTileStatus(main(1, { mine: mine("declined") }))).toBe("declined");
    expect(mainTileStatus(main(1, { mine: mine("approved") }))).toBe("available");
    expect(mainTileStatus(main(1))).toBe("available");
  });
});

describe("sideTileStatus", () => {
  it("is locked first, even with an instance", () => {
    expect(sideTileStatus(side("a", { locked: true, mine: mine("active") }))).toBe("locked");
  });

  it.each(["active", "paused", "submitted", "clarification", "appealed"] as const)("shows the open state %s", (state) => {
    expect(sideTileStatus(side("a", { mine: mine(state), approved: true }))).toBe(state);
  });

  it("is done when approved in the project, then declined, then available", () => {
    expect(sideTileStatus(side("a", { approved: true }))).toBe("done");
    expect(sideTileStatus(side("a", { approved: true, mine: mine("approved") }))).toBe("done");
    expect(sideTileStatus(side("a", { mine: mine("declined") }))).toBe("declined");
    expect(sideTileStatus(side("a"))).toBe("available");
  });
});

describe("proposedTileStatus", () => {
  it("maps approved to done and keeps every other state", () => {
    expect(proposedTileStatus(proposed("approved"))).toBe("done");
    expect(proposedTileStatus(proposed("declined"))).toBe("declined");
    for (const state of ["active", "paused", "submitted", "clarification", "appealed"] as const) {
      expect(proposedTileStatus(proposed(state))).toBe(state);
    }
  });
});

describe("keynoteQuest", () => {
  it("is null when the caller has nothing open", () => {
    expect(keynoteQuest(board())).toBeNull();
    expect(keynoteQuest(board({ main: [main(1, { done: true })], side: [side("a")] }))).toBeNull();
  });

  it("never picks a quest a teammate holds, or one under appeal", () => {
    const held = main(2, {
      in_flight: { instance_id: uuid(2), state: "clarification", version: 1, mine: false, owner: "Ploy" },
      mine: mine("clarification"),
    });
    const appealed = side("a", { mine: mine("appealed") });
    expect(keynoteQuest(board({ main: [held], side: [appealed] }))).toBeNull();
  });

  it("ranks clarification, then active, then paused, then submitted", () => {
    const submittedMain = main(1, {
      in_flight: { instance_id: uuid(1), state: "submitted", version: 1, mine: true, owner: "Me" },
      mine: mine("submitted", "2026-11-11T09:00:00Z"),
    });
    const pausedSide = side("p", { mine: mine("paused", "2026-11-11T08:00:00Z") });
    const activeProposal = proposed("active", { instance_id: uuid(50), updated_at: "2026-11-01T00:00:00Z" });
    const clarSide = side("clar", { mine: mine("clarification", "2026-10-01T00:00:00Z") });

    const all = board({ main: [submittedMain], side: [pausedSide, clarSide], proposed: [activeProposal] });
    expect(keynoteQuest(all)).toEqual({ kind: "side", templateId: clarSide.template_id });
    expect(keynoteQuest({ ...all, side: [pausedSide] })).toEqual({ kind: "proposed", instanceId: uuid(50) });
    expect(keynoteQuest({ ...all, side: [pausedSide], proposed: [] })).toEqual({
      kind: "side",
      templateId: pausedSide.template_id,
    });
    expect(keynoteQuest({ ...all, side: [], proposed: [] })).toEqual({ kind: "main", milestone: 1 });
  });

  it("breaks ties by the newest updated_at", () => {
    const older = main(3, {
      in_flight: { instance_id: uuid(3), state: "active", version: 1, mine: true, owner: "Me" },
      mine: mine("active", "2026-11-01T00:00:00Z"),
    });
    const newer = main(5, {
      in_flight: { instance_id: uuid(5), state: "active", version: 1, mine: true, owner: "Me" },
      mine: mine("active", "2026-11-09T00:00:00Z"),
    });
    expect(keynoteQuest(board({ main: [older, newer] }))).toEqual({ kind: "main", milestone: 5 });
    expect(keynoteQuest(board({ main: [newer, older] }))).toEqual({ kind: "main", milestone: 5 });
  });
});

describe("starterQuest", () => {
  it("is the lowest available main quest", () => {
    const held = { instance_id: uuid(1), state: "active" as const, version: 1, mine: false, owner: "Ploy" };
    const b = board({ main: [main(3), main(1, { in_flight: held }), main(2, { done: true }), main(5)] });
    expect(starterQuest(b)).toEqual({ kind: "main", milestone: 3 });
  });

  it("is null when no main quest is available", () => {
    expect(starterQuest(board({ main: [main(1, { done: true })] }))).toBeNull();
    expect(starterQuest(board())).toBeNull();
  });
});

describe("helpFor", () => {
  const help = (id: string, instance: string | null, created: string) => ({
    id,
    instance_id: instance,
    status: "open" as const,
    visibility: "community" as const,
    created_at: created,
  });

  it("finds the newest request for an instance", () => {
    const b = board({
      help_open: [
        help("h1", uuid(9), "2026-11-01T00:00:00Z"),
        help("h2", uuid(9), "2026-11-05T00:00:00Z"),
        help("h3", uuid(8), "2026-11-06T00:00:00Z"),
      ],
    });
    expect(helpFor(b, uuid(9))?.id).toBe("h2");
    expect(helpFor(b, uuid(7))).toBeNull();
  });

  it("never matches a general request to a tile with no instance", () => {
    const b = board({ help_open: [help("h1", null, "2026-11-01T00:00:00Z")] });
    expect(helpFor(b, null)).toBeNull();
  });
});

describe("missingTitles", () => {
  it("names missing main quests by milestone, then missing side quests by slug", () => {
    const b = board({
      main: [main(1), main(2), main(3)],
      side: [side("side-outside-circle", { title: "Outside" })],
    });
    const locked = side("fix", {
      locked: true,
      missing_milestones: [3, 1],
      missing_slugs: ["side-outside-circle", "side-unpublished"],
    });
    expect(missingTitles(b, locked)).toEqual(["Main 1", "Main 3", "Outside", "side-unpublished"]);
  });

  it("falls back to a plain label for a main quest not on the board", () => {
    expect(missingTitles(board(), side("x", { missing_milestones: [4] }))).toEqual(["เควสต์หลักขั้นที่ 4"]);
  });
});
