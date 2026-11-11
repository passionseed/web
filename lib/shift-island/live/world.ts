/**
 * The full-screen island: how big the island is drawn, where it sits in the
 * scrollable world, and what part of the (endless) sea the canvas covers.
 * Pure and client-safe; IslandViewport feeds it the screen and reads the
 * answer back as CSS px and native px.
 *
 * - Crisp: every native pixel covers a whole number of device pixels, and the
 *   island and the canvas start on the device pixel grid.
 * - Near (the default): at least the usual ~2x (pxPerNativeFor), larger when
 *   the whole island fits between the HUD bars at a bigger integer scale.
 * - Whole: the largest integer scale that fits the island between the bars
 *   (at least one device pixel per native pixel).
 * - The world is never smaller than the screen; a bigger island adds a strip
 *   of sea on every side so no plot has to sit under the HUD.
 */
import { pxPerNativeFor, type Rect } from "./geometry";

/** Room kept clear for the HUD, in CSS px, on top of the safe-area insets. */
export const HUD_RESERVE = { top: 64, bottom: 96, side: 12 } as const;

/** The most CSS px per native pixel in near mode: past this the art turns into big blocks. */
const MAX_SCALE = 6;

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface WorldInput {
  /** The screen (the world's scroller), CSS px. */
  viewW: number;
  viewH: number;
  dpr: number;
  /** The island picture, native px. */
  sceneW: number;
  sceneH: number;
  /** Safe-area insets, CSS px. */
  safe: Insets;
  whole: boolean;
}

export interface WorldLayout {
  /** CSS px per native pixel. */
  scale: number;
  /** The scrollable world, CSS px: at least the screen. */
  world: { w: number; h: number };
  /** The island picture inside the world, CSS px. */
  island: Rect;
  /** What the canvas draws, native px relative to the scene (may start below 0 and reach past it). */
  frame: Rect;
  /** Where the canvas sits in the world, CSS px; it overhangs the world by less than one native pixel. */
  canvas: Rect;
  /** True when the whole island fits between the HUD bars. */
  fits: boolean;
}

const finite = (v: number, fallback: number) => (Number.isFinite(v) && v > 0 ? v : fallback);

/** Rounds a CSS length to the device pixel grid. */
function snap(v: number, dpr: number): number {
  return Math.round(v * dpr) / dpr;
}

/** The scale for the island: integer device pixels per native pixel. */
export function worldScale(input: WorldInput): number {
  const dpr = finite(input.dpr, 1);
  const availW = Math.max(1, input.viewW - input.safe.left - input.safe.right - 2 * HUD_RESERVE.side);
  const availH = Math.max(1, input.viewH - input.safe.top - input.safe.bottom - HUD_RESERVE.top - HUD_RESERVE.bottom);
  const fitDevice = Math.floor(Math.min((availW * dpr) / input.sceneW, (availH * dpr) / input.sceneH));
  const base = pxPerNativeFor(dpr);
  const cap = Math.max(base, Math.floor(MAX_SCALE * dpr) / dpr);
  if (input.whole) return Math.min(cap, Math.max(1, fitDevice) / dpr);
  return Math.min(cap, Math.max(base, fitDevice / dpr));
}

export function worldLayout(input: WorldInput): WorldLayout {
  const dpr = finite(input.dpr, 1);
  const viewW = Math.max(1, input.viewW);
  const viewH = Math.max(1, input.viewH);
  const scale = worldScale({ ...input, dpr });
  const iw = input.sceneW * scale;
  const ih = input.sceneH * scale;

  const left = input.safe.left + HUD_RESERVE.side;
  const right = input.safe.right + HUD_RESERVE.side;
  const top = input.safe.top + HUD_RESERVE.top;
  const bottom = input.safe.bottom + HUD_RESERVE.bottom;

  const fitsX = iw + left + right <= viewW;
  const fitsY = ih + top + bottom <= viewH;
  const worldW = fitsX ? viewW : Math.ceil(iw + left + right);
  const worldH = fitsY ? viewH : Math.ceil(ih + top + bottom);
  const x = snap(fitsX ? left + (viewW - left - right - iw) / 2 : left, dpr);
  const y = snap(fitsY ? top + (viewH - top - bottom - ih) / 2 : top, dpr);

  // Whole native pixels from the world's top-left corner to its bottom-right one.
  const fx = -Math.ceil(x / scale - 1e-9);
  const fy = -Math.ceil(y / scale - 1e-9);
  const fw = Math.ceil((worldW - x) / scale - 1e-9) - fx;
  const fh = Math.ceil((worldH - y) / scale - 1e-9) - fy;

  return {
    scale,
    world: { w: worldW, h: worldH },
    island: { x, y, w: iw, h: ih },
    frame: { x: fx, y: fy, w: fw, h: fh },
    canvas: { x: snap(x + fx * scale, dpr), y: snap(y + fy * scale, dpr), w: snap(fw * scale, dpr), h: snap(fh * scale, dpr) },
    fits: fitsX && fitsY,
  };
}

/**
 * Where to scroll so a point of the island (percent of its width and height)
 * sits in the middle of the room between the HUD bars. Clamped to the world.
 */
export function scrollToCentre(
  layout: WorldLayout,
  view: { w: number; h: number },
  point: { x: number; y: number },
  safe: Insets
): { left: number; top: number } {
  const top = safe.top + HUD_RESERVE.top;
  const bottom = safe.bottom + HUD_RESERVE.bottom;
  const cx = layout.island.x + (point.x / 100) * layout.island.w;
  const cy = layout.island.y + (point.y / 100) * layout.island.h;
  const roomMid = top + (view.h - top - bottom) / 2;
  const clamp = (v: number, max: number) => Math.round(Math.min(Math.max(0, v), Math.max(0, max)));
  return {
    left: clamp(cx - view.w / 2, layout.world.w - view.w),
    top: clamp(cy - roomMid, layout.world.h - view.h),
  };
}
