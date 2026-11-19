#!/usr/bin/env node
/**
 * Builds the circle for the Elemental A4 poster: one disc split into four
 * quarters by white gutters, each quarter a pixel picture of a real element.
 *
 *   node scripts/render-elemental-a4.mjs
 *
 * Writes public/hackathon/poster/elemental/a4/circle.png (D x D, transparent
 * outside the disc and in the gutters).
 *
 * Each element is drawn as a real texture first (turbulent flames, lit wave
 * surface, billowing smog, cracked soil from a Voronoi field), then averaged
 * into pixel cells and ordered-dithered into its own small palette. So the
 * pixels show the thing itself, not just its colour. All seeded.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/hackathon/poster/elemental/a4/circle.png");
const D = 960;
const C = D / 2;
const GAP = 12; // half the white gutter between quarters
const CELL = 8;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
function hash(x, y, s) {
  let h = Math.imul(x * 374761393 + y * 668265263 + s * 1442695041, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  return mix(mix(hash(xi, yi, s), hash(xi + 1, yi, s), u), mix(hash(xi, yi + 1, s), hash(xi + 1, yi + 1, s), u), v);
}
function fbm(x, y, s, o = 5) {
  let t = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < o; i++) {
    t += a * vnoise(x * f, y * f, s + i * 31);
    f *= 2.03;
    a *= 0.5;
  }
  return t / (1 - Math.pow(0.5, o));
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
/** Map v (0..1) through colour stops. */
function ramp(v, stops) {
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++)
    if (v <= stops[i][0]) {
      const t = (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return stops[i - 1][1].map((c, k) => mix(c, stops[i][1][k], t));
    }
  return stops[stops.length - 1][1];
}

// ---------- FIRE (top right): flames rising from the gutter ----------
const FIRE_STOPS = [
  [0.0, hex("#1b0d0a")],
  [0.18, hex("#3d1610")],
  [0.32, hex("#8e1d0e")],
  [0.46, hex("#d23d14")],
  [0.6, hex("#f2741f")],
  [0.74, hex("#fbab36")],
  [0.87, hex("#ffe07a")],
  [1.0, hex("#fff8e0")],
];
function fire(x, y) {
  // Local: u across, h up from the base (the horizontal gutter).
  const h = (C - y) / C;
  const u = (x - C) / C;
  const warp = fbm(x * 0.008, y * 0.006 + 7, 3, 3);
  // Stretched tall: licks rise instead of pooling.
  const n = fbm(x * 0.024 + warp * 1.2, y * 0.009 + warp * 0.6, 5, 5);
  // Tongues across the quarter, bending as they rise.
  const tongues = 0.5 + 0.5 * Math.cos((u * 4.2 + 0.3) * Math.PI + (fbm(y * 0.012, 2, 9, 2) - 0.5) * 4 * h);
  let v = n * 1.1 + tongues * 0.55 * (1 - h * 0.4) - h * 1.35 + 0.12;
  v = clamp(v);
  // Embers above the flames.
  if (v < 0.2 && hash(Math.floor(x / 8), Math.floor(y / 8), 77) > 0.985 - h * 0.01) v = 0.9;
  return ramp(v, FIRE_STOPS);
}

// ---------- AIR (top left): clouds in a blue sky, smog along the bottom ----------
const SKY = [hex("#5d90b6"), hex("#8fbad3"), hex("#c9dde0"), hex("#ddd2a4")];
// Cumulus as metaballs: clusters of puffs.
const PUFFS = [];
for (const [cx, cy, n, size, seed] of [
  [170, 160, 11, 34, 61],
  [395, 105, 7, 26, 62],
  [320, 290, 9, 30, 63],
]) {
  for (let i = 0; i < n; i++) {
    const a = hash(i, 1, seed) * Math.PI;
    const r = hash(i, 2, seed) * size * 2.6;
    PUFFS.push([cx + Math.cos(a) * r * 1.4, cy - Math.abs(Math.sin(a)) * r * 0.6, size * (0.55 + hash(i, 3, seed) * 0.6)]);
  }
}
function cloudField(x, y) {
  let f = 0;
  for (const [px, py, r] of PUFFS) f += Math.exp(-((x - px) ** 2 + (y - py) ** 2) / (r * r));
  return f + (fbm(x * 0.035, y * 0.035, 64, 3) - 0.5) * 0.25;
}
function air(x, y) {
  const t = y / C;
  const sky = t < 0.55 ? SKY[0].map((c, k) => mix(c, SKY[1][k], t / 0.55)) : SKY[1].map((c, k) => mix(c, SKY[2][k], (t - 0.55) / 0.45));
  // Smog: a brown, turbulent band rising off the bottom.
  const smogN = fbm(x * 0.008, y * 0.02, 65, 4);
  const smog = smooth(0.55, 0.95, t + (smogN - 0.5) * 0.5);
  let c = sky.map((v, k) => mix(v, hex("#9a8550")[k], smog * 0.7));
  c = c.map((v, k) => mix(v, hex("#5e5240")[k], smooth(0.85, 1, t + (smogN - 0.5) * 0.3) * 0.7));
  const f = cloudField(x, y);
  if (f > 0.5) {
    // Lit from the top left: brighter where the field falls off towards the light.
    const toward = cloudField(x - 12, y - 16);
    const shade = clamp(0.62 + (f - toward) * 1.6 + smooth(0.5, 0.7, f) * 0.12);
    const cloud = hex("#a7aaa8").map((v, k) => mix(v, hex("#f7f5ee")[k], shade));
    c = cloud.map((v, k) => mix(v, hex("#a99254")[k], smog * 0.4));
  }
  return c;
}

// ---------- WATER (bottom left): a lit, rippling surface, gone toxic ----------
const WATER_STOPS = [
  [0.0, hex("#0b2219")],
  [0.25, hex("#153d2b")],
  [0.45, hex("#21603a")],
  [0.62, hex("#3c8a3e")],
  [0.78, hex("#78b83a")],
  [0.9, hex("#c4e46a")],
  [1.0, hex("#f2fbd2")],
];
function waveHeight(x, y) {
  // Waves get bigger towards the viewer (the bottom of the disc).
  const depth = 0.4 + (y - C) / C;
  const px = x / depth;
  const py = y / (depth * 0.5);
  return (
    Math.sin(px * 0.045 + py * 0.012) * 0.5 +
    Math.sin(px * 0.021 - py * 0.03 + 1.7) * 0.35 +
    (fbm(px * 0.018, py * 0.03, 41, 4) - 0.5) * 1.4
  );
}
function water(x, y) {
  const e = 2;
  const dx = waveHeight(x + e, y) - waveHeight(x - e, y);
  const dy = waveHeight(x, y + e) - waveHeight(x, y - e);
  // Light from the top left; glints where a wave faces it.
  const light = clamp(0.5 - dx * 0.9 - dy * 1.3);
  const deep = 0.25 + 0.35 * fbm(x * 0.004, y * 0.004, 42, 3);
  let v = deep * 0.6 + light * 0.55;
  if (light > 0.86) v = 0.95;
  // Scum and foam patches floating on it.
  const scum = smooth(0.66, 0.72, fbm(x * 0.012, y * 0.02, 43, 4));
  v = mix(v, 0.82, scum * 0.8);
  return ramp(clamp(v), WATER_STOPS);
}

// ---------- EARTH (bottom right): dry soil cracked into plates ----------
const pts = [];
for (let i = 0; i < 70; i++) pts.push([C + hash(i, 1, 51) * C, C + hash(i, 2, 51) * C]);
const EARTH_STOPS = [
  [0.0, hex("#1e130c")],
  [0.2, hex("#4a2e1b")],
  [0.4, hex("#7a4c2b")],
  [0.6, hex("#a76d3c")],
  [0.78, hex("#c99458")],
  [1.0, hex("#ead0a0")],
];
function earth(x, y) {
  let f1 = Infinity;
  let f2 = Infinity;
  for (const [px, py] of pts) {
    const d = Math.hypot(x - px, y - py);
    if (d < f1) {
      f2 = f1;
      f1 = d;
    } else if (d < f2) f2 = d;
  }
  const edge = f2 - f1;
  const crackW = 5 + 6 * fbm(x * 0.02, y * 0.02, 52, 2);
  const tex = fbm(x * 0.03, y * 0.03, 53, 4);
  // Plates curl up at the edge: lighter rim before the crack.
  let v = 0.45 + (tex - 0.5) * 0.5 + smooth(crackW + 14, crackW, edge) * 0.25;
  v -= (f1 / 140) * 0.12;
  if (edge < crackW) v = 0.05 + (edge / crackW) * 0.1;
  // Rust stains seeping across the plates.
  const stain = smooth(0.64, 0.74, fbm(x * 0.008, y * 0.008, 54, 3));
  const c = ramp(clamp(v), EARTH_STOPS);
  return c.map((ch, k) => mix(ch, hex("#9a3f18")[k], stain * 0.5 * (edge < crackW ? 0 : 1)));
}

// ---------- assemble ----------
function palettise(c, stops, gx, gy) {
  const d = (bayer(gx, gy) - 0.5) * 0.09;
  const t = c.map((v) => v + d);
  let best = stops[0][1];
  let bd = Infinity;
  for (const [, p] of stops) {
    const dd = (p[0] - t[0]) ** 2 * 0.3 + (p[1] - t[1]) ** 2 * 0.59 + (p[2] - t[2]) ** 2 * 0.11;
    if (dd < bd) {
      bd = dd;
      best = p;
    }
  }
  return best;
}
const AIR_STOPS = ["#5d90b6", "#8fbad3", "#c9dde0", "#f7f5ee", "#d6d6cf", "#a7aaa8", "#ddd2a4", "#9a8550", "#5e5240"].map((h, i) => [i, hex(h)]);

const out = Buffer.alloc(D * D * 4);
for (let gy = 0; gy < D / CELL; gy++)
  for (let gx = 0; gx < D / CELL; gx++) {
    const x0 = gx * CELL;
    const y0 = gy * CELL;
    const cx = x0 + CELL / 2;
    const cy = y0 + CELL / 2;
    if (Math.hypot(cx - C, cy - C) > C - 2) continue;
    if (Math.abs(cx - C) < GAP || Math.abs(cy - C) < GAP) continue;
    const right = cx > C;
    const bottom = cy > C;
    const fn = !bottom && right ? fire : !bottom ? air : !right ? water : earth;
    const stops = !bottom && right ? FIRE_STOPS : !bottom ? AIR_STOPS : !right ? WATER_STOPS : EARTH_STOPS;
    let c = [0, 0, 0];
    for (const [ox, oy] of [[2, 2], [6, 2], [2, 6], [6, 6]]) {
      const s = fn(x0 + ox, y0 + oy);
      c = c.map((v, k) => v + s[k] / 4);
    }
    const p = palettise(c, stops, gx, gy);
    for (let yy = 0; yy < CELL; yy++)
      for (let xx = 0; xx < CELL; xx++) {
        const i = ((y0 + yy) * D + x0 + xx) * 4;
        out[i] = Math.round(p[0] * 255);
        out[i + 1] = Math.round(p[1] * 255);
        out[i + 2] = Math.round(p[2] * 255);
        out[i + 3] = 255;
      }
  }

mkdirSync(dirname(OUT), { recursive: true });
await sharp(out, { raw: { width: D, height: D, channels: 4 } }).png({ compressionLevel: 9 }).toFile(OUT);
console.log(`✅ ${OUT}`);
