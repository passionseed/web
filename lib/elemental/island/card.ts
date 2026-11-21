/**
 * The nightly 9:16 pixel card: a 1080 x 1920 PNG for the 20:30 post (E19),
 * and the fallback whenever the Thai next/og card (E24) is off or fails.
 *
 * - Top: the PORTRAIT island at scale 1 (renderIslandPixels), cropped to its
 *   land box (720 x 1424) and centred. Copied pixel for pixel: no resampling,
 *   so every plot tag keeps its 2 x 2 digit pixels. The sea around the crop
 *   is drawn with SHIFT's own open-water choice (openWaterTile), on the same
 *   tile grid, so it continues the island's water without a seam.
 * - Band below: people helped (a visitor icon) and teams checked in today (a
 *   lantern icon) in big pixel digits, the top element's flag, and 5 level
 *   bars in element colours with each level's digits.
 *
 * Digits only: no letters, no fonts and no names. Thai lines and the project
 * legend go in the Discord message text. Pure and deterministic.
 */
import { openWaterTile } from "../../../bot/src/quests/island/scene";
import { ELEMENT_COLOURS } from "../../../bot/assets/elemental/sprites";

import { elementalLayout } from "./layout";
import { digitsSize, drawDigits, DIGIT_INK } from "./pixelFont";
import { encodePng, renderIslandPixels, type ElementalRenderOptions } from "./render";
import type { ElementalScene } from "./scene";
import { SECTOR_ORDER, type SectorElement } from "./sectors";
import { bitmap, hexRgba, Surface, type RGBA } from "./surface";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;

/** The island to draw: the scene's plots, and optionally healing's health per sector (healthFor). */
export interface CardIsland extends Pick<ElementalScene, "plots"> {
  health?: ElementalRenderOptions["health"];
}

/** Everything the card shows. Numbers and element keys only: no names, no text. */
export interface CardProps {
  island: CardIsland;
  /** People helped: counted tester entries (elemental_bot_totals.helped). */
  helped: number;
  /** Teams checked in today (elemental_bot_totals.checked_in). */
  checkedIn: number;
  /** Today's top element (elemental_bot_totals.top_element); null draws an empty frame. */
  topElement: SectorElement | null;
  /** Level per element (elemental_bot_totals.levels); a missing element is 0. */
  levels: Partial<Record<SectorElement, number>>;
}

/** Biggest number the card draws; anything larger shows as this (5 digits fit every slot). */
export const MAX_SHOWN = 99_999;

/** The tile size the island is drawn on (SHIFT's 16 px). */
const TILE = elementalLayout("portrait").tile;

/** Where the cropped island sits on the card: centred across, 32 px from the top, above the band. */
const BAND_Y = 1488;
const ISLAND_TOP = 32;

const SIDE = 48;
const BAND: RGBA = [24, 28, 38, 255];
const BAND_EDGE: RGBA = hexRgba("#344447")!;
const FRAME_FILL: RGBA = [32, 38, 50, 255];
const TRACK: RGBA = [44, 50, 64, 255];

/** Row A: the two big numbers. */
const ROW_A_Y = BAND_Y + 48;
const ROW_A_H = 84;
const BIG_GLYPH = 16;
const ICON_SCALE = 6;
const ICON_GAP = 24;

/** Row B: the top element's frame and the 5 level bars. */
const ROW_B_Y = ROW_A_Y + ROW_A_H + 48;
const ROW_B_H = 208;
const FRAME_W = 168;
const FLAG_SCALE = 8;
const BAR_X = SIDE + FRAME_W + SIDE;
const BAR_ROW = 32;
const BAR_STEP = 44;
const BAR_FLAG_SCALE = 2;
const LEVEL_GLYPH = 4;
const LEVEL_DIGITS_W = digitsSize(MAX_SHOWN, LEVEL_GLYPH).w;
const TRACK_X = BAR_X + 9 * BAR_FLAG_SCALE + 16;
const TRACK_W = CARD_WIDTH - SIDE - LEVEL_DIGITS_W - 16 - TRACK_X;
const TRACK_H = 20;

/** Where the island crop lands on the card, and which part of the portrait island it is. */
export function cardIslandRect(): { x: number; y: number; w: number; h: number; crop: { x: number; y: number; w: number; h: number } } {
  const crop = elementalLayout("portrait").landBoxPx;
  return { x: Math.floor((CARD_WIDTH - crop.w) / 2), y: ISLAND_TOP, w: crop.w, h: crop.h, crop: { ...crop } };
}

/** A whole number 0..MAX_SHOWN; anything that is not a finite number 0 or more is 0. */
function shown(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), MAX_SHOWN) : 0;
}

function isElement(value: unknown): value is SectorElement {
  return typeof value === "string" && (SECTOR_ORDER as readonly string[]).includes(value);
}

/**
 * The element with the highest count; a tie goes to the earlier element in
 * the fixed order (water, earth, air, fire, aether), as elemental_bot_totals
 * picks top_element. Null when no element is above 0.
 */
export function topElementOf(counts: Partial<Record<SectorElement, number>>): SectorElement | null {
  let best: SectorElement | null = null;
  let most = 0;
  for (const e of SECTOR_ORDER) {
    const n = shown(counts?.[e]);
    if (n > most) {
      best = e;
      most = n;
    }
  }
  return best;
}

/** Draws a sprite at an integer scale s (each sprite pixel an s x s block). */
function spriteAt(surface: Surface, name: string, x: number, y: number, s: number): void {
  const b = bitmap(name);
  for (let j = 0; j < b.h; j++) {
    for (let i = 0; i < b.w; i++) {
      const v = b.px[j * b.w + i];
      if (v === 0) continue;
      for (let dy = 0; dy < s; dy++) {
        const ty = y + j * s + dy;
        if (ty < 0 || ty >= surface.height) continue;
        for (let dx = 0; dx < s; dx++) {
          const tx = x + i * s + dx;
          if (tx >= 0 && tx < surface.width) surface.px[ty * surface.width + tx] = v;
        }
      }
    }
  }
}

/** The sea behind the island: SHIFT's open water on the crop's tile grid, transposed as the portrait layout is. */
function drawSea(surface: Surface, at: ReturnType<typeof cardIslandRect>): void {
  const landscape = elementalLayout("landscape");
  // Card pixel of the portrait island's (0, 0): a whole number of tiles from the crop.
  const ox = at.x - at.crop.x;
  const oy = at.y - at.crop.y;
  const first = (o: number) => -Math.ceil(o / TILE);
  for (let ty = first(oy); oy + ty * TILE < BAND_Y; ty++) {
    for (let tx = first(ox); ox + tx * TILE < CARD_WIDTH; tx++) {
      // Portrait tile (tx, ty) is landscape tile (ty, tx).
      surface.sprite(openWaterTile(landscape, ty, tx), ox + tx * TILE, oy + ty * TILE);
    }
  }
}

/** Copies the land box of the portrait island onto the card, row by row, at scale 1. */
function drawIsland(surface: Surface, island: CardIsland, at: ReturnType<typeof cardIslandRect>): void {
  const pixels = renderIslandPixels({ plots: island?.plots }, { layout: "portrait", health: island?.health });
  const { crop } = at;
  for (let j = 0; j < crop.h; j++) {
    const from = (crop.y + j) * pixels.width + crop.x;
    surface.px.set(pixels.px.subarray(from, from + crop.w), (at.y + j) * CARD_WIDTH + at.x);
  }
}

/** An icon and a big number, centred in the column [x0, x1). */
function drawCount(surface: Surface, icon: string, n: number, x0: number, x1: number): void {
  const box = bitmap(icon);
  const iw = box.w * ICON_SCALE;
  const ih = box.h * ICON_SCALE;
  const d = digitsSize(n, BIG_GLYPH);
  const left = x0 + Math.floor((x1 - x0 - (iw + ICON_GAP + d.w)) / 2);
  spriteAt(surface, icon, left, ROW_A_Y + Math.floor((ROW_A_H - ih) / 2), ICON_SCALE);
  drawDigits(surface, n, left + iw + ICON_GAP, ROW_A_Y + Math.floor((ROW_A_H - d.h) / 2), BIG_GLYPH);
}

function frame(surface: Surface, x: number, y: number, w: number, h: number): void {
  surface.rect(x, y, w, h, BAND_EDGE);
  surface.rect(x + 4, y + 4, w - 8, h - 8, FRAME_FILL);
}

function drawTop(surface: Surface, top: SectorElement | null): void {
  frame(surface, SIDE, ROW_B_Y, FRAME_W, ROW_B_H);
  if (!top) return;
  const flag = bitmap(`flag_${top}`);
  spriteAt(
    surface,
    `flag_${top}`,
    SIDE + Math.floor((FRAME_W - flag.w * FLAG_SCALE) / 2),
    ROW_B_Y + Math.floor((ROW_B_H - flag.h * FLAG_SCALE) / 2),
    FLAG_SCALE
  );
}

/** Five rows in the fixed order: the element's flag, a bar scaled to the highest level, and the level's digits. */
function drawLevels(surface: Surface, levels: CardProps["levels"]): void {
  const values = SECTOR_ORDER.map((e) => shown(levels?.[e]));
  const most = Math.max(1, ...values);
  SECTOR_ORDER.forEach((element, k) => {
    const y = ROW_B_Y + k * BAR_STEP;
    spriteAt(surface, `flag_${element}`, BAR_X, y, BAR_FLAG_SCALE);
    const ty = y + Math.floor((BAR_ROW - TRACK_H) / 2);
    surface.rect(TRACK_X, ty, TRACK_W, TRACK_H, TRACK);
    const n = values[k];
    if (n > 0) {
      const w = Math.max(4, Math.floor((TRACK_W * n) / most));
      surface.rect(TRACK_X, ty, w, TRACK_H, hexRgba(ELEMENT_COLOURS[element].cloth)!);
      surface.rect(TRACK_X, ty + TRACK_H - 4, w, 4, hexRgba(ELEMENT_COLOURS[element].mark)!);
    }
    const d = digitsSize(n, LEVEL_GLYPH);
    drawDigits(surface, n, CARD_WIDTH - SIDE - d.w, ty, LEVEL_GLYPH, DIGIT_INK);
  });
}

export interface CardPixels {
  /** Packed RGBA, row-major (SHIFT's packing; encodePng reads it). */
  px: Uint32Array;
  width: typeof CARD_WIDTH;
  height: typeof CARD_HEIGHT;
}

/**
 * The card's pixels before PNG encoding. Reads props field by field; numbers
 * that are not whole and 0 or more draw as 0. Throws like renderIslandPixels
 * (ElementalSceneError, RenderError) for a bad plot.
 */
export function cardPixels(props: CardProps): CardPixels {
  const surface = new Surface(CARD_WIDTH, CARD_HEIGHT);
  const at = cardIslandRect();
  drawSea(surface, at);
  drawIsland(surface, props?.island, at);

  surface.rect(0, BAND_Y, CARD_WIDTH, CARD_HEIGHT - BAND_Y, BAND);
  surface.rect(0, BAND_Y, CARD_WIDTH, 4, BAND_EDGE);
  const mid = CARD_WIDTH / 2;
  drawCount(surface, "visitor", shown(props?.helped), SIDE, mid);
  drawCount(surface, "lantern", shown(props?.checkedIn), mid, CARD_WIDTH - SIDE);
  drawTop(surface, isElement(props?.topElement) ? props.topElement : null);
  drawLevels(surface, props?.levels);

  return { px: surface.px, width: CARD_WIDTH, height: CARD_HEIGHT };
}

/** The nightly card as a 1080 x 1920 PNG. Throws like cardPixels. */
export function cardPng(props: CardProps): Buffer {
  return encodePng(cardPixels(props).px, CARD_WIDTH, CARD_HEIGHT);
}
