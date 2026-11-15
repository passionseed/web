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

/**
 * Only the time leaves the server, never the board or frame id: the island
 * opens the canvas through CANVAS_ROUTE (lib/shift-island/canvas-link.ts).
 */
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
  /** The id of the note whose text is shown (for "ดูบนแคนวาส"); null for count rows or when there is no note. */
  noteId: string | null;
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

/**
 * The seven main quests by milestone: the pitfall quest map
 * (supabase/migrations/20261115090000_shift_quests_pitfall_map.sql,
 * docs/designs/shift-high-quest-pitfalls.md).
 */
export const MAIN_SLUGS: Readonly<Record<number, string>> = {
  1: "meet-one-real-person",
  2: "real-stories-not-compliments",
  3: "first-partner",
  4: "in-their-hands",
  5: "run-the-loop",
  6: "what-we-learned",
  7: "beyond-the-first",
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
  // Act 1: find your stakeholder.
  "meet-one-real-person": {
    zones: ["target", "interview", "problem"],
    context: [
      { zone: "target", label: "คนที่จะไปคุย", show: "note" },
      { zone: "interview", label: "สัมภาษณ์", show: "count" },
      { zone: "problem", label: "ปัญหาตอนนี้", show: "note" },
    ],
    checklist: [
      { id: "m1-who", label: "ชี้ตัวได้ว่าเป็นใคร เจอที่ไหน", hint: written("target") },
      { id: "m1-talked", label: "คุยกับเขาจริงอย่างน้อย 10 นาที", hint: atLeast("interview", 1) },
      { id: "m1-new", label: "จดสิ่งที่เขาเล่าที่คุณไม่เคยรู้", hint: null },
    ],
    examples: [
      "ไม่ใช่ \"นักเรียน\" แต่เป็น \"นักเรียน ม.6 ที่อ่านหนังสือสอบคนเดียวตอนดึก\"",
      "คุยกับบรรณารักษ์โรงเรียน 15 นาที เรื่องที่นักเรียนหาหนังสือไม่เจอ",
    ],
  },
  "real-stories-not-compliments": {
    zones: ["interview", "problem", "pivot"],
    context: [
      { zone: "interview", label: "สัมภาษณ์", show: "count" },
      { zone: "problem", label: "ปัญหาตอนนี้", show: "note" },
      { zone: "pivot", label: "เปลี่ยนแผน", show: "count" },
    ],
    checklist: [
      { id: "m2-three", label: "คุยครบอย่างน้อย 3 คน", hint: atLeast("interview", 3) },
      { id: "m2-story", label: "มีเรื่องจริงหนึ่งเรื่อง: ครั้งล่าสุดที่มันเกิดขึ้น", hint: null },
      {
        id: "m2-belief",
        label: "บอกสิ่งที่เคยเชื่อแต่ตอนนี้ไม่แน่ใจ",
        hint: anyOf(versionAtLeast("problem", 2), atLeast("pivot", 1)),
      },
    ],
    examples: [
      "แทนที่จะถาม \"ถ้ามีแอปนี้จะใช้ไหม\" ให้ถาม \"ครั้งล่าสุดที่ลืมส่งงาน เกิดอะไรขึ้น\"",
      "คุยกับเจ้าของร้าน 3 ร้าน แล้วพบว่าปัญหาจริงไม่ใช่ลูกค้าน้อย แต่คือเตรียมของไม่ทัน",
    ],
  },
  "first-partner": {
    zones: ["target", "interview"],
    context: [
      { zone: "target", label: "คนที่เกี่ยวข้อง", show: "note" },
      { zone: "interview", label: "สัมภาษณ์", show: "count" },
    ],
    checklist: [
      { id: "m3-agreed", label: "พันธมิตรตกลงทำขั้นต่อไปกับคุณ", hint: null },
      { id: "m3-date", label: "มีวันที่ชัดเจน", hint: null },
      { id: "m3-gain", label: "บอกได้ว่าเขาได้อะไรจากการช่วยคุณ", hint: null },
    ],
    examples: [
      "ครูแนะแนวตกลงให้ลองเครื่องมือกับนักเรียน ม.6 หนึ่งห้อง วันศุกร์หน้า",
      "ร้านข้าวหน้าโรงเรียนให้ลองระบบสั่งล่วงหน้าหนึ่งสัปดาห์",
    ],
  },
  // Act 2: build what matters.
  "in-their-hands": {
    zones: ["idea", "ship", "test"],
    context: [
      { zone: "problem", label: "เรื่องที่เขาเล่า", show: "note" },
      { zone: "idea", label: "ไอเดีย", show: "note" },
      { zone: "ship", label: "ปล่อยแล้ว", show: "note" },
    ],
    checklist: [
      { id: "m4-idea", label: "ชิ้นงานแก้เรื่องที่เขาเล่า", hint: written("idea") },
      { id: "m4-ship", label: "มีของที่ลองได้จริง", hint: written("ship") },
      { id: "m4-tried", label: "เขาลองแล้ว และคุณดูอยู่", hint: atLeast("test", 1) },
    ],
    examples: [
      "ซอฟต์แวร์: หน้าเว็บที่ทำได้อย่างเดียว แต่ทำเรื่องที่เขาเล่าได้จริง",
      "งานสร้างสรรค์: ฉากเดียว หรือเพลงท่อนเดียว ให้คนที่เขาพูดถึงลองดู",
      "บริการ: ลองให้บริการจริงหนึ่งครั้งกับพันธมิตร",
    ],
  },
  "run-the-loop": {
    zones: ["test", "pivot", "ship"],
    context: [
      { zone: "ship", label: "งานตอนนี้", show: "note" },
      { zone: "test", label: "ทดสอบ", show: "count" },
      { zone: "pivot", label: "เปลี่ยนแผน", show: "count" },
    ],
    checklist: [
      { id: "m5-rounds", label: "ลองกับคนจริงอย่างน้อย 2 รอบ", hint: atLeast("test", 2) },
      { id: "m5-fixed", label: "บอกว่าแก้อะไรในแต่ละรอบ", hint: anyOf(atLeast("pivot", 1), versionAtLeast("ship", 2)) },
      { id: "m5-compare", label: "ผลก่อนและหลังแก้", hint: null },
    ],
    examples: [
      "รอบแรกคนหาปุ่มสั่งไม่เจอ ย้ายปุ่ม รอบสองทุกคนกดได้ใน 10 วินาที",
      "ท่อนแรกของเพลงยาวไป คนข้าม ตัดเหลือครึ่ง แล้วเปิดให้คนเดิมฟังอีกครั้ง",
    ],
  },
  "what-we-learned": {
    zones: ["pivot", "problem"],
    context: [
      { zone: "problem", label: "ปัญหาตอนนี้", show: "note" },
      { zone: "pivot", label: "เปลี่ยนแผน", show: "count" },
    ],
    checklist: [
      { id: "m6-believed", label: "เคยเชื่ออะไร", hint: null },
      { id: "m6-found", label: "เจออะไรจริง", hint: null },
      { id: "m6-next", label: "จะทำอะไรต่อ", hint: null },
    ],
    examples: [
      "เคยเชื่อว่านักเรียนไม่มีเวลา เจอว่าจริงๆ ไม่รู้ว่าจะเริ่มตรงไหน ต่อไปจะทำแค่หน้าแรกให้ชัด",
      "เล่าให้พันธมิตรฟัง แล้วเขาแนะนำคนที่ควรคุยต่อ",
    ],
  },
  // Act 3: scale.
  "beyond-the-first": {
    zones: ["test", "ship"],
    context: [
      { zone: "ship", label: "งานตอนนี้", show: "note" },
      { zone: "test", label: "ทดสอบ", show: "count" },
    ],
    checklist: [
      { id: "m7-outside", label: "มีคนนอกวงใช้เองได้", hint: null },
      { id: "m7-stuck", label: "จดว่าเขาติดตรงไหน", hint: null },
      { id: "m7-return", label: "ดูว่ามีใครกลับมาเองไหม", hint: null },
    ],
    examples: [
      "ส่งลิงก์ให้ชมรมอื่นในโรงเรียน แล้วดูว่ามีใครใช้จบโดยไม่ถามคุณ",
      "พันธมิตรแนะนำร้านที่สอง และร้านนั้นเริ่มใช้เองได้",
    ],
  },
};

/**
 * Side quests with their own checklist (line and link only). Ownership: its
 * checklist is the one ticked in Discord (/project ownership): the quest page
 * shows it read-only and lights keys-checked from it, and the submit snapshots
 * it (lib/shift-island/ownership.ts), so its hint here is null.
 */
const SIDE_GUIDES: Readonly<Record<string, GuideSpec>> = {
  "side-take-the-keys": {
    zones: [],
    context: [],
    checklist: [
      { id: "keys-checked", label: "ผลเช็กลิสต์ /project ownership ทีละข้อ", hint: null },
      { id: "keys-open", label: "เรื่องที่ยังแก้ไม่ได้", hint: null },
      { id: "keys-secrets", label: "ไม่มีรหัสผ่าน โทเคน หรือภาพหน้าจอบัญชีส่วนตัว", hint: null },
    ],
    examples: [],
  },
};

/** Side quests that read the canvas; every other side quest is line and link only. */
const SIDE_ZONES: Readonly<Record<string, ShiftCardKind[]>> = {
  "side-five-voices": ["interview", "target"],
  "side-outside-circle": ["test"],
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
  if (Object.hasOwn(SIDE_GUIDES, q.slug)) return SIDE_GUIDES[q.slug];
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
