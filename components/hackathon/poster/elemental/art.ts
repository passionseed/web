import { EL } from "./brand";

/**
 * Pixel generators for Elemental. The photo underneath is a calm, healthy
 * place; everything these functions draw is the damage. All seeded, so the
 * server render and every export are identical.
 */

export interface Cell {
  x: number;
  y: number;
  s: number;
  fill: string;
  o: number;
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

/** Stable 0..1 noise per grid cell. */
function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x * 374761393 + y * 668265263 + seed * 2147483647, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
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

/** One flame tongue: base centre, width at the base, height, lean at the tip. */
export interface Tongue {
  cx: number;
  base: number;
  w: number;
  h: number;
  lean: number;
}

function flameValue(tongues: Tongue[], x: number, y: number): { v: number; t: number } {
  let best = { v: 0, t: 1 };
  for (const g of tongues) {
    const t = (g.base - y) / g.h;
    if (t < 0 || t > 1) continue;
    const c = g.cx + g.lean * Math.pow(t, 1.6) + 10 * Math.sin(t * 7 + g.cx);
    const hw = (g.w / 2) * Math.pow(1 - t, 0.75);
    const d = Math.abs(x - c) / hw;
    if (d >= 1) continue;
    const v = (1 - d) * Math.pow(1 - t, 0.35);
    if (v > best.v) best = { v, t };
  }
  return best;
}

/**
 * Fire made only of pixels: big blocks in the core, smaller ones at the
 * edges, single sparks at the tips. Drawn big to small so it reads as a
 * mosaic, not a grid.
 */
export function pixelFire(tongues: Tongue[], seed = 7): Cell[] {
  const r = rng(seed);
  const out: Cell[] = [];
  const x0 = Math.min(...tongues.map((g) => g.cx - g.w)) - 40;
  const x1 = Math.max(...tongues.map((g) => g.cx + g.w + g.lean)) + 40;
  const y0 = Math.min(...tongues.map((g) => g.base - g.h)) - 20;
  const y1 = Math.max(...tongues.map((g) => g.base));
  const passes: [number, number][] = [
    [20, 0.62],
    [10, 0.34],
    [5, 0.12],
  ];
  for (const [s, min] of passes) {
    for (let y = Math.floor(y0 / s) * s; y < y1; y += s) {
      for (let x = Math.floor(x0 / s) * s; x < x1; x += s) {
        const { v, t } = flameValue(tongues, x + s / 2, y + s / 2);
        const n = hash(x / s, y / s, seed + s);
        const vv = v * (0.7 + 0.6 * n);
        if (vv < min) continue;
        if (s === 5 && r() < 0.45) continue;
        const fill =
          vv > 0.95
            ? pick(r, [[EL.flameWhite, 60], [EL.flameCore, 40]])
            : vv > 0.78
              ? pick(r, [[EL.flameCore, 55], [EL.flameLight, 35], [EL.flameWhite, 10]])
              : vv > 0.55
                ? pick(r, [[EL.flameLight, 45], [EL.flame, 45], [EL.flameCore, 10]])
                : t > 0.6
                  ? pick(r, [[EL.ember, 40], [EL.smokeDark, 35], [EL.flame, 25]])
                  : pick(r, [[EL.flame, 45], [EL.ember, 45], [EL.toxicCyan, 10]]);
        out.push({ x, y, s, fill, o: 0.92 + r() * 0.08 });
      }
    }
  }
  // Sparks above the tips.
  for (let i = 0; i < 60; i++) {
    const g = tongues[Math.floor(r() * tongues.length)];
    const t = 0.75 + r() * 0.6;
    const x = g.cx + g.lean * Math.pow(Math.min(t, 1), 1.6) + (r() - 0.5) * 90;
    const y = g.base - g.h * t;
    out.push({ x: Math.round(x / 5) * 5, y: Math.round(y / 5) * 5, s: r() < 0.7 ? 5 : 10, fill: r() < 0.5 ? EL.flameCore : EL.flameLight, o: 0.9 });
  }
  return out;
}

/** Air: a pixel smoke plume from (x, y), drifting along (dx, dy) and widening. */
export function smokePlume(x: number, y: number, dx: number, dy: number, seed = 17): Cell[] {
  const r = rng(seed);
  const out: Cell[] = [];
  const steps = 70;
  for (let i = 0; i < steps; i++) {
    const s = i / steps;
    // Rises first, then the wind bends it over.
    const cx = x + dx * Math.pow(s, 1.7) + 22 * Math.sin(s * 8);
    const cy = y + dy * (1 - Math.pow(1 - s, 3));
    const w = 18 + 210 * Math.pow(s, 0.75);
    const count = Math.round(7 + 18 * (1 - s));
    for (let k = 0; k < count; k++) {
      const cell = r() < 0.25 ? 24 : 12;
      const ox = (r() - 0.5) * w * 2;
      const oy = (r() - 0.5) * w * 0.9;
      const edge = Math.hypot(ox / w, oy / (w * 0.45)) / 1.4;
      if (r() < edge) continue;
      const px = Math.round((cx + ox) / 12) * 12;
      const py = Math.round((cy + oy) / 12) * 12;
      const fill = pick(r, [
        [EL.smokeDark, 38 * (1 - s) + 10],
        [EL.smoke, 30],
        [EL.ash, 18 * s + 6],
        [EL.toxicYellow, 9],
        [EL.flame, 6 * (1 - s)],
      ]);
      out.push({ x: px, y: py, s: cell, fill, o: (0.85 - 0.45 * s) * (0.6 + 0.4 * r()) });
    }
  }
  return out;
}

/** A band of river the spill follows. */
export interface Band {
  y0: number;
  y1: number;
  x0: number;
  x1: number;
}

/**
 * Water: a toxic spill in thin horizontal pixel streaks, strongest near the
 * source and thinning downstream.
 */
export function toxicSpill(bands: Band[], sourceX: number, seed = 23): Cell[] {
  const r = rng(seed);
  const out: Cell[] = [];
  const cell = 8;
  for (const b of bands) {
    const rows = Math.floor((b.y1 - b.y0) / cell);
    for (let k = 0; k < rows * 2.2; k++) {
      const y = b.y0 + Math.floor(r() * rows) * cell;
      const start = sourceX + (r() - 0.6) * 260;
      const len = 40 + Math.pow(r(), 1.6) * 520;
      for (let x = Math.max(b.x0, start); x < Math.min(b.x1, start + len); x += cell) {
        const fade = 1 - (x - start) / len;
        if (r() > 0.35 + 0.6 * fade) continue;
        const fill = pick(r, [
          [EL.toxicRust, 40],
          [EL.toxicCyan, 26],
          [EL.toxicGreen, 16],
          [EL.oil, 18],
        ]);
        out.push({ x: Math.round(x / cell) * cell, y, s: cell, fill, o: 0.55 + 0.4 * fade });
      }
    }
  }
  return out;
}

/** The fire's reflection on the water: short, broken vertical runs. */
export function reflection(x: number, y: number, w: number, h: number, seed = 29): Cell[] {
  const r = rng(seed);
  const out: Cell[] = [];
  const cell = 8;
  for (let yy = y; yy < y + h; yy += cell) {
    const t = (yy - y) / h;
    for (let xx = x; xx < x + w; xx += cell) {
      if (r() > 0.55 * (1 - t)) continue;
      out.push({ x: xx, y: yy, s: cell, fill: pick(r, [[EL.flameLight, 50], [EL.flame, 35], [EL.flameCore, 15]]), o: 0.75 * (1 - t) + 0.2 });
    }
  }
  return out;
}

/**
 * Earth: scorched, poisoned ground spreading in a patch. Dense in the middle,
 * ragged at the edge, with black crack runs leaving it.
 */
export function scorch(cx: number, cy: number, rx: number, ry: number, seed = 31, cracks = 4): Cell[] {
  const r = rng(seed);
  const out: Cell[] = [];
  const cell = 10;
  for (let y = cy - ry; y <= cy + ry; y += cell) {
    for (let x = cx - rx; x <= cx + rx; x += cell) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = dx * dx + dy * dy;
      const n = hash(Math.round(x / cell), Math.round(y / cell), seed);
      if (d + 0.5 * (n - 0.5) > 1) continue;
      if (r() < 0.2 + 0.5 * d) continue;
      const fill = pick(r, [
        [EL.char, 42],
        [EL.burnt, 26],
        [EL.toxicRust, 14],
        [EL.ash, 10],
        [EL.toxicGreen, 8],
      ]);
      out.push({ x: Math.round(x / cell) * cell, y: Math.round(y / cell) * cell, s: cell, fill, o: 0.88 });
    }
  }
  for (let c = 0; c < cracks; c++) {
    let x = cx + (r() - 0.5) * rx;
    let y = cy + (r() - 0.5) * ry;
    const ang = r() * Math.PI * 2;
    for (let i = 0; i < 18 + r() * 14; i++) {
      x += Math.cos(ang + (r() - 0.5) * 1.6) * cell;
      y += Math.sin(ang + (r() - 0.5) * 1.6) * cell * 0.6;
      out.push({ x: Math.round(x / 5) * 5, y: Math.round(y / 5) * 5, s: 5, fill: r() < 0.8 ? EL.char : EL.toxicRust, o: 0.9 });
    }
  }
  return out;
}

/** Aether: faint stepped blocks, a random walk of big cells. */
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
      out.push({ x: x + gx * cell, y: y + gy * cell, s: cell, fill: palette[Math.floor(r() * palette.length)], o: 0.16 + r() * 0.14 });
    }
    const step = r();
    if (step < 0.4) gx += 1;
    else if (step < 0.6) gx -= 1;
    else if (step < 0.85) gy += 1;
    else gy -= 1;
  }
  return out;
}
