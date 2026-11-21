/**
 * The Elemental island's two tile layouts, built on SHIFT's 200-slot island
 * (imported read-only from bot/src/quests/island/scene.ts):
 *
 * - landscape: SHIFT's own tile grid for 200 slots, 100 x 56 tiles
 *   (1600 x 896 px at scale 1), for Discord.
 * - portrait: the same tiles with (col, row) transposed, 56 x 100 tiles
 *   (896 x 1600 px at scale 1), so the island fills a 1080 x 1920 card at
 *   integer scale. Sprites stay upright: a shore tile's sprite is turned to
 *   face the same water (north <-> west, south <-> east), and each tree's
 *   4 x 4 footprint (the tiles SHIFT checks for land) lands on the transposed
 *   footprint, so every tree stays on land.
 *
 * Pure data, no drawing: E10's compositor rasterizes it. Cached per
 * orientation; callers must not change what they get.
 */
import {
  RenderError,
  SPOTS,
  TILE,
  TILE_BY_CODE,
  TILE_CODES,
  buildScene,
  layoutFor as shiftLayoutFor,
  type Spot,
  type TileKey,
} from "../../../bot/src/quests/island/scene";

import { ELEMENTAL_SLOTS, sectorAtOffset, type SectorElement } from "./sectors";

export type Orientation = "landscape" | "portrait";
export const ORIENTATIONS: readonly Orientation[] = ["landscape", "portrait"];

/** A rectangle in tiles. */
export interface TileBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A rectangle in native pixels (scale 1). */
export interface PixelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ElementalLayout {
  orientation: Orientation;
  /** Tile size in native pixels (16). */
  tile: number;
  cols: number;
  rows: number;
  /** cols * tile and rows * tile: the image at scale 1. */
  width: number;
  height: number;
  /** land[row][col]. */
  land: readonly (readonly boolean[])[];
  /** cols * rows SHIFT tile codes (TILE_CODES values), row-major; sprites named by tileAt. */
  tiles: string;
  /** The plaza in tiles; its centre tile corner is (pcx, pcy). */
  plaza: TileBox;
  pcx: number;
  pcy: number;
  /** The smallest box holding every land tile, in tiles and in pixels: crop to it for a tight picture. */
  landBox: TileBox;
  landBoxPx: PixelBox;
}

/** Shore sprites after a transpose: the water that was north of a tile is now west of it. */
const TRANSPOSED_TILE: Readonly<Partial<Record<TileKey, TileKey>>> = {
  shore_n: "shore_w",
  shore_w: "shore_n",
  shore_s: "shore_e",
  shore_e: "shore_s",
};

/** SHIFT's tile codes for its 200-slot island: built once from a single plain plot at slot 200 (no name, nothing drawn on it). */
function shiftTiles(): string {
  return buildScene([{ slot: ELEMENTAL_SLOTS, stage: 0, visitor: false, key: false, helper: false, lantern: false, name: null, mine: false, plain: true }]).tiles;
}

function landBoxOf(land: readonly (readonly boolean[])[]): TileBox {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  land.forEach((row, y) =>
    row.forEach((isLand, x) => {
      if (!isLand) return;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    })
  );
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function finish(base: Omit<ElementalLayout, "landBox" | "landBoxPx" | "width" | "height">): ElementalLayout {
  const landBox = landBoxOf(base.land);
  const t = base.tile;
  return {
    ...base,
    width: base.cols * t,
    height: base.rows * t,
    landBox,
    landBoxPx: { x: landBox.x * t, y: landBox.y * t, w: landBox.w * t, h: landBox.h * t },
  };
}

function buildLandscape(): ElementalLayout {
  const shift = shiftLayoutFor(ELEMENTAL_SLOTS);
  return finish({
    orientation: "landscape",
    tile: TILE,
    cols: shift.cols,
    rows: shift.rows,
    land: shift.land.map((row) => [...row]),
    tiles: shiftTiles(),
    plaza: { ...shift.plaza },
    pcx: shift.pcx,
    pcy: shift.pcy,
  });
}

function buildPortrait(landscape: ElementalLayout): ElementalLayout {
  const { cols, rows } = landscape;
  const land = Array.from({ length: cols }, (_, y) => Array.from({ length: rows }, (_, x) => landscape.land[x][y]));
  let tiles = "";
  for (let y = 0; y < cols; y++) {
    for (let x = 0; x < rows; x++) {
      const name = TILE_BY_CODE[landscape.tiles[x * cols + y]];
      tiles += TILE_CODES[TRANSPOSED_TILE[name] ?? name];
    }
  }
  const p = landscape.plaza;
  return finish({
    orientation: "portrait",
    tile: landscape.tile,
    cols: rows,
    rows: cols,
    land,
    tiles,
    plaza: { x: p.y, y: p.x, w: p.h, h: p.w },
    pcx: landscape.pcy,
    pcy: landscape.pcx,
  });
}

const cache = new Map<Orientation, ElementalLayout>();

/** The fixed 200-slot island in this orientation. */
export function elementalLayout(orientation: Orientation): ElementalLayout {
  let layout = cache.get(orientation);
  if (!layout) {
    const landscape = cache.get("landscape") ?? buildLandscape();
    cache.set("landscape", landscape);
    layout = orientation === "portrait" ? buildPortrait(landscape) : landscape;
    cache.set(orientation, layout);
  }
  return layout;
}

/** The sprite name of the tile at (x, y) in this layout. */
export function tileAt(layout: ElementalLayout, x: number, y: number): TileKey {
  return TILE_BY_CODE[layout.tiles[y * layout.cols + x]];
}

function checkSlot(slot: number): void {
  if (!Number.isInteger(slot) || slot < 1 || slot > ELEMENTAL_SLOTS) throw new RenderError("bad_plot", `slot ${String(slot)}`);
}

/**
 * A slot's spot in tiles from the plaza centre, in this orientation: the
 * tree's left column and base row, as SHIFT's Spot. Landscape is SHIFT's own
 * spot; portrait puts the tree's 4 x 4 footprint on the transposed one.
 */
export function spotFor(slot: number, orientation: Orientation): Spot {
  checkSlot(slot);
  const s = SPOTS[slot - 1];
  return orientation === "portrait" ? { x: s.y - 1, y: s.x + 1 } : { x: s.x, y: s.y };
}

/**
 * Where a slot's tree stands, in native pixels at scale 1: cx is the tree's
 * centre column, baseY the bottom of its sprite (the soil line, where the
 * number tag's top edge goes). A sprite of width w and height h is drawn at
 * (cx - floor(w / 2), baseY - h), exactly as SHIFT places its trees.
 */
export function treeBase(layout: ElementalLayout, slot: number): { cx: number; baseY: number } {
  const spot = spotFor(slot, layout.orientation);
  return { cx: (layout.pcx + spot.x + 1) * layout.tile, baseY: (layout.pcy + spot.y + 1) * layout.tile };
}

/** The plaza centre in native pixels (where SHIFT centres its well). */
export function plazaCentrePx(layout: ElementalLayout): { x: number; y: number } {
  return { x: layout.pcx * layout.tile, y: layout.pcy * layout.tile };
}

/** The sector a tile's centre falls in (for sector masks), in either orientation. */
export function sectorOfTile(layout: ElementalLayout, x: number, y: number): SectorElement {
  const dx = x + 0.5 - layout.pcx;
  const dy = y + 0.5 - layout.pcy;
  return layout.orientation === "portrait" ? sectorAtOffset(dy, dx) : sectorAtOffset(dx, dy);
}
