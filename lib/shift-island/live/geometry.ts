/**
 * Rectangles for the living island, in the scene's native pixels: which part
 * is on screen, which tiles that covers, and what a scroll newly reveals.
 * Pure and client-safe.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * CSS pixels per native pixel for the island: about 2x, rounded so each
 * native pixel covers a whole number of device pixels (crisp, even squares).
 */
export function pxPerNativeFor(dpr: number): number {
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  return Math.max(1, Math.round(2 * ratio)) / ratio;
}

export function intersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  return x1 > x && y1 > y ? { x, y, w: x1 - x, h: y1 - y } : null;
}

export function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Outward to whole pixels. */
export function snap(r: Rect): Rect {
  const x = Math.floor(r.x);
  const y = Math.floor(r.y);
  return { x, y, w: Math.ceil(r.x + r.w) - x, h: Math.ceil(r.y + r.h) - y };
}

/**
 * The part of the picture on screen, in native pixels: `box` is the picture's
 * box and `view` the scroller's client area, both from getBoundingClientRect
 * (CSS pixels); `bounds` is what the canvas shows (the crop, or the whole
 * scene). Grown by `margin` native pixels so rounding never leaves a seam.
 * Null when none of it is on screen.
 */
export function visibleRect(
  box: { left: number; top: number; width: number; height: number },
  view: { left: number; top: number; width: number; height: number },
  bounds: Rect,
  margin = 0
): Rect | null {
  if (box.width <= 0 || box.height <= 0) return null;
  const sx = box.width / bounds.w;
  const sy = box.height / bounds.h;
  const x0 = Math.max(view.left, box.left) - box.left;
  const y0 = Math.max(view.top, box.top) - box.top;
  const x1 = Math.min(view.left + view.width, box.left + box.width) - box.left;
  const y1 = Math.min(view.top + view.height, box.top + box.height) - box.top;
  if (x1 <= x0 || y1 <= y0) return null;
  const native = snap({ x: bounds.x + x0 / sx - margin, y: bounds.y + y0 / sy - margin, w: (x1 - x0) / sx + 2 * margin, h: (y1 - y0) / sy + 2 * margin });
  return intersect(native, bounds);
}

/** Tiles a rectangle touches: columns c0..c1-1 and rows r0..r1-1, clamped to the island. */
export function cellRange(r: Rect, cols: number, rows: number, tile: number): { c0: number; r0: number; c1: number; r1: number } {
  return {
    c0: Math.max(0, Math.floor(r.x / tile)),
    r0: Math.max(0, Math.floor(r.y / tile)),
    c1: Math.min(cols, Math.ceil((r.x + r.w) / tile)),
    r1: Math.min(rows, Math.ceil((r.y + r.h) / tile)),
  };
}

/** Tiles a rectangle touches, unclamped: the open sea goes on past the island in every direction. */
export function cellSpan(r: Rect, tile: number): { c0: number; r0: number; c1: number; r1: number } {
  return {
    c0: Math.floor(r.x / tile),
    r0: Math.floor(r.y / tile),
    c1: Math.ceil((r.x + r.w) / tile),
    r1: Math.ceil((r.y + r.h) / tile),
  };
}

/** The parts of `next` that `prev` did not cover (at most four strips; none when prev holds next). */
export function exposed(prev: Rect | null, next: Rect): Rect[] {
  const common = prev ? intersect(prev, next) : null;
  if (!common) return [next];
  const out: Rect[] = [];
  const add = (x: number, y: number, w: number, h: number) => {
    if (w > 0 && h > 0) out.push({ x, y, w, h });
  };
  // Above and below the common part, full width; then left and right of it.
  add(next.x, next.y, next.w, common.y - next.y);
  add(next.x, common.y + common.h, next.w, next.y + next.h - (common.y + common.h));
  add(next.x, common.y, common.x - next.x, common.h);
  add(common.x + common.w, common.y, next.x + next.w - (common.x + common.w), common.h);
  return out;
}

export function area(r: Rect): number {
  return r.w * r.h;
}
