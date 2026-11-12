/**
 * A quest board for the island UI tests with every tile status on it:
 * main 1..7 are available, active, done, held, submitted, declined, paused;
 * side quests are clarification (the keynote), locked and appealed; plus the
 * community side quest and one proposed quest.
 */
import type { BoardMain, BoardSide, QuestBoard, QuestMine } from "@/lib/supabase/shift-quests/types";

export const IDS = {
  m2Instance: "11111111-1111-4111-8111-000000000002",
  m4Instance: "11111111-1111-4111-8111-000000000004",
  m5Instance: "11111111-1111-4111-8111-000000000005",
  m6Instance: "11111111-1111-4111-8111-000000000006",
  m7Instance: "11111111-1111-4111-8111-000000000007",
  sideVoices: "22222222-2222-4222-8222-000000000001",
  sidePhone: "22222222-2222-4222-8222-000000000002",
  sideCut: "22222222-2222-4222-8222-000000000003",
  sideFriend: "22222222-2222-4222-8222-000000000004",
  sideVoicesInstance: "33333333-3333-4333-8333-000000000001",
  sideCutInstance: "33333333-3333-4333-8333-000000000003",
  proposed: "44444444-4444-4444-8444-000000000001",
};

export const MAIN_TITLES = [
  "หาเรื่องที่อยากแก้",
  "ลงมือสร้างชิ้นแรก",
  "ให้คนจริงลอง",
  "เปิดประตูให้คนเข้าใจ",
  "ส่งต่อกุญแจ",
  "เดินทางต่อ",
  "จุดตะเกียงให้คนอื่น",
];

/** The starter templates' real slugs (migration 20261111090500), so questGuide finds each main quest. */
export const MAIN_SLUGS = [
  "find-something-worth-fixing",
  "make-it-exist",
  "let-reality-surprise-you",
  "give-them-a-reason-to-return",
  "take-the-keys",
  "help-another-builder-move",
  "improve-our-community",
];

function mine(instance: string, state: QuestMine["state"], extra: Partial<QuestMine> = {}): QuestMine {
  return {
    instance_id: instance,
    state,
    version: 3,
    updated_at: "2026-11-10T08:00:00Z",
    latest_submission: null,
    latest_review: null,
    ...extra,
  };
}

function main(milestone: number, extra: Partial<BoardMain> = {}): BoardMain {
  return {
    milestone,
    template_id: `00000000-0000-4000-8000-00000000000${milestone}`,
    slug: MAIN_SLUGS[milestone - 1],
    title: MAIN_TITLES[milestone - 1],
    purpose: `จุดประสงค์ของขั้นที่ ${milestone}`,
    evidence_criteria: `หลักฐานของขั้นที่ ${milestone}`,
    reflection_prompt: `คำถามของขั้นที่ ${milestone}`,
    done: false,
    in_flight: null,
    mine: null,
    ...extra,
  };
}

function side(extra: Partial<BoardSide> & Pick<BoardSide, "template_id" | "slug" | "title">): BoardSide {
  return {
    purpose: "จุดประสงค์ของเควสต์เสริม",
    examples: "",
    evidence_criteria: "หลักฐานของเควสต์เสริม",
    reflection_prompt: "คำถามของเควสต์เสริม",
    route_keys: null,
    route_match: true,
    branch_of: 1,
    requires_milestones: [],
    requires_slugs: [],
    icon: "compass",
    repeatable: false,
    sort_order: 110,
    locked: false,
    missing_milestones: [],
    missing_slugs: [],
    approved: false,
    mine: null,
    ...extra,
  };
}

export function makeBoard(): QuestBoard {
  return {
    project: { id: "55555555-5555-4555-8555-000000000001", route: "software", stage: 1, milestones_done: [3] },
    main: [
      main(1),
      main(2, {
        in_flight: { instance_id: IDS.m2Instance, state: "active", version: 2, mine: true, owner: null },
        mine: mine(IDS.m2Instance, "active", { updated_at: "2026-11-09T08:00:00Z" }),
      }),
      main(3, { done: true }),
      main(4, { in_flight: { instance_id: IDS.m4Instance, state: "active", version: 1, mine: false, owner: "มิ้นต์" } }),
      main(5, {
        in_flight: { instance_id: IDS.m5Instance, state: "submitted", version: 4, mine: true, owner: null },
        mine: mine(IDS.m5Instance, "submitted"),
      }),
      main(6, {
        mine: mine(IDS.m6Instance, "declined", {
          latest_review: { outcome: "declined", feedback: "ลองเล่าให้ชัดขึ้นว่าใครใช้", created_at: "2026-11-08T08:00:00Z" },
        }),
      }),
      main(7, {
        in_flight: { instance_id: IDS.m7Instance, state: "paused", version: 1, mine: true, owner: null },
        mine: mine(IDS.m7Instance, "paused"),
      }),
    ],
    side: [
      side({
        template_id: IDS.sideVoices,
        slug: "side-five-voices",
        title: "ฟังเสียงจริงอีก 5 คน",
        examples: "เช่น คุยกับเพื่อนต่างห้อง",
        mine: mine(IDS.sideVoicesInstance, "clarification", {
          latest_review: { outcome: "clarification", feedback: "ขอรูปหรือโน้ตเพิ่มอีกนิด", created_at: "2026-11-10T09:00:00Z" },
        }),
      }),
      side({
        template_id: IDS.sidePhone,
        slug: "side-open-on-phone",
        title: "ให้คนอื่นเปิดได้จากมือถือ",
        branch_of: 2,
        route_keys: ["software"],
        icon: "gear",
        requires_milestones: [2],
        locked: true,
        missing_milestones: [2],
        sort_order: 120,
      }),
      side({
        template_id: IDS.sideCut,
        slug: "side-thirty-second-cut",
        title: "ตัวอย่าง 30 วินาที",
        branch_of: 2,
        route_keys: ["creative"],
        route_match: false,
        icon: "paint",
        sort_order: 140,
        mine: mine(IDS.sideCutInstance, "appealed"),
      }),
      side({
        template_id: IDS.sideFriend,
        slug: "side-review-a-friend",
        title: "ช่วยดูงานเพื่อนหนึ่งชิ้น",
        branch_of: 6,
        icon: "heart",
        repeatable: true,
        sort_order: 200,
      }),
    ],
    proposed: [
      {
        ...mine(IDS.proposed, "active", { version: 5, updated_at: "2026-11-01T08:00:00Z" }),
        title: "ทำแผนที่ร้านอาหารในซอย",
        goal: "ให้เพื่อนหาร้านใกล้โรงเรียนได้",
        criteria: "มีแผนที่ที่เพื่อนสามคนใช้ได้",
      },
    ],
    help_open: [
      { id: "66666666-6666-4666-8666-000000000001", instance_id: IDS.m2Instance, status: "open", visibility: "community", created_at: "2026-11-10T10:00:00Z" },
    ],
  };
}

/** The same board before any side quest is published (production may start this way). */
export function withoutSideQuests(board: QuestBoard): QuestBoard {
  return { ...board, side: [] };
}
