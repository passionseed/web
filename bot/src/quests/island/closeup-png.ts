/**
 * The team's tree as Discord pictures: the close-up (🔍), a gift's options
 * side by side, and the four seeds. Drawn from lib/shift-island/tree-closeup.ts,
 * the same pixel grid as the website's canvas, and encoded with the island
 * picture's own PNG encoder. Pure: no Discord or database calls.
 */
import {
  closeupGrid,
  cropGrid,
  gridToRgba,
  previewView,
  wearItem,
  type CloseupInput,
  type CloseupView,
  type PixelGrid,
} from "@/lib/shift-island/tree-closeup";
import { SEEDS, treeItem, type SeedId } from "@/lib/shift-island/tree-style";

import { encodePng } from "./render";

/** A preview panel: the close-up's "tree" window (96 x 96), or its canopy window at twice the size. */
const PANEL = 96;
/** Grid pixels between the panels and around them. */
const GAP = 4;
/** The frame between panels: the close-up's own deep soil. */
const FRAME = "#4E3829";
/** Screen pixels per grid pixel in the side-by-side pictures. */
const PREVIEW_SCALE = 3;

/** The close-up's grid as a PNG, scale screen pixels per grid pixel (a whole number). */
function toPng(grid: PixelGrid, scale: number): Buffer {
  const { width, height, data } = gridToRgba(grid, scale);
  return encodePng(new Uint32Array(data.buffer, data.byteOffset, data.length / 4), width, height);
}

/** Every pixel repeated k times across and down. */
function magnify(grid: PixelGrid, k: number): PixelGrid {
  if (k <= 1) return grid;
  return grid.flatMap((row) => {
    const wide = row.flatMap((pixel) => Array<string | null>(k).fill(pixel));
    return Array.from({ length: k }, () => [...wide]);
  });
}

/** One look on the tree: a shape as a close look at the leaves, anything else as the whole tree. */
function panelOf(input: CloseupInput, view: CloseupView, scale: number): PixelGrid {
  return magnify(cropGrid(closeupGrid(input), view), scale);
}

/** Panels of PANEL x PANEL in one row, framed. */
function sideBySide(panels: PixelGrid[]): PixelGrid {
  const width = panels.length * PANEL + (panels.length + 1) * GAP;
  const out: PixelGrid = Array.from({ length: PANEL + 2 * GAP }, () => Array<string | null>(width).fill(FRAME));
  panels.forEach((panel, k) => {
    const left = GAP + k * (PANEL + GAP);
    panel.slice(0, PANEL).forEach((row, y) => row.slice(0, PANEL).forEach((pixel, x) => (out[GAP + y][left + x] = pixel)));
  });
  return out;
}

/** The team's tree close-up (96 x 150 grid pixels, sky, tree and roots) as a PNG. */
export function closeupPng(input: CloseupInput, scale = 4): Buffer {
  return toPng(closeupGrid(input), scale);
}

/**
 * A gift's options side by side, left to right in the options' order: each
 * the team's own tree (base) wearing that item, at a stage where it shows.
 * Ids the catalog does not have are left out. Throws when none is left.
 */
export function giftPreviewPng(base: CloseupInput, options: string[]): Buffer {
  const panels = options.flatMap((id) => {
    const item = treeItem(id);
    const look = wearItem(base, id);
    if (!item || !look) return [];
    const { view, scale } = previewView(item.slot);
    return [panelOf(look, view, scale)];
  });
  if (!panels.length) throw new RangeError("giftPreviewPng: no option the catalog knows");
  return toPng(sideBySide(panels), PREVIEW_SCALE);
}

/** The four seeds grown (stage 7), left to right in SEEDS order: the order of their buttons. */
export const SEED_ORDER = Object.keys(SEEDS) as SeedId[];

let seedPicture: Buffer | null = null;

/** The four seeds as one picture: the same for everyone, drawn once. */
export function seedPreviewPng(): Buffer {
  seedPicture ??= toPng(
    sideBySide(
      SEED_ORDER.map((seed) =>
        panelOf({ style: SEEDS[seed].style, stage: 7, seeded: true, roots: { count: 0, recent: 0 } }, "tree", 1)
      )
    ),
    PREVIEW_SCALE
  );
  return seedPicture;
}
