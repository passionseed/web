import { EL } from "./brand";

/**
 * Pixel generators for the Elemental key visual. Everything is seeded, so
 * the server render and every export are identical.
 */

export interface Cell {
  x: number;
  y: number;
  s: number;
  fill: string;
  o: number;
}

export interface Glyph {
  x: number;
  y: number;
  ch: string;
  size: number;
  fill: string;
  rotate: number;
}

/** mulberry32: small, fast, seeded. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, weighted: [T, number][]): T {
  const total = weighted.reduce((s, [, w]) => s + w, 0);
  let n = r() * total;
  for (const [v, w] of weighted) {
    n -= w;
    if (n <= 0) return v;
  }
  return weighted[weighted.length - 1][0];
}

/** The spine the flame column follows as it rises and breaks up. */
export interface Spine {
  baseX: number;
  baseY: number;
  topY: number;
  lean: number;
}

export function spineX(sp: Spine, t: number): number {
  return sp.baseX + sp.lean * Math.pow(t, 1.4) + 18 * Math.sin(t * 6.2);
}

/**
 * The flame column as a pixel mosaic: dense and warm near the fire, sparse,
 * white and checkered (smoke, Air) near the top, with water-blue glitches.
 */
export function flameColumn(sp: Spine, cell = 12, seed = 11): Cell[] {
  const r = rng(seed);
  const out: Cell[] = [];
  const span = sp.baseY - sp.topY;
  for (let y = sp.topY; y <= sp.baseY; y += cell) {
    const t = (sp.baseY - y) / span;
    const cx = spineX(sp, t);
    const hw = 30 + 96 * Math.pow(1 - t, 1.3);
    for (let x = cx - hw; x <= cx + hw; x += cell) {
      const gx = Math.round(x / cell);
      const gy = Math.round(y / cell);
      const d = Math.abs(x - cx) / hw;
      // Real fire at the base, pixels from about a fifth of the way up.
      const rise = Math.min(1, Math.max(0, (t - 0.1) / 0.24));
      const p = rise * (0.92 * Math.pow(1 - t, 0.5) * Math.pow(1 - d, 0.55) + 0.05);
      if (r() > p) continue;
      if (t > 0.55 && (gx + gy) % 2 === 0 && r() < 0.6) continue;
      const fill =
        t < 0.3
          ? pick(r, [[EL.pixelOrange, 34], [EL.pixelRed, 20], [EL.pixelWhite, 22], [EL.pixelCream, 14], [EL.waterLight, 7], [EL.char, 3]])
          : t < 0.65
            ? pick(r, [[EL.pixelWhite, 36], [EL.pixelOrange, 24], [EL.waterLight, 18], [EL.pixelRed, 8], [EL.pixelCream, 14]])
            : pick(r, [[EL.pixelWhite, 58], [EL.pixelCream, 12], [EL.pixelOrange, 18], [EL.waterLight, 12]]);
      if (r() < 0.28) {
        // Break some cells into four half-size pixels, so the mosaic has two grains.
        const h = cell / 2;
        for (const [ox, oy] of [[0, 0], [h, 0], [0, h], [h, h]]) {
          if (r() < 0.62) out.push({ x: gx * cell + ox, y: gy * cell + oy, s: h, fill: r() < 0.7 ? fill : EL.pixelWhite, o: 0.85 });
        }
        continue;
      }
      out.push({ x: gx * cell, y: gy * cell, s: cell, fill, o: 0.78 + r() * 0.22 });
    }
  }
  return out;
}

/** A solid blob of big pixels with a ragged edge (the red and blue shapes). */
export function blob(cx: number, cy: number, rx: number, ry: number, cell: number, fill: string, seed: number): Cell[] {
  const r = rng(seed);
  const out: Cell[] = [];
  for (let y = cy - ry; y <= cy + ry; y += cell) {
    for (let x = cx - rx; x <= cx + rx; x += cell) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d < 0.55 || (d < 1 && r() < 0.55)) {
        out.push({ x: Math.round(x / cell) * cell, y: Math.round(y / cell) * cell, s: cell, fill, o: 0.95 });
      }
    }
  }
  return out;
}

/** Charred wood and ash at the base: a dark checkered pixel mass. */
export function charMass(x0: number, y0: number, w: number, h: number, cell: number, seed: number, light = false): Cell[] {
  const r = rng(seed);
  const out: Cell[] = [];
  for (let y = y0; y < y0 + h; y += cell) {
    for (let x = x0; x < x0 + w; x += cell) {
      const edge = Math.min(x - x0, x0 + w - x, y - y0, y0 + h - y) / (cell * 3);
      if (r() > Math.min(1, 0.35 + edge)) continue;
      const fill = light
        ? pick(r, [[EL.ash, 50], [EL.pixelWhite, 30], [EL.charGrey, 12], [EL.waterLight, 8]])
        : pick(r, [[EL.char, 52], [EL.charGrey, 30], [EL.ash, 10], [EL.pixelOrange, 8]]);
      out.push({ x, y, s: cell, fill, o: 1 });
    }
  }
  return out;
}

/**
 * Translucent stepped blocks floating in the sky: Aether. A random walk of
 * big cells, so each cluster reads as one broken shape, not confetti.
 */
export function aetherCluster(x: number, y: number, cell: number, n: number, palette: string[], seed: number): Cell[] {
  const r = rng(seed);
  const seen = new Set<string>();
  const out: Cell[] = [];
  let gx = 0;
  let gy = 0;
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    const key = `${gx},${gy}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ x: x + gx * cell, y: y + gy * cell, s: cell, fill: palette[Math.floor(r() * palette.length)], o: 0.38 + r() * 0.3 });
    }
    const step = r();
    if (step < 0.4) gx += 1;
    else if (step < 0.6) gx -= 1;
    else if (step < 0.85) gy += 1;
    else gy -= 1;
  }
  return out;
}

/** Element names breaking apart inside the fire, like the letters in a scan. */
export function fireGlyphs(sp: Spine, seed = 5): Glyph[] {
  const r = rng(seed);
  const letters = "WATEREARTHAIRFIREAETHERELEMENTAL";
  const out: Glyph[] = [];
  for (let i = 0; i < 14; i++) {
    const t = 0.04 + r() * 0.42;
    const y = sp.baseY - t * (sp.baseY - sp.topY);
    const x = spineX(sp, t) + (r() - 0.5) * 150 * (1 - t);
    out.push({
      x,
      y,
      ch: letters[Math.floor(r() * letters.length)],
      size: 18 + Math.floor(r() * 22),
      fill: pick(r, [[EL.pixelCream, 30], [EL.pixelOrange, 30], [EL.waterLight, 20], [EL.pixelWhite, 20]]),
      rotate: (r() - 0.5) * 24,
    });
  }
  return out;
}

/** "M ... Z" teardrop flame tongue, base centred at (cx, by). */
export function tongue(cx: number, by: number, w: number, h: number, lean: number): string {
  const l = cx - w / 2;
  const rgt = cx + w / 2;
  return [
    `M ${l} ${by}`,
    `C ${l} ${by - h * 0.42}, ${cx - w * 0.16 + lean * 0.5} ${by - h * 0.72}, ${cx + lean} ${by - h}`,
    `C ${cx + w * 0.16 + lean * 0.5} ${by - h * 0.72}, ${rgt} ${by - h * 0.42}, ${rgt} ${by}`,
    "Z",
  ].join(" ");
}
