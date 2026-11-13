/**
 * A quest board (shift_quest_board) for tests: the shape the database
 * returns, with made-up titles. Lives outside __tests__ so Jest does not take
 * it for a test file.
 */
import type { BoardMain, BoardSide, QuestBoard, QuestMine } from "@/lib/supabase/shift-quests/types";

export const SIDE_IDS = [
  "5a1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e01",
  "5a1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e02",
  "5a1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e03",
  "5a1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e04",
] as const;

export const INSTANCE_ID = "6b1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e11";

export function mine(state: QuestMine["state"], instance = INSTANCE_ID): QuestMine {
  return { instance_id: instance, state, version: 1, updated_at: "2026-11-13T03:00:00Z", latest_submission: null, latest_review: null };
}

export function main(n: number, over: Partial<BoardMain> = {}): BoardMain {
  return {
    milestone: n,
    template_id: `00000000-0000-4000-8000-00000000000${n}`,
    slug: `main-${n}`,
    title: `หลัก ${n}`,
    purpose: `เป้าของขั้น ${n}`,
    evidence_criteria: "ลิงก์หรือคำอธิบายสิ่งที่ทำ",
    reflection_prompt: "ตอนนี้ทำอะไรได้",
    done: false,
    in_flight: null,
    mine: null,
    ...over,
  };
}

export function side(k: number, over: Partial<BoardSide> = {}): BoardSide {
  return {
    template_id: SIDE_IDS[k],
    slug: `side-${k}`,
    title: `เสริม ${k}`,
    purpose: `เป้าของเควสต์เสริม ${k}`,
    examples: "",
    evidence_criteria: "ลิงก์ที่เปิดได้จริง",
    reflection_prompt: "อะไรที่ไม่เป็นอย่างที่คิด",
    route_keys: null,
    route_match: true,
    branch_of: 1,
    requires_milestones: [1],
    requires_slugs: [],
    icon: null,
    repeatable: false,
    sort_order: 100 + k,
    locked: false,
    missing_milestones: [],
    missing_slugs: [],
    approved: false,
    mine: null,
    ...over,
  };
}

/**
 * A project at stage 2 (1 and 2 passed), main quests 1 to 7, and four side
 * quests: two open to take, one in progress (the caller's), one locked
 * behind main quest 3.
 */
export function boardFixture(over: Partial<QuestBoard> = {}): QuestBoard {
  return {
    project: { id: "p", route: "software", stage: 2, milestones_done: [1, 2] },
    main: [1, 2, 3, 4, 5, 6, 7].map((n) => main(n, { done: n <= 2 })),
    side: [
      side(0),
      side(1, { mine: mine("active") }),
      side(2, { locked: true, requires_milestones: [3], missing_milestones: [3] }),
      side(3, { route_match: false }),
    ],
    proposed: [],
    help_open: [],
    ...over,
  };
}
