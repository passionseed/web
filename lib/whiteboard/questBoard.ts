/**
 * The quest view's layout: each student's work for one quest becomes a block,
 * and the blocks are packed in rows (shelves), so a mentor sees everyone's work
 * side by side, whatever corner of the board each person worked in.
 */

export type Box = { x: number; y: number; width: number; height: number };
export type Placed = Box & { key: string };

/** Space inside a block around the work, and between blocks, in scene units. */
export const BLOCK_PAD = 40;
export const BLOCK_GAP = 120;
/** Room above each block for the name, at the smallest name size. */
export const NAME_ROOM = 70;

/**
 * How big names are: readable when the whole layout is in view, so they grow
 * with how wide it is. Each block has 1.5 names' height of room above it.
 */
export function nameSize(layoutWidth: number) {
  return Math.round(Math.max(36, Math.min(200, layoutWidth / 30)));
}

/**
 * Places blocks of the given sizes left to right in rows about as wide as the
 * whole set is tall, so the result is roughly square. Keeps the input order.
 */
export function packBlocks(sizes: readonly { key: string; width: number; height: number }[], nameRoom = NAME_ROOM): Placed[] {
  if (sizes.length === 0) return [];
  const NAME = nameRoom;
  const area = sizes.reduce((sum, s) => sum + (s.width + BLOCK_GAP) * (s.height + NAME + BLOCK_GAP), 0);
  const rowWidth = Math.max(Math.sqrt(area) * 1.4, ...sizes.map((s) => s.width));
  const out: Placed[] = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  for (const s of sizes) {
    if (x > 0 && x + s.width > rowWidth) {
      x = 0;
      y += rowHeight + NAME + BLOCK_GAP;
      rowHeight = 0;
    }
    out.push({ key: s.key, x, y: y + NAME, width: s.width, height: s.height });
    x += s.width + BLOCK_GAP;
    rowHeight = Math.max(rowHeight, s.height);
  }
  return out;
}
