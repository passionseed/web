/**
 * Quest guides and the canvas-link contract for /shift/island (wave 3).
 *
 * A student links their quest project to one SHIFT project canvas on the
 * whiteboard (docs/features/whiteboard.md, "SHIFT project canvas and note
 * versions"). Each quest then reads the zones that matter to it: context rows
 * for "สำหรับโปรเจกต์คุณ", hints for "เสร็จเมื่อ" (a mentor still decides), and
 * the notes a quest card may carry. No AI anywhere.
 *
 * Client-safe and pure: types and config only. Thai labels are DRAFTS for the
 * founder's review; they pass lintText (lib/marketing/copyRules.ts), carry no
 * emoji (those come from SHIFT_CARDS so they match the whiteboard) and never
 * say "pivot" (shortTitle gives เปลี่ยนแผน).
 */
import type { BoardRef } from "@/lib/supabase/shift-quests/board";
import { shortTitle, type ShiftCardKind } from "@/lib/whiteboard/shift-cards";

export type CanvasLinkState = { linked: false } | { linked: true; linkedAt: string };

export interface QuestGuideItem {
  id: string;
  label: string;
}

export interface QuestGuide {
  /** Zones whose notes the quest card may use; [] means line and link only (SubmitForm). */
  zones: ShiftCardKind[];
  /** At most 3. */
  checklist: QuestGuideItem[];
  /** Main quests only (side quests use the board's examples). */
  examples: string[];
}

export interface CanvasChoice {
  boardId: string;
  frameId: string;
  title: string;
  boardTitle: string;
  role: "owner" | "team";
  lastEdited: number | null;
  notes: number;
  versions: number;
  linked: boolean;
}

export interface ContextRow {
  kind: ShiftCardKind;
  label: string;
  text: string | null;
  version: number | null;
  count: number | null;
}

export interface ChecklistHint {
  id: string;
  hinted: boolean;
  detail: string | null;
}

export interface PickableNote {
  id: string;
  kind: ShiftCardKind;
  day: number | null;
  zoneTitle: string;
  /** The note's own text (line breaks kept), capped at 2000. */
  text: string;
  version: number | null;
  editedSinceVersion: boolean;
  /** Newest first, at most 3. */
  history: { v: number; why: string | null }[];
  byTeam: boolean;
  pii: boolean;
  hash: string;
}

export type QuestCanvasContext =
  | { state: "unlinked" }
  | { state: "no_zones" }
  | { state: "not_yours" }
  | { state: "error" }
  | { state: "gone"; candidates: CanvasChoice[] }
  | {
      state: "ready";
      canvas: { title: string; boardTitle: string; lastEdited: number | null };
      context: ContextRow[];
      hints: ChecklistHint[];
      notes: PickableNote[];
    };

export interface QuestCardTarget {
  ref: BoardRef;
  slug: string | null;
  title: string;
  reflectionPrompt: string;
  version: number | null;
  resubmit: boolean;
}

export const CARD_LIMITS = { notes: 8, line: 2000, link: 500, evidence: 2000, noteChars: 400, why: 140 } as const;

// ---------------------------------------------------------------------------
// Guide config (pure data; buildContext in canvas-snapshot.ts evaluates it)
// ---------------------------------------------------------------------------

/** The seven main quests by milestone (supabase/migrations/20261111090500_shift_quests_starter_templates.sql). */
export const MAIN_SLUGS: Readonly<Record<number, string>> = {
  1: "find-something-worth-fixing",
  2: "make-it-exist",
  3: "let-reality-surprise-you",
  4: "give-them-a-reason-to-return",
  5: "take-the-keys",
  6: "help-another-builder-move",
  7: "improve-our-community",
};

/** When a checklist item lights up as a hint, from the notes on the linked canvas. */
export type HintRule =
  | { rule: "written"; zone: ShiftCardKind }
  | { rule: "count"; zone: ShiftCardKind; min: number }
  | { rule: "version"; zone: ShiftCardKind; min: number }
  | { rule: "any"; of: HintRule[] };

/** One "สำหรับโปรเจกต์คุณ" row: the zone's latest note (with its version), or how many notes it has. */
export interface ContextSpec {
  zone: ShiftCardKind;
  label: string;
  show: "note" | "count";
}

export interface GuideItemSpec extends QuestGuideItem {
  hint: HintRule | null;
}

export interface GuideSpec {
  zones: ShiftCardKind[];
  context: ContextSpec[];
  checklist: GuideItemSpec[];
  examples: string[];
}

const written = (zone: ShiftCardKind): HintRule => ({ rule: "written", zone });
const atLeast = (zone: ShiftCardKind, min: number): HintRule => ({ rule: "count", zone, min });
const versionAtLeast = (zone: ShiftCardKind, min: number): HintRule => ({ rule: "version", zone, min });
const anyOf = (...of: HintRule[]): HintRule => ({ rule: "any", of });

const MAIN_GUIDES: Readonly<Record<string, GuideSpec>> = {
  "find-something-worth-fixing": {
    zones: ["problem", "target", "interview"],
    context: [
      { zone: "problem", label: "ปัญหาตอนนี้", show: "note" },
      { zone: "target", label: "คนที่เจอ", show: "note" },
      { zone: "interview", label: "สัมภาษณ์", show: "count" },
    ],
    checklist: [
      { id: "m1-problem", label: "เขียนปัญหาที่เลือก", hint: written("problem") },
      { id: "m1-target", label: "รู้ว่าใครเจอปัญหานี้", hint: written("target") },
      { id: "m1-talked", label: "คุยหรือสังเกตคนจริงอย่างน้อย 1 คน", hint: atLeast("interview", 1) },
    ],
    examples: [
      "คุยกับเพื่อน 3 คนเรื่องการจัดตารางอ่านหนังสือ แล้วเลือกปัญหาที่เจอซ้ำ",
      "ดูว่าคนในกลุ่มเกมที่ชอบ พูดถึงเรื่องไหนบ่อย",
    ],
  },
  "make-it-exist": {
    zones: ["idea", "ship"],
    context: [
      { zone: "problem", label: "ปัญหาที่แก้", show: "note" },
      { zone: "idea", label: "ไอเดีย", show: "note" },
      { zone: "ship", label: "ปล่อยแล้ว", show: "note" },
    ],
    checklist: [
      { id: "m2-idea", label: "มีไอเดียที่บอกว่าแก้ปัญหาข้อไหน", hint: written("idea") },
      { id: "m2-ship", label: "มีชิ้นงานที่คนอื่นลองได้", hint: written("ship") },
      { id: "m2-why", label: "บอกเหตุผลของการตัดสินใจหลัก", hint: null },
    ],
    examples: [
      "หน้าเว็บที่คำนวณค่าใช้จ่ายทริปได้หนึ่งแบบ",
      "ด่านแรกของเกมที่เล่นจบได้ใน 2 นาที",
      "ออกแบบโพสต์ให้ร้านแถวบ้านหนึ่งชิ้น",
    ],
  },
  "let-reality-surprise-you": {
    zones: ["test", "pivot"],
    context: [
      { zone: "target", label: "ลองกับ", show: "note" },
      { zone: "idea", label: "สิ่งที่จะให้ลอง", show: "note" },
      { zone: "test", label: "ทดสอบ", show: "count" },
    ],
    checklist: [
      { id: "m3-tested", label: "มีคนจริงลองงานของคุณ", hint: atLeast("test", 1) },
      { id: "m3-surprise", label: "จดสิ่งที่ไม่ตรงกับที่คิด", hint: null },
      { id: "m3-change", label: "บอกว่าจะเปลี่ยนอะไร", hint: anyOf(atLeast("pivot", 1), versionAtLeast("idea", 2)) },
    ],
    examples: [
      "ให้เพื่อนต่างห้อง 3 คนลองใช้แอป แล้วจดว่าติดตรงไหน",
      "เปิดเพลงให้คนฟัง แล้วถามว่าจำท่อนไหนได้",
    ],
  },
  "give-them-a-reason-to-return": {
    zones: ["test", "pivot"],
    context: [
      { zone: "ship", label: "งานตอนนี้", show: "note" },
      { zone: "test", label: "ผลทดสอบล่าสุด", show: "note" },
      { zone: "pivot", label: "เปลี่ยนแผน", show: "count" },
    ],
    checklist: [
      { id: "m4-tweak", label: "ลองปรับหนึ่งอย่าง", hint: anyOf(atLeast("pivot", 1), versionAtLeast("ship", 2)) },
      { id: "m4-return", label: "ดูว่าใครกลับมา", hint: atLeast("test", 1) },
      { id: "m4-learned", label: "บอกสิ่งที่เรียนรู้ ถึงไม่มีใครกลับมาก็นับ", hint: null },
    ],
    examples: [
      "เพิ่มการแจ้งเตือนที่ผู้ใช้เลือกเปิดเองได้ แล้วดูว่าใครกลับมาใช้ใน 1 สัปดาห์",
      "ทำด่านใหม่ แล้วชวนคนที่เคยเล่นกลับมาลอง",
    ],
  },
  // Quests 5 to 7: line and link only, no canvas zones. Quest 5's checklist is
  // the ownership checklist ticked in Discord (/project ownership): the quest
  // page shows it read-only and lights m5-checked from it, and the submit
  // snapshots it (lib/shift-island/ownership.ts), so its hint here is null.
  "take-the-keys": {
    zones: [],
    context: [],
    checklist: [
      { id: "m5-checked", label: "ผลเช็กลิสต์ /project ownership ทีละข้อ", hint: null },
      { id: "m5-open", label: "เรื่องที่ยังแก้ไม่ได้", hint: null },
      { id: "m5-secrets", label: "ไม่มีรหัสผ่าน โทเคน หรือภาพหน้าจอบัญชีส่วนตัว", hint: null },
    ],
    examples: [
      "ย้ายโค้ดไปไว้ในบัญชี GitHub ของตัวเอง",
      "เช็กว่าเพลงหรือภาพที่ใช้ มีสิทธิ์ใช้ต่อได้ไหม",
      "ตกลงกับทีมว่าถ้ามีคนออก งานจะเป็นยังไง",
    ],
  },
  "help-another-builder-move": {
    zones: [],
    context: [],
    checklist: [
      { id: "m6-helped", label: "บอกว่าช่วยเพื่อนเรื่องอะไร", hint: null },
      { id: "m6-now", label: "ตอนนี้เพื่อนทำอะไรได้เอง", hint: null },
      { id: "m6-confirm", label: "ให้เพื่อนยืนยันได้ ถ้าเขายินดี", hint: null },
    ],
    examples: [
      "นั่งดูบั๊กกับเพื่อนจนเขาแก้เองได้",
      "เป็นผู้ทดสอบให้โปรเจกต์ของเพื่อน แล้วสรุปสิ่งที่เห็น",
    ],
  },
  "improve-our-community": {
    zones: [],
    context: [],
    checklist: [
      { id: "m7-what", label: "สิ่งที่คุณปรับ", hint: null },
      { id: "m7-who", label: "ใครได้ประโยชน์", hint: null },
      { id: "m7-how", label: "รู้ได้ยังไงว่ามันช่วย", hint: null },
    ],
    examples: [
      "เขียนคู่มือ deploy ฉบับสั้น ที่เพื่อนลองทำตามแล้วใช้ได้",
      "เสนอเควสต์ใหม่ แล้วให้คนอื่นลองทำ",
    ],
  },
};

/** Side quests that read the canvas; every other side quest is line and link only. */
const SIDE_ZONES: Readonly<Record<string, ShiftCardKind[]>> = {
  "side-five-voices": ["interview", "target"],
  "side-outside-circle": ["test"],
  "side-fix-one-thing": ["test", "pivot"],
  "side-open-on-phone": ["ship", "idea"],
  "side-thirty-second-cut": ["ship", "idea"],
  "side-clear-offer": ["ship", "idea"],
  "side-demo-three-minutes": ["problem", "idea", "ship"],
};

/** The side quest slugs that read the canvas (for tests and docs). */
export const CANVAS_SIDE_SLUGS: readonly string[] = Object.keys(SIDE_ZONES);

const EMPTY_SPEC: GuideSpec = { zones: [], context: [], checklist: [], examples: [] };

/**
 * The full guide of a quest: zones, context rows, checklist with hint rules,
 * examples. Unknown slugs and proposed quests get the empty guide (line and
 * link only, and quest-page shows evidence_criteria as the checklist).
 */
export function questGuideSpec(q: { kind: BoardRef["kind"]; slug: string | null }): GuideSpec {
  if (q.kind === "proposed" || !q.slug) return EMPTY_SPEC;
  if (q.kind === "main") return Object.hasOwn(MAIN_GUIDES, q.slug) ? MAIN_GUIDES[q.slug] : EMPTY_SPEC;
  if (!Object.hasOwn(SIDE_ZONES, q.slug)) return EMPTY_SPEC;
  const zones = SIDE_ZONES[q.slug];
  return {
    zones,
    // Side rows show each zone's latest note.
    context: zones.map((zone) => ({ zone, label: shortTitle(zone), show: "note" as const })),
    checklist: [],
    examples: [],
  };
}

/** What a quest asks of the canvas, as the quest page shows it. */
export function questGuide(q: { kind: BoardRef["kind"]; slug: string | null }): QuestGuide {
  const spec = questGuideSpec(q);
  return {
    zones: [...spec.zones],
    checklist: spec.checklist.map(({ id, label }) => ({ id, label })),
    examples: [...spec.examples],
  };
}

/**
 * The checklist hint's one-line detail (DRAFT copy), only where it adds a
 * number: a "written" hint has none. `title` is the zone's Thai short title.
 */
export const HINT_DETAIL = {
  count: (title: string, n: number) => `${title} ${n} ใบ`,
  version: (title: string, v: number) => `${title} v${v}`,
};

/**
 * Refusals from submitQuestCard after which the composer reloads the canvas
 * context (onReload) instead of trusting what it shows.
 */
export const CANVAS_RELOAD_CODES: ReadonlySet<string> = new Set([
  "notes_changed",
  "note_not_allowed",
  "canvas_gone",
  "canvas_not_yours",
  "canvas_unlinked",
]);

/** A canvas whose frame has no name (DRAFT copy). */
export const UNTITLED_CANVAS = "แคนวาสไม่มีชื่อ";

/** A canvas's title: its frame name on one line, or UNTITLED_CANVAS. */
export function canvasTitleOf(name: unknown): string {
  const title = typeof name === "string" ? name.replace(/\s+/g, " ").trim() : "";
  return title || UNTITLED_CANVAS;
}

/** The reflection a quest card stores when the student wrote no line: the database requires one (DRAFT copy). */
export const CARD_REFLECTION_FALLBACK = "ส่งเป็นการ์ดเควสต์ ไม่ได้เขียนเพิ่ม";
