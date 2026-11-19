#!/usr/bin/env node
/**
 * Builds the art for the Elemental quad: four square tiles whose quarter
 * discs make one circle when the tiles sit together, one element per
 * quarter. Type is laid over the art in React.
 *
 *   node scripts/render-elemental-quad.mjs
 *
 * Writes public/hackathon/poster/elemental/quad/<element>.png (1080x1080,
 * transparent outside the quarter disc).
 *
 * Each quarter is a soft gradient with one motif, a branch, rendered then
 * turned into pixels: averaged into 8px cells and ordered-dithered into a
 * small palette, so the gradient survives as dither instead of banding.
 * The same branch runs through all four: in smog (air), burning (fire),
 * drowned in toxic water (water), and as dead roots (earth). Sparks are
 * pixel crosses. All seeded.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/hackathon/poster/elemental/quad");
const S = 1080;
const M = 64;
const R = 880;
const CELL = 8;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Branch segments grown from (x, y) at angle a. */
function grow(x, y, a, len, width, depth, r, out, spread = 0.55, shrink = 0.8) {
  if (depth === 0 || len < 6) return;
  const steps = 5;
  let cx = x;
  let cy = y;
  let ca = a;
  for (let i = 0; i < steps; i++) {
    ca += (r() - 0.5) * 0.35;
    const nx = cx + Math.cos(ca) * (len / steps);
    const ny = cy + Math.sin(ca) * (len / steps);
    const w = width * (1 - (i / steps) * 0.25);
    out.push([cx, cy, nx, ny, w]);
    cx = nx;
    cy = ny;
  }
  const kids = 2 + (r() < 0.35 ? 1 : 0);
  for (let k = 0; k < kids; k++) {
    const da = (k - (kids - 1) / 2) * spread + (r() - 0.5) * 0.4;
    grow(cx, cy, ca + da, len * (shrink + (r() - 0.5) * 0.12), width * 0.62, depth - 1, r, out, spread, shrink);
  }
}
function segDist(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/**
 * The four quarters. `centre` is the circle's centre in tile pixels: the
 * tile's inner corner. Colours are gradient blobs; `palette` is what the
 * dither may use; `branch` is where the motif enters and which way it grows.
 */
const TILES = [
  {
    key: "air",
    centre: [S - M, S - M],
    base: "#e6ebe9",
    blobs: [
      ["#d9c45a", 720, 760, 440],
      ["#9aa0b4", 330, 930, 400],
      ["#c3e2ec", 930, 360, 420],
      ["#b7a86a", 980, 980, 300],
    ],
    branch: { x: 120, y: 1080, a: -1.0, len: 330, w: 30, depth: 6, colour: "#4e5248", seed: 11 },
    palette: ["#f1f2ea", "#cfe3e6", "#a9b0c0", "#d8c35a", "#b3a35f", "#868a7c", "#4e5248"],
    spark: ["#fff4b0", "#e9d25a"],
  },
  {
    key: "fire",
    centre: [M, S - M],
    base: "#ffcc55",
    blobs: [
      ["#fff3c2", 170, 880, 360],
      ["#f27a2a", 470, 560, 460],
      ["#c22c19", 850, 860, 430],
      ["#ff9d3a", 330, 260, 300],
    ],
    branch: { x: 1080, y: 980, a: -2.45, len: 340, w: 32, depth: 6, colour: "#3a1a12", seed: 21 },
    palette: ["#fff3c2", "#ffd45c", "#f9a23a", "#ef6a22", "#c22c19", "#7a1c10", "#3a1a12"],
    spark: ["#fff6c8", "#ffd03a"],
  },
  {
    key: "water",
    centre: [S - M, M],
    base: "#2c9a8a",
    blobs: [
      ["#a5d63a", 620, 420, 420],
      ["#173f2a", 930, 160, 380],
      ["#c8efd8", 300, 160, 300],
      ["#3fb7a0", 820, 700, 360],
    ],
    branch: { x: 820, y: 0, a: 2.25, len: 330, w: 30, depth: 7, colour: "#0f2a1c", seed: 36, spread: 0.75 },
    palette: ["#e9f6d4", "#b8e58a", "#7fc43a", "#3fb7a0", "#2a8a78", "#1f5a3c", "#0f2a1c"],
    spark: ["#f1ffd0", "#b8f04a"],
  },
  {
    key: "earth",
    centre: [M, M],
    base: "#d4a043",
    blobs: [
      ["#b4521e", 330, 300, 420],
      ["#5d3a21", 720, 640, 440],
      ["#8f8a38", 200, 820, 300],
      ["#e8c67a", 840, 180, 300],
    ],
    branch: { x: 520, y: 0, a: 1.62, len: 300, w: 30, depth: 6, colour: "#25170f", seed: 41, spread: 0.8 },
    palette: ["#ecd29a", "#d4a043", "#b4521e", "#8f8a38", "#5d3a21", "#3a2416", "#25170f"],
    spark: ["#ffe08a", "#e07a2a"],
  },
];

function buildTile(t) {
  const base = hex(t.base);
  const blobs = t.blobs.map(([c, x, y, r]) => [hex(c), x, y, r]);
  const palette = t.palette.map(hex);
  const r = rng(t.branch.seed);
  const segs = [];
  grow(t.branch.x, t.branch.y, t.branch.a, t.branch.len, t.branch.w, t.branch.depth, r, segs, t.branch.spread ?? 0.55);
  const branchCol = hex(t.branch.colour);
  const [cx, cy] = t.centre;

  // Coarse grid of segments for fast nearest lookups.
  const G = 64;
  const grid = new Map();
  for (const s of segs) {
    const x0 = Math.floor((Math.min(s[0], s[2]) - s[4]) / G);
    const x1 = Math.floor((Math.max(s[0], s[2]) + s[4]) / G);
    const y0 = Math.floor((Math.min(s[1], s[3]) - s[4]) / G);
    const y1 = Math.floor((Math.max(s[1], s[3]) + s[4]) / G);
    for (let gx = x0; gx <= x1; gx++)
      for (let gy = y0; gy <= y1; gy++) {
        const k = `${gx},${gy}`;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(s);
      }
  }
  const branchAt = (x, y) => {
    let a = 0;
    for (const s of grid.get(`${Math.floor(x / G)},${Math.floor(y / G)}`) ?? []) {
      const d = segDist(x, y, s);
      a = Math.max(a, clamp((s[4] / 2 + 1 - d) / 2));
    }
    return a;
  };
  const colourAt = (x, y) => {
    let c = [...base];
    for (const [bc, bx, by, br] of blobs) {
      const w = Math.exp(-(((x - bx) ** 2 + (y - by) ** 2) / (br * br)) * 1.6);
      c = c.map((v, k) => mix(v, bc[k], w));
    }
    const b = branchAt(x, y);
    return c.map((v, k) => mix(v, branchCol[k], b * 0.95));
  };

  const out = Buffer.alloc(S * S * 4);
  for (let gy = 0; gy < S / CELL; gy++)
    for (let gx = 0; gx < S / CELL; gx++) {
      const x = gx * CELL + CELL / 2;
      const y = gy * CELL + CELL / 2;
      if (Math.hypot(x - cx, y - cy) > R) continue;
      // Average four samples in the cell, then dither into the palette.
      let c = [0, 0, 0];
      for (const [ox, oy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
        const s = colourAt(x + ox, y + oy);
        c = c.map((v, k) => v + s[k] / 4);
      }
      const d = (bayer(gx, gy) - 0.5) * 0.16;
      const target = c.map((v) => v + d);
      let best = palette[0];
      let bestD = Infinity;
      for (const p of palette) {
        const dd = (p[0] - target[0]) ** 2 * 0.3 + (p[1] - target[1]) ** 2 * 0.59 + (p[2] - target[2]) ** 2 * 0.11;
        if (dd < bestD) {
          bestD = dd;
          best = p;
        }
      }
      for (let yy = 0; yy < CELL; yy++)
        for (let xx = 0; xx < CELL; xx++) {
          const i = ((gy * CELL + yy) * S + gx * CELL + xx) * 4;
          out[i] = Math.round(best[0] * 255);
          out[i + 1] = Math.round(best[1] * 255);
          out[i + 2] = Math.round(best[2] * 255);
          out[i + 3] = 255;
        }
    }

  // Sparks: pixel crosses, bright centre, softer arms.
  const sr = rng(t.branch.seed + 7);
  const [hot, warm] = t.spark.map(hex);
  for (let k = 0; k < 11; k++) {
    const ang = sr() * Math.PI * 0.5;
    const dist = 140 + sr() * (R - 200);
    const sx = cx + Math.cos(ang) * dist * Math.sign(S / 2 - cx || 1);
    const sy = cy + Math.sin(ang) * dist * Math.sign(S / 2 - cy || 1);
    const gx = Math.floor(sx / CELL);
    const gy = Math.floor(sy / CELL);
    const put = (px, py, c) => {
      if (Math.hypot(px * CELL + 4 - cx, py * CELL + 4 - cy) > R) return;
      for (let yy = 0; yy < CELL; yy++)
        for (let xx = 0; xx < CELL; xx++) {
          const i = ((py * CELL + yy) * S + px * CELL + xx) * 4;
          out[i] = Math.round(c[0] * 255);
          out[i + 1] = Math.round(c[1] * 255);
          out[i + 2] = Math.round(c[2] * 255);
          out[i + 3] = 255;
        }
    };
    put(gx, gy, hot);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(gx + dx, gy + dy, warm);
  }
  return out;
}

mkdirSync(OUT, { recursive: true });
for (const t of TILES) {
  const file = join(OUT, `${t.key}.png`);
  await sharp(buildTile(t), { raw: { width: S, height: S, channels: 4 } }).png({ compressionLevel: 9 }).toFile(file);
  console.log(`✅ ${file}`);
}
