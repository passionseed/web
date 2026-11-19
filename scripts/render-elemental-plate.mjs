#!/usr/bin/env node
/**
 * Builds the Elemental key visual's image plate: the healthy photo, poisoned
 * by four pixel elements. Type is laid over it in React.
 *
 *   node scripts/render-elemental-plate.mjs
 *
 * Writes public/hackathon/poster/elemental/plate-key.png (1080x1350).
 *
 * Why it's done on pixels, not as SVG squares: the pixels have to come from
 * the image itself (dither, dot screens, mosaics of what's underneath) and
 * sit under the same grain as the photo, or they read as stickers. The
 * techniques, from the LOOK+ reference Angpao shared:
 * - smooth light first (glow, flame, smog), then pixelate part of it, so
 *   the pixels inherit real light and shape;
 * - colours quantized to 3 to 4 levels per element, never random per cell;
 * - ordered (Bayer) dither and dot screens of the photo for matter
 *   (waste, ash, water);
 * - a few flat, one-colour stepped shapes on a coarse grid;
 * - grain over everything at the end, pixels included.
 * Everything is seeded, so every run gives the same plate.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BG = join(ROOT, "public/hackathon/poster/elemental/bg/river-joana-abreu-unsplash.jpg");
// --sky blue turns the overcast sky blue and writes plate-key-blue.png.
const SKY_BLUE = process.argv.includes("--sky") && process.argv[process.argv.indexOf("--sky") + 1] === "blue";
const OUT = join(ROOT, `public/hackathon/poster/elemental/plate-key${SKY_BLUE ? "-blue" : ""}.png`);
const W = 1080;
const H = 1350;

// ---------- small maths ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

function hash(x, y, seed) {
  let h = Math.imul(x * 374761393 + y * 668265263 + seed * 1442695041, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return mix(mix(a, b, u), mix(c, d, u), v);
}
function fbm(x, y, seed, oct = 4) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    s += amp * vnoise(x * f, y * f, seed + i * 17);
    f *= 2;
    amp *= 0.5;
  }
  return s / (1 - Math.pow(0.5, oct));
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

// ---------- image buffers (float RGB, 0..1) ----------
const img = new Float32Array(W * H * 3);
function get(x, y) {
  const i = (y * W + x) * 3;
  return [img[i], img[i + 1], img[i + 2]];
}
function put(x, y, c, a = 1) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  img[i] = mix(img[i], c[0], a);
  img[i + 1] = mix(img[i + 1], c[1], a);
  img[i + 2] = mix(img[i + 2], c[2], a);
}
function screen(x, y, c, a = 1) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  for (let k = 0; k < 3; k++) img[i + k] = mix(img[i + k], 1 - (1 - img[i + k]) * (1 - c[k]), a);
}
function rect(x0, y0, s, c, a = 1) {
  for (let y = y0; y < y0 + s; y++) for (let x = x0; x < x0 + s; x++) put(x, y, c, a);
}
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/** Blur an RGBA float layer with sharp and return it. */
async function blurLayer(layer, sigma) {
  const u8 = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H * 4; i++) u8[i] = Math.round(clamp(layer[i]) * 255);
  const { data } = await sharp(u8, { raw: { width: W, height: H, channels: 4 } })
    .blur(sigma)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = new Float32Array(W * H * 4);
  for (let i = 0; i < W * H * 4; i++) out[i] = data[i] / 255;
  return out;
}
function drawLayer(layer, mode = "normal", fixed = null) {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const a = layer[i + 3];
      if (a <= 0.002) continue;
      const c = fixed ?? [layer[i] / Math.max(a, 1e-4), layer[i + 1] / Math.max(a, 1e-4), layer[i + 2] / Math.max(a, 1e-4)].map((v) => clamp(v));
      if (mode === "screen") screen(x, y, c, a);
      else put(x, y, c, a);
    }
}
/** Premultiplied paint into an RGBA float layer. */
function paint(layer, x, y, c, a) {
  if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
  const i = (y * W + x) * 4;
  const keep = 1 - a;
  layer[i] = layer[i] * keep + c[0] * a;
  layer[i + 1] = layer[i + 1] * keep + c[1] * a;
  layer[i + 2] = layer[i + 2] * keep + c[2] * a;
  layer[i + 3] = layer[i + 3] * keep + a;
}

/** Stepped blob mask on a grid: true cells of an ellipse with a noisy edge. */
function blobCells(cx, cy, rx, ry, cell, seed, edge = 0.45) {
  const cells = [];
  for (let y = Math.floor((cy - ry * 1.3) / cell) * cell; y <= cy + ry * 1.3; y += cell)
    for (let x = Math.floor((cx - rx * 1.3) / cell) * cell; x <= cx + rx * 1.3; x += cell) {
      const dx = (x + cell / 2 - cx) / rx;
      const dy = (y + cell / 2 - cy) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d + edge * (fbm(x * 0.03, y * 0.03, seed, 2) - 0.5) < 1) cells.push([x, y]);
    }
  return cells;
}

// ---------- palettes ----------
const P = {
  white: hex("#f7f4ec"),
  cream: hex("#ffe6b5"),
  yellow: hex("#ffd067"),
  orange: hex("#f38a36"),
  red: hex("#e2461b"),
  deep: hex("#8e2410"),
  flatRed: hex("#ec4a1b"),
  flatBlue: hex("#8ecbe6"),
  ink: hex("#141312"),
  ash: hex("#5e5a54"),
  ashLight: hex("#d2cdc3"),
  g0: hex("#132608"),
  g1: hex("#2f5a14"),
  g2: hex("#5f9a1f"),
  g3: hex("#a9d84a"),
  acid: hex("#9fe22b"),
  smogA: hex("#b39a48"),
  smogB: hex("#7a6a45"),
  mustard: hex("#cdb047"),
  smogPale: hex("#e6e1cb"),
};

// ---------- layout (poster pixels, tied to the photo's crop) ----------
const FIRE = { x: 806, base: 908 };
const SMOG = { x: 330, y: 480, rx: 520, ry: 120 };
const WATER = { x0: 0, x1: 600, y0: 1006, y1: 1242 };

function flameField(x, y) {
  const tongues = [
    { cx: FIRE.x, w: 250, h: 430, lean: -40 },
    { cx: FIRE.x - 78, w: 140, h: 270, lean: -50 },
    { cx: FIRE.x + 70, w: 150, h: 320, lean: -20 },
    { cx: FIRE.x + 10, w: 110, h: 520, lean: -70 },
  ];
  let best = 0;
  for (const g of tongues) {
    const t = (FIRE.base - y) / g.h;
    if (t < -0.08 || t > 1) continue;
    const tt = Math.max(t, 0);
    const wob = 46 * (fbm(x * 0.012, y * 0.02 + 3, 5, 3) - 0.5) * (0.3 + tt);
    const c = g.cx + g.lean * Math.pow(tt, 1.6) + wob;
    const hw = (g.w / 2) * Math.pow(1 - tt, 0.7) * (t < 0 ? 1 + t * 6 : 1);
    const d = Math.abs(x - c) / Math.max(hw, 1);
    if (d >= 1) continue;
    best = Math.max(best, (1 - d * d) * Math.pow(1 - tt, 0.45));
  }
  return best;
}
function flameColour(v) {
  const stops = [
    [0.12, P.deep],
    [0.32, P.red],
    [0.52, P.orange],
    [0.74, P.yellow],
    [0.9, P.white],
  ];
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++)
    if (v <= stops[i][0]) {
      const t = (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return [0, 1, 2].map((k) => mix(stops[i - 1][1][k], stops[i][1][k], t));
    }
  return P.white;
}

// ---------- build ----------
const { data: bg } = await sharp(BG).resize(W, H).removeAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < W * H; i++) {
  const r = bg[i * 3] / 255;
  const g = bg[i * 3 + 1] / 255;
  const b = bg[i * 3 + 2] / 255;
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // A little faded, like the reference's film.
  img[i * 3] = mix(l, r, 0.88) * 0.97 + 0.02;
  img[i * 3 + 1] = mix(l, g, 0.88) * 0.97 + 0.02;
  img[i * 3 + 2] = mix(l, b, 0.88) * 0.97 + 0.025;
}

// Blue sky (optional): recolour only the bright, grey sky above the hills,
// keeping the photo's own tones and grain, then add a few soft clouds.
if (SKY_BLUE) {
  const top = hex("#5e8fb9");
  const low = hex("#b9d1dc");
  for (let y = 0; y < 820; y++)
    for (let x = 0; x < W; x++) {
      const c = get(x, y);
      const l = lum(c);
      const sat = Math.max(...c) - Math.min(...c);
      const m = smooth(0.58, 0.7, l) * (1 - smooth(0.08, 0.16, sat)) * (1 - smooth(760, 820, y));
      if (m <= 0) continue;
      const t = Math.pow(y / 780, 1.15);
      const g = top.map((v, k) => mix(v, low[k], t));
      // Keep the photo's own variation in the new sky.
      const sky = g.map((v) => clamp(v * (0.82 + (l - 0.78) * 1.6) + 0.04));
      const cloud = smooth(0.56, 0.78, fbm(x * 0.0035, y * 0.009, 7, 5)) * (1 - t * 0.6) * 0.75;
      put(x, y, sky.map((v) => mix(v, 0.95, cloud)), m);
    }
  // The river reflects the new sky.
  const water = hex("#9fbfd0");
  for (let y = 840; y < 1250; y++)
    for (let x = 0; x < W; x++) {
      const c = get(x, y);
      const l = lum(c);
      const sat = Math.max(...c) - Math.min(...c);
      const m = smooth(0.4, 0.55, l) * (1 - smooth(0.1, 0.18, sat));
      if (m > 0) put(x, y, water.map((v) => clamp(v * (0.7 + l * 0.45))), m * 0.6);
    }
}

// AIR: a poisoned cloud over the hill, its own cloud, not the fire's smoke.
// Built like a real cumulus (puffs as a metaball field), lit on top and
// shaded underneath, then turned into pixels in a sick yellow-brown, so it
// reads as a cloud gone wrong next to the clean sky.
// The hill's skyline in poster pixels (from the photo): the haze hugs it.
const hillY = (x) => (x < 590 ? 398 + (x / 590) * 368 : 640 + Math.max(0, (x - 760) * -0.1));
/** Smog density 0..1: thick and low over the hill, thinning upward and to the right. */
const smogField = (x, y) => {
  const above = hillY(x) - y; // distance above the skyline
  const n = fbm(x * 0.006, y * 0.018, 92, 4);
  // Densest just above the ridge, thinning upward and down the slope.
  const thick = smooth(-110, 10, above) * (1 - smooth(20, 210 + 80 * n, above));
  const reach = 1 - smooth(380, 700, x + (n - 0.5) * 220);
  // Kept below the title block.
  const belowTitle = smooth(390, 470, y + (n - 0.5) * 60);
  return clamp(thick * reach * belowTitle * (0.45 + 0.7 * n));
};
// A faint haze behind it, so the pixels sit in the air.
{
  const haze = new Float32Array(W * H * 4);
  for (let y = 150; y < 820; y++)
    for (let x = 0; x < 820; x++) {
      const f = smogField(x, y);
      if (f > 0.05) paint(haze, x, y, P.smogA, 0.3 * f);
    }
  drawLayer(await blurLayer(haze, 18), "normal", P.smogA);
}

// WATER: the left bank of the river turns toxic green.
const isWater = (x, y) => {
  if (x < WATER.x0 || x >= WATER.x1 || y < WATER.y0 || y >= WATER.y1) return 0;
  const l = lum(get(x, y));
  const front = x + 260 * (fbm(x * 0.004, y * 0.022, 21, 4) - 0.5);
  const edge = 1 - smooth(WATER.x1 - 170, WATER.x1 - 110, front);
  if (edge > 0 && edge < 1 && edge < bayer(x >> 1, y >> 1)) return 0;
  return smooth(0.34, 0.46, l) * (edge > 0 ? 1 : 0);
};
const waterMask = new Float32Array(W * H);
for (let y = WATER.y0; y < WATER.y1; y++)
  for (let x = WATER.x0; x < WATER.x1; x++) waterMask[y * W + x] = isWater(x, y);
for (let y = WATER.y0; y < WATER.y1; y++)
  for (let x = WATER.x0; x < WATER.x1; x++) {
    const m = waterMask[y * W + x];
    if (!m) continue;
    const l = lum(get(x, y));
    const toxic = [0.1 + 0.34 * l, 0.22 + 0.58 * l, 0.04 + 0.16 * l];
    put(x, y, toxic, 0.82 * m);
  }
// A faint green sheen on the bank above it.
{
  const layer = new Float32Array(W * H * 4);
  for (let y = WATER.y0 - 40; y < WATER.y0 + 90; y++)
    for (let x = 0; x < WATER.x1 - 120; x++) paint(layer, x, y, P.g2, 0.22 * (1 - Math.abs(y - WATER.y0 - 10) / 90));
  drawLayer(await blurLayer(layer, 14), "screen");
}

// FIRE: glow on the sky and the ground first, then the smooth flame.
{
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = (x - FIRE.x) / 380;
      const dy = (y - (FIRE.base - 150)) / 360;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < 1) put(x, y, P.orange, 0.4 * Math.pow(1 - r, 1.7));
      // Light thrown on the ground around the base.
      const gx = (x - FIRE.x) / 320;
      const gy = (y - (FIRE.base + 14)) / 56;
      const gr = Math.sqrt(gx * gx + gy * gy);
      if (gr < 1) screen(x, y, P.yellow, 0.55 * Math.pow(1 - gr, 1.3));
    }
  const glow = new Float32Array(W * H * 4);
  // The glow plume the pixels ride on, up and to the left.
  for (let s = 0; s < 1; s += 0.004) {
    const px = FIRE.x - 40 + 130 * Math.sin(s * 2.2) - 80 * s;
    const py = FIRE.base - 380 - s * 520;
    const w = 50 + 90 * s;
    for (let k = 0; k < 40; k++) {
      const ox = (hash(k, s * 1000, 3) - 0.5) * w * 2;
      const oy = (hash(k, s * 1000, 4) - 0.5) * 20;
      paint(glow, Math.round(px + ox), Math.round(py + oy), P.orange, 0.12 * (1 - s * 0.7));
    }
  }
  drawLayer(await blurLayer(glow, 22), "normal", P.orange);

  // A dark burnt base: dot matrix, so the fire stands on something.
  for (const [x0, y0] of blobCells(FIRE.x + 10, FIRE.base + 2, 120, 20, 8, 69, 0.9))
    for (let y = y0; y < y0 + 10; y++)
      for (let x = x0; x < x0 + 10; x++) {
        const l = lum(get(x, y));
        put(x, y, x % 3 === 0 && y % 3 === 0 ? [l, l * 0.8, l * 0.6] : P.ink, 0.92);
      }
  const halo = new Float32Array(W * H * 4);
  for (let y = FIRE.base - 600; y < FIRE.base + 40; y++)
    for (let x = FIRE.x - 340; x < FIRE.x + 300; x++) {
      const v = flameField(x, y);
      if (v > 0.02) paint(halo, x, y, P.orange, 0.55 * smooth(0.02, 0.3, v));
    }
  drawLayer(await blurLayer(halo, 26), "normal", P.orange);

  const flame = new Float32Array(W * H * 4);
  for (let y = FIRE.base - 560; y < FIRE.base + 30; y++)
    for (let x = FIRE.x - 300; x < FIRE.x + 260; x++) {
      const v = flameField(x, y);
      if (v < 0.1) continue;
      const h = clamp((FIRE.base - y) / 520);
      const fil = fbm(x * 0.07, y * 0.009 + 9, 71, 3);
      const lick = v * (0.62 + 0.7 * fil) * (1 - 0.25 * h);
      const a = smooth(0.1, 0.42, lick) * (1 - 0.35 * h);
      // The edge is dithered on a 2px grid, not cut: it dissolves into the air.
      if (a < 0.98 && a < bayer(x >> 1, y >> 1)) continue;
      paint(flame, x, y, flameColour(lick), 1);
    }
  drawLayer(await blurLayer(flame, 0.8), "normal");
}

// ---------- pixel passes: made from what is underneath ----------

// WATER pixels: a mosaic of the poisoned water, quantized to four greens.
{
  const cell = 12;
  const greens = [P.g0, P.g1, P.g2, P.g3];
  for (let y = WATER.y0 + 40; y < WATER.y1 - 4; y += cell)
    for (let x = 24; x < WATER.x1 - 150; x += cell) {
      const m = waterMask[(y + 6) * W + x + 6];
      if (m < 0.5) continue;
      const n = fbm(x * 0.012, y * 0.03, 31, 3);
      if (n < 0.58) continue;
      let l = 0;
      for (let yy = 0; yy < cell; yy++) for (let xx = 0; xx < cell; xx++) l += lum(get(x + xx, y + yy));
      l /= cell * cell;
      rect(x, y, cell, greens[clamp(Math.floor(l * 4.2 - 0.5), 0, 3)]);
    }
  // A dot-screen band where the spill meets the clean water.
  for (let y = WATER.y0 + 2; y < WATER.y0 + 40; y++)
    for (let x = 160; x < 470; x++) {
      if (waterMask[y * W + x] < 0.5) continue;
      if (fbm(x * 0.02, y * 0.05, 32, 2) < 0.45) continue;
      const l = lum(get(x, y));
      put(x, y, l * 1.25 > bayer(x, y) ? P.g3 : P.g0);
    }
  // One flat acid shape on the surface, and a few bubbles.
  for (const [x, y] of blobCells(214, 1150, 74, 30, 12, 33)) rect(x, y, 12, P.acid);
  for (let k = 0; k < 26; k++) {
    const x = Math.round((40 + hash(k, 1, 34) * 400) / 6) * 6;
    const y = Math.round((WATER.y0 + 50 + hash(k, 2, 34) * 170) / 6) * 6;
    if (waterMask[y * W + x] < 0.5) continue;
    rect(x, y, 6, P.g3);
    if (hash(k, 3, 34) < 0.5) rect(x + 6, y - 6, 6, P.white);
  }
}

// EARTH pixels: the mound itself is dying. Its grass turns to dry soil,
// cracked into plates (a Voronoi field), drawn from the photo's own light
// so it keeps the mound's shape, dissolving into the healthy grass at its
// edge, with rust leaking down the bank into the water.
{
  const cell = 6;
  // The mound in the photo: top edge, right slope, the water's edge below.
  const moundTop = (x) => (x < 470 ? 866 - (x / 470) * 8 : 858 + Math.max(0, x - 520) * 0.9);
  const inMound = (x, y) => y > moundTop(x) && y < 1002 && x < 520 + (y - 857) * 1.05;
  // Damage: strongest in the middle of the mound, ragged at the edge.
  const damage = (x, y) => {
    const dx = (x - 330) / 240;
    const dy = (y - 940) / 80;
    return clamp(1.15 - Math.sqrt(dx * dx + dy * dy) + (fbm(x * 0.01, y * 0.025, 101, 4) - 0.5) * 1.1);
  };
  const plates = [];
  for (let i = 0; i < 26; i++) plates.push([60 + hash(i, 1, 102) * 560, 860 + hash(i, 2, 102) * 140]);
  const crack = (x, y) => {
    let f1 = Infinity;
    let f2 = Infinity;
    for (const [px, py] of plates) {
      // Plates are flattened: the ground is seen at an angle.
      const d = Math.hypot(x - px, (y - py) * 1.8);
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) f2 = d;
    }
    return f2 - f1;
  };
  const soil = [hex("#2e1f14"), hex("#4f3622"), hex("#715033"), hex("#957048"), hex("#b8915f")];
  for (let y = 848; y < 1008; y += cell)
    for (let x = 0; x < 700; x += cell) {
      const cx = x + cell / 2;
      const cy = y + cell / 2;
      if (!inMound(cx, cy)) continue;
      const d = damage(cx, cy);
      const t = bayer(x / cell, y / cell);
      if (d < 0.25 || (d < 0.55 && t > (d - 0.25) / 0.3)) continue;
      let l = 0;
      for (const [ox, oy] of [[1, 1], [4, 1], [1, 4], [4, 4]]) l += lum(get(x + ox, y + oy)) / 4;
      // Dead soil, lit like the grass it replaced.
      const v = clamp(l * 1.7 + 0.02 + (t - 0.5) * 0.2);
      let c = soil[clamp(Math.floor(v * 5), 0, 4)];
      const k = crack(cx, cy);
      if (k < 5) c = hex("#150d08");
      else if (k < 9) c = soil[0];
      else if (k < 18) c = soil[clamp(Math.floor(v * 5) + 1, 0, 4)]; // plates curl up: a lit rim
      rect(x, y, cell, c);
    }
  // Rust leaking off the bank and spreading downstream into the water as
  // dithered plumes, rust at the source, thinning into the toxic green.
  for (const [sx, len, seed] of [
    [190, 150, 1],
    [350, 170, 2],
  ]) {
    for (let y = 996; y < 1070; y += 8)
      for (let x = sx - 20; x < sx + len; x += 8) {
        const along = (x - sx) / len;
        const centre = 1004 + along * 34 + (fbm(x * 0.02, seed, 106, 2) - 0.5) * 16;
        const w = 6 + along * 22;
        const d = 1 - Math.abs(y - centre) / w - along * 0.55;
        if (d <= 0 || d < bayer(x / 8, y / 8) * 0.45) continue;
        rect(x, y, 8, along < 0.4 ? hex("#9c4119") : hex("#b9672e"), 0.85);
      }
  }
}

// AIR pixels: the haze as an ordered dither on an 8px grid, three smog
// tones by density, so it fades into the blue in a pattern, not a blur;
// fine dust specks drift above it.
{
  const cell = 8;
  const tones = [hex("#d8cb9c"), hex("#a89155"), hex("#6f5d3c")];
  for (let y = 150; y < 820; y += cell)
    for (let x = 0; x < 820; x += cell) {
      const f = smogField(x + 4, y + 4);
      const d = f * 2.6 + (bayer(x / cell, y / cell) - 0.5) * 1.1;
      if (d < 0.75) continue;
      rect(x, y, cell, tones[clamp(Math.floor(d - 0.75), 0, 2)], 0.92);
    }
  for (let k = 0; k < 60; k++) {
    const x = Math.round((hash(k, 1, 93) * 600) / 6) * 6;
    const base = hillY(x) - 120 - hash(k, 2, 93) * 230;
    const y = Math.round(base / 6) * 6;
    if (y < 430) continue;
    rect(x, y, 6, hash(k, 3, 93) < 0.6 ? hex("#8a7748") : hex("#5a4b31"), 0.8);
  }
}

// FIRE pixels: the upper flame quantized into a mosaic, a white stepped
// crown along its edge, two flat shapes, and checker riding the glow.
{
  const cell = 10;
  const levels = [P.red, P.orange, P.cream, P.white];
  for (let y = FIRE.base - 600; y < FIRE.base - 50; y += cell)
    for (let x = FIRE.x - 300; x < FIRE.x + 260; x += cell) {
      const v = flameField(x + 6, y + 6);
      const h = (FIRE.base - y) / 520;
      const n = fbm(x * 0.03, y * 0.03, 61, 2);
      // Crown: white steps along the flame's outer edge, low down.
      if (((v > 0.12 && v < 0.3 && h > 0.12 && h < 0.6) || (v > 0.5 && h > 0.14 && h < 0.34)) && n > 0.52) {
        rect(x, y, cell, P.white);
        continue;
      }
      // Mosaic: more of the flame turns to pixels the higher it goes.
      if (v > 0.16 && n < 0.05 + h * 0.85) {
        rect(x, y, cell, levels[clamp(Math.floor(v * 4.2), 0, 3)]);
      }
    }
  for (const [x, y] of blobCells(FIRE.x - 22, FIRE.base - 230, 34, 62, 14, 62)) rect(x, y, 14, P.flatRed);
  for (const [x, y] of blobCells(FIRE.x + 46, FIRE.base - 330, 18, 46, 12, 63)) rect(x, y, 12, P.flatBlue);
  // Checker on the glow plume, thinning as it rises.
  const c2 = 14;
  for (let s = 0; s < 1; s += 0.03) {
    const px = FIRE.x - 40 + 130 * Math.sin(s * 2.2) - 80 * s;
    const py = FIRE.base - 380 - s * 520;
    for (let k = 0; k < 4; k++) {
      if (hash(k, s * 999, 64) > 0.42 - s * 0.22) continue;
      const x = Math.round((px + (hash(k, s * 999, 65) - 0.5) * (80 + 120 * s)) / c2) * c2;
      const y = Math.round((py + (hash(k, s * 999, 66) - 0.5) * 30) / c2) * c2;
      rect(x, y, c2, hash(k, s * 999, 67) < 0.86 ? P.white : P.flatBlue);
      if (hash(k, s * 999, 68) < 0.6) rect(x + c2, y + c2, c2, P.white);
      if (hash(k, s * 999, 69) < 0.3) rect(x - c2, y + c2, c2, P.white);
    }
  }
}

// A burnt log in front of the fire, and embers on the ground, so the base
// is broken up instead of sitting on a straight line.
{
  for (const [x0, y0] of blobCells(FIRE.x + 70, FIRE.base + 8, 96, 26, 10, 81, 0.8))
    for (let y = y0; y < y0 + 10; y++)
      for (let x = x0; x < x0 + 10; x++) {
        const l = lum(get(x, y));
        put(x, y, x % 3 < 2 && y % 3 < 2 ? [0.25 + l * 0.6, 0.22 + l * 0.5, 0.2 + l * 0.45].map((v) => clamp(v)) : P.ink);
      }
  for (const [x0, y0] of blobCells(FIRE.x - 130, FIRE.base + 4, 60, 18, 10, 82, 0.8))
    for (let y = y0; y < y0 + 10; y++)
      for (let x = x0; x < x0 + 10; x++) put(x, y, x % 3 < 2 && y % 3 < 2 ? P.ash : P.ink);
  for (let k = 0; k < 40; k++) {
    const x = Math.round((FIRE.x - 260 + hash(k, 1, 83) * 520) / 5) * 5;
    const y = Math.round((FIRE.base - 10 + hash(k, 2, 83) * 50) / 5) * 5;
    rect(x, y, 5, hash(k, 3, 83) < 0.5 ? P.yellow : P.orange, 0.9);
  }
}

// Grain over everything, pixels included.
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const n = (hash(x, y, 99) + hash(x, y, 98) - 1) * 0.065;
    const i = (y * W + x) * 3;
    img[i] = clamp(img[i] + n);
    img[i + 1] = clamp(img[i + 1] + n);
    img[i + 2] = clamp(img[i + 2] + n);
  }

const out = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H * 3; i++) out[i] = Math.round(clamp(img[i]) * 255);
mkdirSync(dirname(OUT), { recursive: true });
await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 9 }).toFile(OUT);
console.log(`✅ ${OUT}`);
