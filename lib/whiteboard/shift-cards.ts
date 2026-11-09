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

/** A note on the project canvas: sticky-sized, so a zone holds several side by side. */
export const SHIFT_CARD_WIDTH = 240;
export const SHIFT_CARD_HEIGHT = 200;

/**
 * One note as a sticky in its kind's colour, tagged customData.card. It starts
 * blank: the zone it sits in already says what it is for. Left-aligned, top
 * first, so longer answers read down the note. `example` notes come with a
 * new canvas and only count once someone writes on them.
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
    // A single space, not "": Excalidraw only creates the label (with this font and alignment) for non-empty text,
    // and a note without one gets the board's current font, often the hand-drawn one, when typing starts.
    label: { text: " ", fontSize: 18, fontFamily: 6, strokeColor: "#1e1e1e", textAlign: "left", verticalAlign: "top" },
  } as ExcalidrawElementSkeleton;
}

// ---------------------------------------------------------------------------
// Project canvas: a frame laid out like a Business Model Canvas, one zone per kind.

export type ZoneSpec = { kind: ShiftCardKind; x: number; y: number; width: number; height: number; day?: number };

const ZONE_GAP = 16;
/** Room at the top of a zone for its title and question. */
export const ZONE_HEADER = 96;
export const ZONE_PAD = 24;
const ROW_WIDTH = 2224;
const FRAME_PAD = 40;
/** Space at the top of the frame for its one-line hint. */
const FRAME_HINT = 72;
export const DAYS = 7;

/**
 * Splits a row of the canvas into zones: equal widths, or the given leading
 * widths with the last zone taking what is left of the row.
 */
function row(kinds: ShiftCardKind[], y: number, height: number, leading: number[] = []): ZoneSpec[] {
  const even = (ROW_WIDTH - ZONE_GAP * (kinds.length - 1)) / kinds.length;
  let x = 0;
  return kinds.map((kind, i) => {
    const last = i === kinds.length - 1;
    let width = even;
    if (leading.length) width = last ? ROW_WIDTH - x : leading[i];
    const zone = { kind, x, y, width, height };
    x += width + ZONE_GAP;
    return zone;
  });
}

/**
 * The canvas zones, from the frame's inner top-left: what we believe on top
 * (each starts with one note that keeps versions), the evidence in the middle,
 * and one Daily cell per day of the shift at the bottom.
 */
export function canvasZones(): ZoneSpec[] {
  const beliefs = row(["problem", "target", "idea", "ship"], 0, 360);
  const evidence = row(["interview", "reference"], 376, 544, [1214]);
  const changes = row(["test", "pivot"], 936, 544);
  const cell = (ROW_WIDTH - ZONE_GAP * (DAYS - 1)) / DAYS;
  const daily = Array.from({ length: DAYS }, (_, i) => ({
    kind: "daily" as const,
    x: i * (cell + ZONE_GAP),
    y: 1496,
    width: cell,
    height: 328,
    day: i + 1,
  }));
  return [...beliefs, ...evidence, ...changes, ...daily];
}

/** A zone's title: "🎤 สัมภาษณ์", or "📅 วันที่ 3" for a Daily cell. */
export const zoneTitle = (kind: ShiftCardKind, day?: number) =>
  day ? `${SHIFT_CARDS[kind].emoji} วันที่ ${day}` : `${SHIFT_CARDS[kind].emoji} ${shortTitle(kind)}`;

/** Short enough for a Daily cell. */
const DAILY_PROMPT = "เสร็จ · พัง · ได้เรียนรู้";

const newProjectId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

const text = (id: string, x: number, y: number, value: string, fontSize: number, extra: Record<string, unknown> = {}) =>
  ({ type: "text", id, x, y, text: value, fontSize, fontFamily: 6, strokeColor: "#1e1e1e", locked: true, ...extra }) as ExcalidrawElementSkeleton;

/**
 * A project canvas: a frame (artboard) tagged customData.project, holding one
 * tinted zone per kind (customData.zone) with its title and question, and an
 * empty note in each belief zone. Zones and their labels are locked so notes
 * can be dragged over them. A note's zone says what it is, so plain stickies
 * placed in a zone count too. The project id survives copying the frame to
 * another board, so one project can continue from a SHIFT board onto the
 * SHIFT High board; readers treat two frames with the same id on one board
 * (a copy-paste) as separate projects.
 */
export function projectCanvasSkeleton(name: string, projectId = newProjectId()): ExcalidrawElementSkeleton[] {
  // Excalidraw sizes a frame from its children when x or y is 0, so start away from the origin.
  const fx = 100;
  const fy = 100;
  const ox = fx + FRAME_PAD;
  const oy = fy + FRAME_HINT;
  const out: ExcalidrawElementSkeleton[] = [
    text("canvas-hint", ox, fy + 24, "กด + เพิ่ม ในช่องไหน ก็ได้โน้ตเรื่องนั้น พิมพ์ได้เลย · ดับเบิลคลิกชื่อกรอบเพื่อเปลี่ยนชื่อโปรเจกต์", 20, {
      opacity: 60,
      customData: { canvasHint: true },
    }),
  ];
  const zones = canvasZones();
  zones.forEach((z, i) => {
    const card = SHIFT_CARDS[z.kind];
    out.push(
      {
        type: "rectangle",
        id: `zone-${i}`,
        x: ox + z.x,
        y: oy + z.y,
        width: z.width,
        height: z.height,
        backgroundColor: card.color,
        strokeColor: "transparent",
        fillStyle: "solid",
        opacity: 35,
        roughness: 0,
        roundness: { type: 3 },
        locked: true,
        customData: { zone: z.kind, ...(z.day ? { day: z.day } : {}) },
      } as ExcalidrawElementSkeleton,
      text(`zone-${i}-title`, ox + z.x + ZONE_PAD, oy + z.y + 20, zoneTitle(z.kind, z.day), z.day ? 20 : 26, {
        customData: { zoneLabel: z.kind },
      }),
      text(`zone-${i}-prompt`, ox + z.x + ZONE_PAD, oy + z.y + 58, z.day ? DAILY_PROMPT : card.prompt, z.day ? 16 : 18, {
        opacity: 65,
        customData: { zoneLabel: z.kind },
      }),
    );
    if (card.versioned) {
      out.push(shiftCardSkeleton(z.kind, ox + z.x + ZONE_PAD, oy + z.y + ZONE_HEADER, { example: true, id: `zone-${i}-note` }));
    }
  });
  const children = out.map((el) => (el as { id: string }).id);
  const width = ROW_WIDTH + 2 * FRAME_PAD;
  const height = FRAME_HINT + Math.max(...zones.map((z) => z.y + z.height)) + FRAME_PAD;
  out.push({ type: "frame", x: fx, y: fy, width, height, name, children, customData: { project: projectId } } as ExcalidrawElementSkeleton);
  return out;
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

/** A canvas zone: the tinted rectangle a note's type comes from. */
export const isZone = (el: FrameLike) => el.type === "rectangle" && !el.isDeleted && isShiftCardKind(el.customData?.zone);

// ---------------------------------------------------------------------------
// Placement

type Box = { x: number; y: number; width: number; height: number };
type Placed = Box & {
  type: string;
  isDeleted?: boolean;
  containerId?: string | null;
  customData?: Record<string, unknown> | null;
};

const SLOT_GAP = 24;
/** Bigger than this is a background zone or a frame, which cards may sit on. */
const MAX_OBSTACLE_AREA = 500 * 500;
const OBSTACLE_TYPES = new Set(["rectangle", "ellipse", "diamond", "image", "embeddable", "text"]);

/** Whether a new note should avoid this element: notes, images and loose text, not zones, their labels or frames. */
export const isPlacementObstacle = (el: Placed) =>
  !el.isDeleted &&
  OBSTACLE_TYPES.has(el.type) &&
  !el.containerId &&
  !el.customData?.zone &&
  !el.customData?.zoneLabel &&
  !el.customData?.canvasHint &&
  el.width * el.height <= MAX_OBSTACLE_AREA;

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const contains = (outer: Box, inner: Box) =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;

/** Slot offsets in the order a person would fill them: along the row to the right, then the next row down. */
const SLOT_ORDER: [number, number][] = [0, 1, 2, -1, -2].flatMap((row) => [0, 1, 2, 3, -1, -2, -3].map((col) => [col, row] as [number, number]));

/**
 * Where a new note's centre goes: the first free note-sized slot around
 * `center`, so several notes lay out side by side instead of piling up.
 * `within` keeps every slot inside it. Returns null when every slot is taken.
 */
export function freeSlot(
  obstacles: readonly Box[],
  center: { x: number; y: number },
  size: { width: number; height: number } = { width: SHIFT_CARD_WIDTH, height: SHIFT_CARD_HEIGHT },
  within?: Box | null,
): { x: number; y: number } | null {
  for (const [col, row] of SLOT_ORDER) {
    const x = center.x + col * (size.width + SLOT_GAP);
    const y = center.y + row * (size.height + SLOT_GAP);
    const box = { x: x - size.width / 2, y: y - size.height / 2, ...size };
    if (within && !contains(within, box)) continue;
    if (!obstacles.some((o) => overlaps(o, box))) return { x, y };
  }
  return null;
}

/**
 * Where a new note goes in a zone: the first free slot reading from the zone's
 * top-left, below its title. A full zone gets the note cascaded over its first
 * slot, so the click still does something visible.
 */
export function zoneSlot(zone: Box, obstacles: readonly Box[], count = 0): { x: number; y: number } {
  const inner = {
    x: zone.x + ZONE_PAD,
    y: zone.y + ZONE_HEADER,
    width: zone.width - 2 * ZONE_PAD,
    height: zone.height - ZONE_HEADER - ZONE_PAD / 2,
  };
  const first = { x: inner.x + SHIFT_CARD_WIDTH / 2, y: inner.y + SHIFT_CARD_HEIGHT / 2 };
  const free = freeSlot(obstacles, first, undefined, inner);
  if (free) return free;
  const step = 20 * ((count % 5) + 1);
  return { x: first.x + step, y: first.y + step };
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

/** What the student wrote: the card's text without its header and question, when those are unchanged. */
export function answerOf(kind: ShiftCardKind, text: string): string {
  const start = shiftCardStartText(kind);
  const normal = text.replace(/\r\n/g, "\n");
  return (normal.startsWith(start) ? normal.slice(start.length) : normal).trim();
}

/** Which lines of `current` are new since `previous` (indices into current's lines), ignoring blank lines. */
export function newLines(previous: string, current: string): Set<number> {
  const before = new Set(previous.split("\n").map((l) => l.trim()).filter(Boolean));
  const added = new Set<number>();
  current.split("\n").forEach((line, i) => {
    if (line.trim() && !before.has(line.trim())) added.add(i);
  });
  return added;
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
