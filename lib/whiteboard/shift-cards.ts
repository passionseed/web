import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";

import { STICKY_COLORS } from "./core";

/**
 * SHIFT cards: typed stickies students log their project with (problem,
 * interviews, tests, pivots...), and project frames that group one project's
 * cards. Each card is tagged in customData.card, like the room cards, and the
 * author is already stamped on every element, so the board can be read per
 * student and per project without forms.
 *
 * Rule of thumb: things you believe (problem, target user, idea, what you
 * shipped) get versions; things that happened (an interview, a test) get a new
 * card each time.
 */

export const SHIFT_CARD_KINDS = [
  "problem",
  "target",
  "interview",
  "reference",
  "idea",
  "test",
  "pivot",
  "ship",
  "daily",
] as const;
export type ShiftCardKind = (typeof SHIFT_CARD_KINDS)[number];

export type ShiftCard = {
  title: string;
  emoji: string;
  /** The question printed on a fresh card; students write in the space below it. */
  prompt: string;
  color: string;
  /** Beliefs that change over time keep versions; events get a new card. */
  versioned: boolean;
  /** The matching shift_round_evidence type, for a later export. Null when there is none yet. */
  evidence: string | null;
};

const fill = (name: (typeof STICKY_COLORS)[number]["name"]) => STICKY_COLORS.find((c) => c.name === name)!.fill;

export const SHIFT_CARDS: Record<ShiftCardKind, ShiftCard> = {
  problem: {
    title: "ปัญหา · Problem",
    emoji: "🎯",
    prompt: "ใครลำบากเรื่องอะไร ตอนไหน เพราะอะไร?",
    color: fill("Pink"),
    versioned: true,
    evidence: "problem_statement",
  },
  target: {
    title: "กลุ่มเป้าหมาย · Target user",
    emoji: "👥",
    prompt: "ใคร หาเจอได้ที่ไหน ติดต่อได้กี่คน?",
    color: fill("Purple"),
    versioned: true,
    evidence: "problem_statement",
  },
  interview: {
    title: "สัมภาษณ์ · Interview",
    emoji: "🎤",
    prompt: "คุยกับใคร (ไม่ใส่ชื่อจริง) เขาพูดอะไรที่ทำให้แปลกใจ?",
    color: fill("Yellow"),
    versioned: false,
    evidence: "interview",
  },
  reference: {
    title: "ตัวอย่าง/คู่แข่ง · Reference",
    emoji: "🔍",
    prompt: "ชื่อหรือลิงก์ คนใช้บ่นเรื่องอะไร เราหยิบอะไรมาใช้ได้?",
    color: fill("Gray"),
    versioned: false,
    evidence: null,
  },
  idea: {
    title: "ไอเดีย · Idea",
    emoji: "💡",
    prompt: "ไอเดียคืออะไร แก้ปัญหาข้อไหน?",
    color: fill("Orange"),
    versioned: true,
    evidence: "ideas",
  },
  test: {
    title: "ทดสอบ · Test",
    emoji: "🧪",
    prompt: "อยากรู้อะไร ให้ใครลอง ผลเป็นยังไง?",
    color: fill("Blue"),
    versioned: false,
    evidence: "tester",
  },
  pivot: {
    title: "เปลี่ยนแผน · Pivot",
    emoji: "🔀",
    prompt: "เปลี่ยนจากอะไร เป็นอะไร เพราะอะไร?",
    color: "#99e9f2",
    versioned: false,
    evidence: "change",
  },
  ship: {
    title: "ปล่อยงาน · Ship",
    emoji: "🚀",
    prompt: "ลิงก์ และตอนนี้ใช้ทำอะไรได้แล้ว?",
    color: fill("Green"),
    versioned: true,
    evidence: "mvp",
  },
  daily: {
    title: "วันนี้ · Daily",
    emoji: "📅",
    prompt: "วันนี้ทำอะไรเสร็จ อะไรพัง ได้เรียนรู้อะไร?",
    color: "#fff3bf",
    versioned: false,
    evidence: "daily",
  },
};

export const isShiftCardKind = (value: unknown): value is ShiftCardKind =>
  typeof value === "string" && (SHIFT_CARD_KINDS as readonly string[]).includes(value);

export const isVersionedCard = (value: unknown): value is ShiftCardKind =>
  isShiftCardKind(value) && SHIFT_CARDS[value].versioned;

/** The Thai half of a bilingual title. */
export const shortTitle = (kind: ShiftCardKind) => SHIFT_CARDS[kind].title.split(" · ")[0];

/** The text a fresh card starts with: a header and the question. Answers go below. */
export const shiftCardStartText = (kind: ShiftCardKind) =>
  `${SHIFT_CARDS[kind].emoji} ${shortTitle(kind)}\n${SHIFT_CARDS[kind].prompt}`;

const squash = (s: string) => s.replace(/\s+/g, "");

/** Whether someone wrote on the card, beyond the prompts it starts with. */
export const isWritten = (kind: ShiftCardKind, text: string | null | undefined) =>
  Boolean(text && squash(text) && squash(text) !== squash(shiftCardStartText(kind)));

export const SHIFT_CARD_WIDTH = 300;
export const SHIFT_CARD_HEIGHT = 260;

/**
 * One card as a sticky: the header and question, then an empty line where the
 * answer goes (useShiftCardCaret puts the caret there). Left-aligned, top
 * first, so long answers read down the card. `example` cards come with a
 * project frame and only count once someone writes on them.
 */
export function shiftCardSkeleton(
  kind: ShiftCardKind,
  x = 0,
  y = 0,
  { example = false, id }: { example?: boolean; id?: string } = {},
): ExcalidrawElementSkeleton {
  const card = SHIFT_CARDS[kind];
  return {
    type: "rectangle",
    ...(id ? { id } : {}),
    x,
    y,
    width: SHIFT_CARD_WIDTH,
    height: SHIFT_CARD_HEIGHT,
    backgroundColor: card.color,
    strokeColor: card.color,
    fillStyle: "solid",
    strokeWidth: 1,
    roughness: 0,
    roundness: { type: 3 },
    customData: example ? { card: kind, example: true } : { card: kind },
    label: {
      text: `${shiftCardStartText(kind)}\n\n`,
      fontSize: 18,
      fontFamily: 6,
      strokeColor: "#1e1e1e",
      textAlign: "left",
      verticalAlign: "top",
    },
  } as ExcalidrawElementSkeleton;
}

// ---------------------------------------------------------------------------
// Project frames

export const PROJECT_FRAME = { width: 1900, height: 1150 };

const newProjectId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/**
 * A frame (artboard) for one project, tagged customData.project with an id
 * that survives copying the frame to another board, so one project's log can
 * span the SHIFT board and the SHIFT High board. Starts with an empty Problem
 * and Target user card. Readers treat two frames with the same id on one
 * board (a copy-paste) as separate projects.
 */
export function projectFrameSkeleton(name: string, projectId = newProjectId()): ExcalidrawElementSkeleton[] {
  // Excalidraw sizes a frame from its children when x or y is 0, so start away from the origin.
  const x = 100;
  const y = 100;
  const hint = {
    type: "text",
    id: "project-hint",
    x: x + 40,
    y: y + 32,
    text: "ลากการ์ดจากแถบ SHIFT มาวางในกรอบนี้ · ทุกอย่างในกรอบนับเป็นของโปรเจกต์นี้\nดับเบิลคลิกชื่อกรอบเพื่อเปลี่ยนชื่อโปรเจกต์",
    fontSize: 20,
    fontFamily: 6,
    strokeColor: "#1e1e1e",
    opacity: 60,
  } as ExcalidrawElementSkeleton;
  return [
    hint,
    shiftCardSkeleton("problem", x + 40, y + 120, { example: true, id: "project-problem" }),
    shiftCardSkeleton("target", x + 40 + SHIFT_CARD_WIDTH + 40, y + 120, { example: true, id: "project-target" }),
    {
      type: "frame",
      x,
      y,
      width: PROJECT_FRAME.width,
      height: PROJECT_FRAME.height,
      name,
      children: ["project-hint", "project-problem", "project-target"],
      customData: { project: projectId },
    } as ExcalidrawElementSkeleton,
  ];
}

type FrameLike = {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDeleted?: boolean;
  customData?: Record<string, unknown> | null;
};

export const isProjectFrame = (el: FrameLike) =>
  el.type === "frame" && !el.isDeleted && typeof el.customData?.project === "string";

/** The smallest project frame holding a point, so a card dropped there joins it. */
export function projectFrameAt<T extends FrameLike>(elements: readonly T[], point: { x: number; y: number }): T | null {
  let best: T | null = null;
  for (const el of elements) {
    if (!isProjectFrame(el)) continue;
    const inside = point.x > el.x && point.x < el.x + el.width && point.y > el.y && point.y < el.y + el.height;
    if (inside && (!best || el.width * el.height < best.width * best.height)) best = el;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Placement

type Box = { x: number; y: number; width: number; height: number };
type Placed = Box & { type: string; isDeleted?: boolean; containerId?: string | null };

const SLOT_GAP = 24;
/** Bigger than this is a background zone or a frame, which cards may sit on. */
const MAX_OBSTACLE_AREA = 500 * 500;
const OBSTACLE_TYPES = new Set(["rectangle", "ellipse", "diamond", "image", "embeddable", "text"]);

/** Whether a new card should avoid this element: notes, cards, images and loose text, not zones or frames. */
export const isPlacementObstacle = (el: Placed) =>
  !el.isDeleted && OBSTACLE_TYPES.has(el.type) && !el.containerId && el.width * el.height <= MAX_OBSTACLE_AREA;

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const contains = (outer: Box, inner: Box) =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;

/** Slot offsets in the order a person would fill them: along the row to the right, then the next row down. */
const SLOT_ORDER: [number, number][] = [0, 1, 2, -1, -2].flatMap((row) => [0, 1, 2, 3, -1, -2, -3].map((col) => [col, row] as [number, number]));

/**
 * Where a new card's centre goes: the first free card-sized slot around
 * `center`, so clicking several cards in a row lays them out side by side
 * instead of piling them up. `within` (a project frame) keeps every slot
 * inside it. Falls back to `center` when every slot is taken.
 */
export function freeSlot(
  obstacles: readonly Box[],
  center: { x: number; y: number },
  size: { width: number; height: number } = { width: SHIFT_CARD_WIDTH, height: SHIFT_CARD_HEIGHT },
  within?: Box | null,
): { x: number; y: number } {
  for (const [col, row] of SLOT_ORDER) {
    const x = center.x + col * (size.width + SLOT_GAP);
    const y = center.y + row * (size.height + SLOT_GAP);
    const box = { x: x - size.width / 2, y: y - size.height / 2, ...size };
    if (within && !contains(within, box)) continue;
    if (!obstacles.some((o) => overlaps(o, box))) return { x, y };
  }
  return center;
}

// ---------------------------------------------------------------------------
// Versions

export type CardVersion = { v: number; text: string; at: string; by: string; why?: string };

export const MAX_VERSIONS = 20;
/** Longer than any card a person writes by hand; anything past it is not kept in a version. */
export const MAX_VERSION_TEXT = 5000;
export const MAX_WHY = 280;

const isVersion = (x: unknown): x is CardVersion => {
  const v = x as CardVersion;
  return (
    !!v &&
    typeof v === "object" &&
    Number.isInteger(v.v) &&
    v.v > 0 &&
    typeof v.text === "string" &&
    typeof v.at === "string" &&
    typeof v.by === "string" &&
    (v.why === undefined || typeof v.why === "string")
  );
};

/** The saved versions on a card, oldest first. Ignores anything malformed. */
export function readVersions(customData: unknown): CardVersion[] {
  const list = (customData as { versions?: unknown } | null | undefined)?.versions;
  return Array.isArray(list) ? list.filter(isVersion) : [];
}

/** The text a version keeps: trimmed and cut to MAX_VERSION_TEXT. */
const versionText = (text: string) => text.trim().slice(0, MAX_VERSION_TEXT);

/** Whether the card's text differs from its last saved version, compared as a version would keep it. */
export function hasUnsavedEdit(customData: unknown, text: string): boolean {
  const last = readVersions(customData).at(-1);
  return Boolean(last) && squash(last!.text) !== squash(versionText(text));
}

/**
 * The card's customData with the current text saved as the next version, or
 * null when there is nothing new to save (an unwritten card, or the same text
 * as the last version). Keeps the newest MAX_VERSIONS; numbers never repeat.
 */
export function addVersion(
  kind: ShiftCardKind,
  customData: Record<string, unknown> | null | undefined,
  entry: { text: string; by: string; at: string; why?: string },
): Record<string, unknown> | null {
  const text = versionText(entry.text);
  if (!isWritten(kind, text)) return null;
  const versions = readVersions(customData);
  const last = versions.at(-1);
  if (last && squash(last.text) === squash(text)) return null;
  const why = entry.why?.trim().slice(0, MAX_WHY);
  const next: CardVersion = { v: (last?.v ?? 0) + 1, text, at: entry.at, by: entry.by, ...(why ? { why } : {}) };
  const data: Record<string, unknown> = { ...customData, versions: [...versions, next].slice(-MAX_VERSIONS) };
  // A card with a saved version is real work now, not an example from a project frame.
  delete data.example;
  return data;
}
