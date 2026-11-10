import { canvasZones, isShiftCardKind, isZone, SHIFT_CARD_HEIGHT, type ShiftCardKind, ZONE_PAD } from "./shift-cards";

/**
 * Rows of a SHIFT canvas that grow and shrink with their notes.
 *
 * A canvas's zones sit in rows (beliefs, evidence, tests and pivots, daily).
 * A row is as tall as its fullest zone needs (a note's bottom plus some room),
 * but never shorter than the template made it. When a row changes height, the
 * rows below it move by the difference, with everything in them (labels,
 * notes, their text, loose stickies, arrows), and the frame grows or shrinks
 * to match. The result depends only on the scene, so running it again on its
 * own output changes nothing.
 */

type Point = readonly [number, number];
export type FitElement = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDeleted?: boolean;
  frameId?: string | null;
  containerId?: string | null;
  points?: readonly Point[];
  startBinding?: { elementId: string } | null;
  endBinding?: { elementId: string } | null;
  customData?: Record<string, unknown> | null;
};

/** One change to make: only the fields that move. */
export type FitMove = { id: string; y?: number; height?: number; points?: Point[] };

/** Space left under the lowest note in a zone. */
const ROOM_BELOW = ZONE_PAD;
/** One more line of notes: what "+ เพิ่ม" asks for when a zone is full. */
export const NOTE_LINE = SHIFT_CARD_HEIGHT + 24;
const EPSILON = 0.5;

/** The template height of each kind's row (canvasZones), the least a row shrinks to. */
const TEMPLATE_HEIGHT = new Map<ShiftCardKind, number>(canvasZones().map((z) => [z.kind, z.height]));

const isLayout = (el: FitElement) => Boolean(el.customData?.zoneLabel || el.customData?.canvasHint);
/** What a person put in a zone: notes, stickies, text, images. Not zones, labels, arrows or text inside a note. */
const isContent = (el: FitElement) =>
  !isZone(el) && !isLayout(el) && !el.containerId && el.type !== "arrow" && el.type !== "line" && el.type !== "frame";

type Row = { top: number; height: number; zones: FitElement[] };

/**
 * The moves that make every row of the canvas in `frameId` fit its notes.
 * `room` asks for one zone to have space for `height` more (a new line of
 * notes when "+ เพิ่ม" finds the zone full). Empty when nothing needs to move.
 */
export function fitCanvas(
  elements: readonly FitElement[],
  frameId: string,
  room?: { zoneId: string; height: number },
): FitMove[] {
  const live = elements.filter((el) => !el.isDeleted);
  const frame = live.find((el) => el.id === frameId && el.type === "frame" && typeof el.customData?.project === "string");
  if (!frame) return [];
  const zones = live.filter((el) => isZone(el) && el.frameId === frameId);
  if (zones.length === 0) return [];

  // Zones that start at the same height form a row.
  const rows: Row[] = [];
  for (const zone of [...zones].sort((a, b) => a.y - b.y)) {
    const row = rows.find((r) => Math.abs(r.top - zone.y) < 1);
    if (row) {
      row.zones.push(zone);
      row.height = Math.max(row.height, zone.height);
    } else rows.push({ top: zone.y, height: zone.height, zones: [zone] });
  }

  const inFrame = live.filter((el) => el.frameId === frameId);
  const content = inFrame.filter(isContent);
  const heights = rows.map((row) => {
    let needed = 0;
    for (const zone of row.zones) {
      const kind = zone.customData?.zone;
      needed = Math.max(needed, isShiftCardKind(kind) ? (TEMPLATE_HEIGHT.get(kind) ?? 0) : 0);
      // A note belongs to the zone its top-left corner is in.
      const mine = content.filter(
        (el) => el.y >= zone.y && el.y < zone.y + zone.height && el.x + el.width / 2 >= zone.x && el.x + el.width / 2 <= zone.x + zone.width,
      );
      const bottom = Math.max(zone.y, ...mine.map((el) => el.y + el.height));
      needed = Math.max(needed, bottom - zone.y + ROOM_BELOW);
      if (room?.zoneId === zone.id) needed = Math.max(needed, bottom - zone.y + room.height + ROOM_BELOW);
    }
    return Math.ceil(needed);
  });

  // New tops: each row keeps its gap to the row above.
  const tops: number[] = [];
  rows.forEach((row, i) => {
    if (i === 0) tops.push(row.top);
    else {
      const gap = row.top - (rows[i - 1].top + rows[i - 1].height);
      tops.push(tops[i - 1] + heights[i - 1] + gap);
    }
  });
  const delta = rows.map((row, i) => tops[i] - row.top);

  /** How far something whose top is at `y` moves: with the row band it starts in. */
  const shiftAt = (y: number) => {
    let d = 0;
    rows.forEach((row, i) => {
      if (y >= row.top) d = delta[i];
    });
    return d;
  };
  const byId = new Map(live.map((el) => [el.id, el]));
  // By its top, not its centre: a tall note's centre can reach into the row below. Text inside a note moves with its note.
  const shiftOf = (el: FitElement): number => {
    const container = el.containerId ? byId.get(el.containerId) : undefined;
    return shiftAt((container ?? el).y);
  };

  const moves: FitMove[] = [];
  const zoneIds = new Set(zones.map((z) => z.id));
  rows.forEach((row, i) => {
    for (const zone of row.zones) {
      const y = tops[i];
      const height = heights[i];
      if (Math.abs(zone.y - y) > EPSILON || Math.abs(zone.height - height) > EPSILON) moves.push({ id: zone.id, y, height });
    }
  });

  const movedIds = new Map<string, number>();
  const boundText = live.filter((el) => el.containerId && byId.get(el.containerId)?.frameId === frameId && el.frameId !== frameId);
  for (const el of [...inFrame, ...boundText]) {
    if (zoneIds.has(el.id) || el.type === "arrow") continue;
    const dy = shiftOf(el);
    movedIds.set(el.id, dy);
    if (Math.abs(dy) > EPSILON) moves.push({ id: el.id, y: el.y + dy });
  }

  // Arrows follow what they connect: each end moves with its element.
  for (const arrow of live.filter((el) => el.type === "arrow")) {
    // A bound end moves with its element (not at all when that is outside this canvas); a loose end inside the canvas moves with its row.
    const own = arrow.frameId === frameId ? shiftAt(arrow.y) : 0;
    const endShift = (binding: FitElement["startBinding"]) => (binding ? (movedIds.get(binding.elementId) ?? 0) : own);
    const s = endShift(arrow.startBinding);
    const e = endShift(arrow.endBinding);
    if (Math.abs(s) <= EPSILON && Math.abs(e) <= EPSILON) continue;
    const points = arrow.points ?? [];
    const bend = e - s;
    const move: FitMove = { id: arrow.id, y: arrow.y + s };
    if (Math.abs(bend) > EPSILON && points.length > 1) {
      move.points = points.map(([px, py], i) => [px, py + (bend * i) / (points.length - 1)] as Point);
    }
    moves.push(move);
  }

  const last = rows.length - 1;
  const grow = tops[last] + heights[last] - (rows[last].top + rows[last].height);
  if (Math.abs(grow) > EPSILON) moves.push({ id: frame.id, height: frame.height + grow });
  return moves;
}
