/**
 * Elemental notes, built on the server (the bot, or a server action) as the
 * two Excalidraw elements a SHIFT note is: a rectangle tagged customData.card
 * and its bound text. They match what the editor makes from
 * shiftCardSkeleton (lib/whiteboard/shift-cards.ts) field for field, so SHIFT
 * readers (overview, quest snapshot, version layer) see them as ordinary
 * notes, and restoreElements in the browser keeps them as they are
 * (scripts/elemental/excalidraw-roundtrip.ts checks that against the real
 * Excalidraw).
 *
 * Ids come from the entry ('el-<entryId>-r' and '-t'), so writing the same
 * entry again replaces its note instead of adding one. Seeds and nonces are
 * derived from the ids, so a retry builds the same elements.
 *
 * Pure: no imports outside lib/elemental, safe for the bot image.
 */

import { keyBetween } from "./fracIndex";
import { type Box, SHIFT_CARD_HEIGHT, SHIFT_CARD_WIDTH, zoneSlot } from "./geometry";

/** The SHIFT card kinds Elemental writes. Only existing kinds, so overview tools still read the notes. */
export const ELEMENTAL_NOTE_KINDS = ["test", "reference", "ship"] as const;
export type ElementalNoteKind = (typeof ELEMENTAL_NOTE_KINDS)[number];

/** What made the note: a /tester entry, a lesson's do-it-now, or a /handin. */
export const ELEMENTAL_NOTE_SOURCES = ["tester", "lesson", "handin"] as const;
export type ElementalNoteSource = (typeof ELEMENTAL_NOTE_SOURCES)[number];

export const DEFAULT_SOURCE: Record<ElementalNoteKind, ElementalNoteSource> = {
  test: "tester",
  reference: "lesson",
  ship: "handin",
};

/** Each kind's sticky colour, copied from SHIFT_CARDS (held equal by a parity test). */
export const NOTE_COLORS: Record<ElementalNoteKind, string> = {
  test: "#a8d8ff",
  reference: "#e3e3e3",
  ship: "#b5f0b0",
};

/** Matches shiftCardSkeleton's label: Nunito (Excalidraw font family 6), 18 px, left and top. */
export const NOTE_FONT_FAMILY = 6;
export const NOTE_FONT_SIZE = 18;
/** Excalidraw's line height for Nunito. */
export const NOTE_LINE_HEIGHT = 1.35;
export const NOTE_TEXT_COLOR = "#1e1e1e";
/** Excalidraw sets bound text this far in from its container's edge. */
export const BOUND_TEXT_PADDING = 5;
/** Smaller sizes a long note shrinks to before its rectangle grows taller. */
const FALLBACK_FONT_SIZES = [16, 14];
const NOTE_RADIUS = 10;
/** Longer text is cut on the canvas (the entry row keeps all of it). */
export const NOTE_TEXT_MAX = 1000;

const ID_PART = /^[A-Za-z0-9_-]{1,64}$/;

type BaseElement = {
  id: string;
  type: "rectangle" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: "solid";
  strokeWidth: number;
  strokeStyle: "solid";
  roughness: number;
  opacity: number;
  groupIds: string[];
  frameId: string | null;
  index: string;
  roundness: { type: number; value?: number } | null;
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  /** The rectangle lists its text; text has none ([], as restoreElements writes it). */
  boundElements: { id: string; type: "text" }[];
  updated: number;
  link: null;
  locked: boolean;
};

export type NoteRectangle = BaseElement & {
  type: "rectangle";
  customData: { card: ElementalNoteKind; source: ElementalNoteSource; createdBy: string; updatedBy: string };
};

export type NoteText = BaseElement & {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: number;
  textAlign: "left";
  verticalAlign: "top";
  containerId: string;
  originalText: string;
  autoResize: boolean;
  lineHeight: number;
  customData: { createdBy: string; updatedBy: string };
};

export type NoteElement = NoteRectangle | NoteText;
/** A note: its rectangle, then its text (the text's index is above the rectangle's, as Excalidraw requires). */
export type Note = [NoteRectangle, NoteText];

export type BuildNoteInput = {
  /** The entry the note shows (a tester entry, lesson answer or hand-in id): [A-Za-z0-9_-], up to 64 characters. */
  entryId: string;
  kind: ElementalNoteKind;
  /** Defaults by kind: test → tester, reference → lesson, ship → handin. */
  source?: ElementalNoteSource;
  text: string;
  /** The team's linked project frame. */
  frameId: string;
  /** The zone rectangle on that frame the note goes in (customData.zone = kind). */
  zoneBox: Box;
  /** Everything a note must not cover: board elements filtered with isPlacementObstacle. */
  obstacles: readonly Box[];
  /** The board's highest index (lastIndex), or null on an empty board. */
  afterIndex: string | null;
  /** The board owner: the write is saved as them (customData.createdBy and updatedBy). */
  ownerId: string;
  /** Notes already in the zone, for where a full zone stacks the next one. Defaults to the obstacles centred in the zone. */
  count?: number;
  /** Milliseconds, for `updated`. Defaults to now. */
  now?: number;
};

/** The element ids of an entry's note. */
export const noteIds = (entryId: string) => ({ rect: `el-${entryId}-r`, text: `el-${entryId}-t` });

export const isElementalNoteKind = (value: unknown): value is ElementalNoteKind =>
  typeof value === "string" && (ELEMENTAL_NOTE_KINDS as readonly string[]).includes(value);

/** FNV-1a, folded into Excalidraw's 31-bit seed range (never 0). */
function hash31(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 0x7ffffffe) + 1;
}

const seedFor = (id: string) => hash31(`seed:${id}`);
/**
 * A rewrite salts its nonce with the new text: two rewrites built from the same
 * copy (an edit racing a resync) then differ in nonce as they differ in text,
 * so Excalidraw never takes one for the other. A retry of the same write still
 * builds the same element.
 */
const nonceFor = (id: string, version: number, salt = "") => hash31(`nonce:${id}:${version}${salt ? `:${salt}` : ""}`);

// ---------------------------------------------------------------------------
// Text: an estimate of Excalidraw's wrapping. The browser re-measures bound
// text once its fonts load, so this only has to be close.

/** Thai vowel and tone marks that sit above or below the letter before them. */
const isCombining = (cp: number) =>
  cp === 0x0e31 || (cp >= 0x0e34 && cp <= 0x0e3a) || (cp >= 0x0e47 && cp <= 0x0e4e) || (cp >= 0x0300 && cp <= 0x036f) || cp === 0xfe0f || (cp >= 0x200b && cp <= 0x200d);

/** A generous width in em, so estimated lines are never longer than real ones. */
function charEm(ch: string): number {
  const cp = ch.codePointAt(0)!;
  if (isCombining(cp)) return 0;
  if (cp >= 0x1f000) return 1.2;
  if (cp >= 0x2e80 && !(cp >= 0x0e00 && cp <= 0x0e7f)) return 1;
  return 0.6;
}

const widthOf = (s: string, fontSize: number) => Array.from(s).reduce((sum, ch) => sum + charEm(ch) * fontSize, 0);

/** Clusters of a letter and the marks on it, so a line never starts with a floating mark. */
function clusters(s: string): string[] {
  const out: string[] = [];
  for (const ch of Array.from(s)) {
    if (out.length && isCombining(ch.codePointAt(0)!)) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

/** Wraps one paragraph at spaces where it can, inside words where it must. */
function wrapLine(line: string, fontSize: number, maxWidth: number): string[] {
  if (widthOf(line, fontSize) <= maxWidth) return [line];
  const out: string[] = [];
  let current = "";
  for (const word of line.split(/(?<= )/)) {
    if (widthOf(current + word, fontSize) <= maxWidth) {
      current += word;
      continue;
    }
    if (current) out.push(current.trimEnd());
    current = "";
    for (const part of clusters(word)) {
      if (current && widthOf(current + part, fontSize) > maxWidth) {
        out.push(current);
        current = "";
      }
      current += part;
    }
  }
  if (current || !out.length) out.push(current.trimEnd());
  return out;
}

/** Text as Excalidraw keeps it: \n line ends, no tabs or other control characters, at most NOTE_TEXT_MAX characters. */
export function normalizeNoteText(text: string): string {
  const clean = text.replace(/\r\n?/g, "\n").replace(/\t/g, " ").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "");
  const chars = Array.from(clean);
  const cut = chars.length > NOTE_TEXT_MAX ? chars.slice(0, NOTE_TEXT_MAX - 1).join("") + "…" : clean;
  // A single space, not "": like shiftCardSkeleton, so the label always exists.
  return cut.trim() ? cut : " ";
}

type Layout = { text: string; fontSize: number; textWidth: number; textHeight: number; rectHeight: number };

/** The wrapped text, its size, and the rectangle's height: the note's size, or taller when the text needs it. */
export function layoutNoteText(original: string, rectWidth = SHIFT_CARD_WIDTH, rectHeight = SHIFT_CARD_HEIGHT): Layout {
  const maxWidth = rectWidth - 2 * BOUND_TEXT_PADDING;
  const maxHeight = rectHeight - 2 * BOUND_TEXT_PADDING;
  const sizes = [NOTE_FONT_SIZE, ...FALLBACK_FONT_SIZES];
  let layout: Layout | null = null;
  for (const fontSize of sizes) {
    const lines = original.split("\n").flatMap((line) => wrapLine(line, fontSize, maxWidth));
    const textHeight = lines.length * fontSize * NOTE_LINE_HEIGHT;
    const textWidth = Math.min(maxWidth, Math.max(...lines.map((l) => widthOf(l, fontSize))));
    layout = {
      text: lines.join("\n"),
      fontSize,
      textWidth: Math.max(1, Math.ceil(textWidth)),
      textHeight,
      rectHeight: Math.max(rectHeight, Math.ceil(textHeight + 2 * BOUND_TEXT_PADDING)),
    };
    if (textHeight <= maxHeight) break;
  }
  return layout!;
}

// ---------------------------------------------------------------------------

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

function check(input: BuildNoteInput): void {
  if (!ID_PART.test(input.entryId)) throw new Error("buildNote: entryId must be 1-64 of [A-Za-z0-9_-]");
  if (!isElementalNoteKind(input.kind)) throw new Error(`buildNote: kind must be one of ${ELEMENTAL_NOTE_KINDS.join(", ")}`);
  if (input.source !== undefined && !(ELEMENTAL_NOTE_SOURCES as readonly string[]).includes(input.source)) {
    throw new Error(`buildNote: source must be one of ${ELEMENTAL_NOTE_SOURCES.join(", ")}`);
  }
  if (!input.frameId) throw new Error("buildNote: frameId is required");
  if (!input.ownerId) throw new Error("buildNote: ownerId is required");
}

const inZone = (zone: Box, b: Box) => {
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  return cx > zone.x && cx < zone.x + zone.width && cy > zone.y && cy < zone.y + zone.height;
};

/** The base fields every Excalidraw element carries, in the order Excalidraw writes them. */
function base(
  id: string,
  type: "rectangle" | "text",
  box: Box,
  colors: { stroke: string; background: string },
  rest: { frameId: string; index: string; version: number; updated: number; strokeWidth: number; roughness: number; salt?: string },
): BaseElement {
  return {
    id,
    type,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    angle: 0,
    strokeColor: colors.stroke,
    backgroundColor: colors.background,
    fillStyle: "solid",
    strokeWidth: rest.strokeWidth,
    strokeStyle: "solid",
    roughness: rest.roughness,
    opacity: 100,
    groupIds: [],
    frameId: rest.frameId,
    index: rest.index,
    roundness: null,
    seed: seedFor(id),
    version: rest.version,
    versionNonce: nonceFor(id, rest.version, rest.salt),
    isDeleted: false,
    boundElements: [],
    updated: rest.updated,
    link: null,
    locked: false,
  };
}

function textElement(
  rect: NoteRectangle,
  layout: Layout,
  original: string,
  index: string,
  version: number,
  updated: number,
  ownerIds: { createdBy: string; updatedBy: string },
  salt?: string,
): NoteText {
  const id = rect.boundElements[0].id;
  return {
    ...base(
      id,
      "text",
      { x: rect.x + BOUND_TEXT_PADDING, y: rect.y + BOUND_TEXT_PADDING, width: layout.textWidth, height: layout.textHeight },
      { stroke: NOTE_TEXT_COLOR, background: "transparent" },
      { frameId: rect.frameId!, index, version, updated, strokeWidth: 2, roughness: 1, salt },
    ),
    type: "text",
    text: layout.text,
    fontSize: layout.fontSize,
    fontFamily: NOTE_FONT_FAMILY,
    textAlign: "left",
    verticalAlign: "top",
    containerId: rect.id,
    originalText: original,
    autoResize: true,
    lineHeight: NOTE_LINE_HEIGHT,
    customData: { ...ownerIds },
  };
}

/**
 * A new note in the first free slot of `zoneBox` (stacked over the first slot
 * when the zone is full, always inside the zone), indexed after `afterIndex`.
 */
export function buildNote(input: BuildNoteInput): Note {
  check(input);
  const ids = noteIds(input.entryId);
  const kind = input.kind;
  const source = input.source ?? DEFAULT_SOURCE[kind];
  const updated = input.now ?? Date.now();
  const original = normalizeNoteText(input.text);
  const layout = layoutNoteText(original);

  const count = input.count ?? input.obstacles.filter((o) => inZone(input.zoneBox, o)).length;
  const centre = zoneSlot(input.zoneBox, input.obstacles, count);
  const zone = input.zoneBox;
  const x = clamp(centre.x - SHIFT_CARD_WIDTH / 2, zone.x, zone.x + zone.width - SHIFT_CARD_WIDTH);
  const y = clamp(centre.y - SHIFT_CARD_HEIGHT / 2, zone.y, zone.y + zone.height - layout.rectHeight);

  const rectIndex = keyBetween(input.afterIndex, null);
  const textIndex = keyBetween(rectIndex, null);
  const authors = { createdBy: input.ownerId, updatedBy: input.ownerId };
  const color = NOTE_COLORS[kind];

  const rect: NoteRectangle = {
    ...base(
      ids.rect,
      "rectangle",
      { x, y, width: SHIFT_CARD_WIDTH, height: layout.rectHeight },
      { stroke: color, background: color },
      { frameId: input.frameId, index: rectIndex, version: 1, updated, strokeWidth: 1, roughness: 0 },
    ),
    type: "rectangle",
    roundness: { type: 3, value: NOTE_RADIUS },
    boundElements: [{ id: ids.text, type: "text" }],
    customData: { card: kind, source, ...authors },
  };
  return [rect, textElement(rect, layout, original, textIndex, 1, updated, authors)];
}

/**
 * The same note with new text: same ids, place and index, each element one
 * version higher, so the merge keeps it over the old copy. For /tester-edit
 * and a resubmitted hand-in.
 */
export function rewriteNote(prev: Note, text: string, now = Date.now()): Note {
  const [oldRect, oldText] = prev;
  const original = normalizeNoteText(text);
  // Wrap to the note as it stands now (students may have widened it).
  const layout = layoutNoteText(original, Math.max(oldRect.width, 2 * BOUND_TEXT_PADDING + 40));
  const version = oldRect.version + 1;
  const rect: NoteRectangle = {
    ...oldRect,
    height: layout.rectHeight,
    version,
    versionNonce: nonceFor(oldRect.id, version, original),
    isDeleted: false,
    updated: now,
  };
  return [rect, textElement(rect, layout, original, oldText.index, oldText.version + 1, now, { ...oldText.customData }, original)];
}

/** A deleted copy of a note's element, one version higher, so the merge removes it everywhere. Apply to both elements of a note. */
export function buildTombstone<T extends { id: string; version: number }>(prev: T, now = Date.now()): T & { isDeleted: true } {
  const version = prev.version + 1;
  return { ...prev, isDeleted: true, version, versionNonce: nonceFor(prev.id, version), updated: now };
}
