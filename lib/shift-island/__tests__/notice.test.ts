import { noticePins } from "@/lib/shift-island/notice";
import type { BoardMain, BoardProposed, BoardSide, QuestBoard, QuestMine, QuestState } from "@/lib/supabase/shift-quests/types";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function mine(state: QuestState, updatedAt = "2026-11-10T10:00:00Z", n = 900): QuestMine {
  return { instance_id: uuid(n), state, version: 2, updated_at: updatedAt, latest_submission: null, latest_review: null };
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

/** A main quest the caller has open, in `state`. */
const ownMain = (milestone: number, state: QuestState, at = "2026-11-10T10:00:00Z") =>
  main(milestone, {
    in_flight: { instance_id: uuid(500 + milestone), state, version: 1, mine: true, owner: "Me" },
    mine: mine(state, at, 500 + milestone),
  });

function side(n: number, over: Partial<BoardSide> = {}): BoardSide {
  return {
    template_id: uuid(100 + n),
    slug: `s${n}`,
    title: `Side ${n}`,
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
    sort_order: 100 + n,
    locked: false,
    missing_milestones: [],
    missing_slugs: [],
    approved: false,
    mine: null,
    ...over,
  };
}

function proposed(n: number, state: QuestState, over: Partial<BoardProposed> = {}): BoardProposed {
  return { ...mine(state, "2026-11-10T10:00:00Z", 700 + n), title: `Own ${n}`, goal: "", criteria: "", ...over };
}

const board = (over: Partial<QuestBoard> = {}): QuestBoard => ({
  project: { id: "p1", route: "software", stage: 1, milestones_done: [] },
  main: [],
  side: [],
  proposed: [],
  help_open: [],
  ...over,
});

const pins = (b: QuestBoard | null, limit?: number) => noticePins(b, limit).map((p) => [p.kind, p.title]);

describe("noticePins", () => {
  it("is empty without a board", () => {
    expect(noticePins(null)).toEqual([]);
  });

  it("pins in-progress quests first, then available main quests, then available side quests", () => {
    const b = board({
      main: [main(3), main(2), ownMain(1, "active")],
      side: [side(1)],
    });
    expect(pins(b)).toEqual([
      ["active", "Main 1"],
      ["main", "Main 2"],
      ["main", "Main 3"],
    ]);
    expect(pins(b, 5)).toEqual([
      ["active", "Main 1"],
      ["main", "Main 2"],
      ["main", "Main 3"],
      ["side", "Side 1"],
    ]);
  });

  it("orders own quests as the keynote does, then appealed last, ties to the newest", () => {
    const b = board({
      main: [ownMain(1, "submitted", "2026-11-11T09:00:00Z"), ownMain(4, "active", "2026-11-01T00:00:00Z")],
      side: [
        side(1, { mine: mine("appealed", "2026-11-11T12:00:00Z", 801) }),
        side(2, { mine: mine("clarification", "2026-10-01T00:00:00Z", 802) }),
        side(3, { mine: mine("paused", "2026-11-11T08:00:00Z", 803) }),
      ],
      proposed: [proposed(1, "active", { updated_at: "2026-11-05T00:00:00Z" })],
    });
    expect(pins(b, 10)).toEqual([
      ["active", "Side 2"], // clarification
      ["active", "Own 1"], // active, newer
      ["active", "Main 4"], // active, older
      ["active", "Side 3"], // paused
      ["active", "Main 1"], // submitted
      ["active", "Side 1"], // appealed
    ]);
  });

  it("keeps the first three", () => {
    const b = board({ main: [main(1), main(2), main(3), main(4)], side: [side(1)] });
    expect(pins(b)).toEqual([
      ["main", "Main 1"],
      ["main", "Main 2"],
      ["main", "Main 3"],
    ]);
    expect(noticePins(b, 0)).toEqual([]);
  });

  it("orders available side quests by sort_order", () => {
    const b = board({ side: [side(1, { sort_order: 300 }), side(2, { sort_order: 100 }), side(3, { sort_order: 200 })] });
    expect(pins(b)).toEqual([
      ["side", "Side 2"],
      ["side", "Side 3"],
      ["side", "Side 1"],
    ]);
  });

  it("never pins locked, held, done or declined proposed quests", () => {
    const held = main(2, {
      in_flight: { instance_id: uuid(2), state: "active", version: 1, mine: false, owner: "Ploy" },
      mine: null,
    });
    const b = board({
      main: [main(1, { done: true }), held],
      side: [
        side(1, { locked: true }),
        side(2, { locked: true, mine: mine("active", undefined, 802) }),
        side(3, { approved: true }),
      ],
      proposed: [proposed(1, "approved"), proposed(2, "declined")],
    });
    expect(noticePins(b)).toEqual([]);
  });

  it("pins declined main and side quests with the available ones: their page starts a fresh attempt", () => {
    const b = board({
      main: [main(4), main(3, { mine: mine("declined") })],
      side: [side(2), side(1, { mine: mine("declined", undefined, 801) })],
    });
    expect(pins(b, 4)).toEqual([
      ["main", "Main 3"],
      ["main", "Main 4"],
      ["side", "Side 1"],
      ["side", "Side 2"],
    ]);
  });

  it("pins each quest once, with its ref", () => {
    const b = board({ main: [ownMain(1, "active"), main(2)], side: [side(1, { mine: mine("paused", undefined, 801) })] });
    expect(noticePins(b)).toEqual([
      { ref: { kind: "main", milestone: 1 }, kind: "active", title: "Main 1" },
      { ref: { kind: "side", templateId: uuid(101) }, kind: "active", title: "Side 1" },
      { ref: { kind: "main", milestone: 2 }, kind: "main", title: "Main 2" },
    ]);
  });
});
