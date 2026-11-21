/**
 * Where a note goes on a SHIFT project canvas, COPIED from
 * lib/whiteboard/shift-cards.ts (SHIFT_CARD_WIDTH/HEIGHT, the zone padding,
 * isPlacementObstacle, zoneFreeSlot and zoneSlot), because the bot may not
 * import lib/whiteboard (it pulls in zod, which the bot image does not ship).
 * lib/elemental/__tests__/canvas.test.ts holds the copies equal to the
 * originals, so a change there fails the tests until it is made here too.
 */

export type Box = { x: number; y: number; width: number; height: number };

/** A note on the project canvas: sticky-sized, so a zone holds several side by side. */
export const SHIFT_CARD_WIDTH = 240;
export const SHIFT_CARD_HEIGHT = 200;
/** Room at the top of a zone for its title and question. */
export const ZONE_HEADER = 96;
export const ZONE_PAD = 24;
export const SLOT_GAP = 24;

/** Bigger than this is a background zone or a frame, which cards may sit on. */
const MAX_OBSTACLE_AREA = 500 * 500;
const OBSTACLE_TYPES = new Set(["rectangle", "ellipse", "diamond", "image", "embeddable", "text"]);

type Placed = Box & {
  type: string;
  isDeleted?: boolean;
  containerId?: string | null;
  customData?: Record<string, unknown> | null;
};

/** Whether a new note should avoid this element: notes, images and loose text, not zones, their labels or frames. */
export const isPlacementObstacle = (el: Placed) =>
  !el.isDeleted &&
  OBSTACLE_TYPES.has(el.type) &&
  !el.containerId &&
  !el.customData?.zone &&
  !el.customData?.zoneLabel &&
  !el.customData?.canvasHint &&
  el.width * el.height <= MAX_OBSTACLE_AREA;

export const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** The part of a zone notes go in: below its title, inside its padding. */
export const zoneInner = (zone: Box): Box => ({
  x: zone.x + ZONE_PAD,
  y: zone.y + ZONE_HEADER,
  width: zone.width - 2 * ZONE_PAD,
  height: zone.height - ZONE_HEADER - ZONE_PAD / 2,
});

/**
 * The centre of the first free note-sized slot in a zone, reading from its
 * top-left below the title, line by line however tall the zone has grown.
 * Null when the zone is full.
 */
export function zoneFreeSlot(zone: Box, obstacles: readonly Box[]): { x: number; y: number } | null {
  const inner = zoneInner(zone);
  const size = { width: SHIFT_CARD_WIDTH, height: SHIFT_CARD_HEIGHT };
  for (let top = inner.y; top + size.height <= inner.y + inner.height; top += size.height + SLOT_GAP) {
    for (let left = inner.x; left + size.width <= inner.x + inner.width; left += size.width + SLOT_GAP) {
      const box = { x: left, y: top, ...size };
      if (!obstacles.some((o) => overlaps(o, box))) return { x: left + size.width / 2, y: top + size.height / 2 };
    }
  }
  return null;
}

/**
 * Where a new note goes in a zone: its first free slot. A zone still full
 * (one that could not grow) gets the note cascaded over its first slot, so the
 * click still does something visible.
 */
export function zoneSlot(zone: Box, obstacles: readonly Box[], count = 0): { x: number; y: number } {
  const free = zoneFreeSlot(zone, obstacles);
  if (free) return free;
  const inner = zoneInner(zone);
  const step = 20 * ((count % 5) + 1);
  return { x: inner.x + SHIFT_CARD_WIDTH / 2 + step, y: inner.y + SHIFT_CARD_HEIGHT / 2 + step };
}
