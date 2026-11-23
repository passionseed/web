#!/usr/bin/env node
/**
 * Builds the Elemental key visual's image plate: the healthy photo, poisoned
 * by four pixel elements. Type is laid over it in React.
 *
 *   node scripts/render-elemental-plate.mjs [--corrupt 0..1]
 *
 * --corrupt sets how far the place has been poisoned: 0 is the clean photo,
 * 1 (the default) is the poster. The elements arrive one after another, as
 * a story (scripts/elemental-stages.mjs): the e-waste is dumped, it leaks
 * into the river, the fire takes hold, and its smoke rises from it. The GIF script uses it to animate from
 * normal to corrupted.
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

import { stage as stageOf } from "./elemental-stages.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BG = join(ROOT, "public/hackathon/poster/elemental/bg/river-joana-abreu-unsplash.jpg");
// --sky blue turns the overcast sky blue and writes plate-key-blue.png.
const SKY_BLUE = process.argv.includes("--sky") && process.argv[process.argv.indexOf("--sky") + 1] === "blue";
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);
// Animation: --frame f --frames n draws frame f of a seamless loop, --out
// overrides the file. Without them the plate is the still poster.
const FRAMES = Number(arg("--frames") ?? 0);
const FRAME = Number(arg("--frame") ?? 0);
const PHASE = FRAMES ? FRAME / FRAMES : 0; // 0..1 around the loop
/**
 * Straight-line motion that still loops: sample the pattern moved by
 * v * phase and by v * (phase - 1), and crossfade from one to the other.
 * At the end of the loop the second copy sits exactly where the first one
 * started, so it repeats without a jump, and nothing goes round in circles.
 * `f(dx, dy)` samples the noise offset by (dx, dy) poster pixels; v is how
 * far the pattern travels in one loop. The variance fix keeps contrast even.
 */
const flow = (f, vx, vy) => {
  if (!FRAMES) return f(0, 0);
  const a = f(-vx * PHASE, -vy * PHASE);
  const b = f(-vx * (PHASE - 1), -vy * (PHASE - 1));
  const n = (1 - PHASE) * a + PHASE * b;
  return 0.5 + (n - 0.5) / Math.hypot(1 - PHASE, PHASE);
};
const clampArg = (v) => Math.min(1, Math.max(0, v));
const CORRUPT = arg("--corrupt") === undefined ? 1 : clampArg(Number(arg("--corrupt")));
// --qr-smoke: the top of the smoke organises itself into the sign-up QR code
// (Angpao, 2026-11-23: "try to make smoke form as qr"). Writes its own file.
const QR_SMOKE = process.argv.includes("--qr-smoke");
const QR_URL = "https://www.passionseed.org/hackathon/join?src=poster";
const OUT = arg("--out") ?? join(ROOT, `public/hackathon/poster/elemental/plate-key${SKY_BLUE ? "-blue" : ""}${QR_SMOKE ? "-qrsmoke" : ""}.png`);
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
/** How far each element has spread, 0..1, from the overall --corrupt level. */
const E = Object.fromEntries(["earth", "water", "fire", "air"].map((k) => [k, stageOf(k, CORRUPT)]));
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
  g0: hex("#0e1d06"),
  g1: hex("#244710"),
  g2: hex("#4a7d1a"),
  g3: hex("#8dbd3c"),
  acid: hex("#84c424"),
  smogA: hex("#b39a48"),
  smogB: hex("#7a6a45"),
  mustard: hex("#cdb047"),
  smogPale: hex("#e6e1cb"),
  smokeHaze: hex("#8a857c"),
};

// ---------- layout (poster pixels, tied to the photo's crop) ----------
const FIRE = { x: 806, base: 908 };
const WATER = { x0: 0, x1: 1080, y0: 925, y1: 1246 };
// The dump runs along the river bank, from the left edge to past the fire, so
// the fire burns the e-waste and the runoff goes straight into the river
// (Angpao, 2026-11-22: same quality as the coming-soon posts). Its foot
// follows the shoreline in the photo.
// Placement as in Bunyasit's layout (PR 356), asked for by Angpao,
// 2026-11-23: the dump is a pile on the near bank left of the fire, and the
// fire stands on its own.
const X0 = 70;
const X1 = 612;
const SHORE = [[0, 1008], [430, 1002], [600, 990], [672, 956], [1080, 934]];
const baseAt = (x) => {
  for (let i = 1; i < SHORE.length; i++)
    if (x <= SHORE[i][0]) return mix(SHORE[i - 1][1], SHORE[i][1], clamp((x - SHORE[i - 1][0]) / (SHORE[i][0] - SHORE[i - 1][0])));
  return SHORE[SHORE.length - 1][1];
};
/** The dump's skyline: tall on the near bank, lower on the far bank by the fire. It grows as more is dumped. */
const topLong = (x) => {
  const u = (x - X0) / (X1 - X0);
  if (u <= 0 || u >= 1) return baseAt(x) + 99;
  const tall = 112;
  return baseAt(x) - tall * Math.pow(Math.sin(Math.PI * u), 0.45) * (0.55 + 0.9 * fbm(x * 0.008, 3, 51, 4)) * E.earth;
};

function flameField(x, y) {
  const tongues = [
    { cx: FIRE.x, w: 250, h: 430, lean: -40 },
    { cx: FIRE.x - 78, w: 140, h: 270, lean: -50 },
    { cx: FIRE.x + 70, w: 150, h: 320, lean: -20 },
    { cx: FIRE.x + 10, w: 110, h: 520, lean: -70 },
  ];
  let best = 0;
  for (const [i, g] of tongues.entries()) {
    // Each tongue's height flickers on its own, never on a regular beat.
    const flick = FRAMES ? flow((dx, dy) => vnoise(i * 13.7, dy * 0.012, 140), 0, -400) - 0.5 : 0;
    // The fire grows from a small flame at its base as it takes hold.
    const gh = g.h * (1 + 0.16 * flick) * (0.08 + 0.92 * E.fire);
    const t = (FIRE.base - y) / gh;
    if (t < -0.08 || t > 1) continue;
    const tt = Math.max(t, 0);
    // The licks rise: the wobble pattern travels up the flame.
    const wob = 46 * (flow((dx, dy) => fbm((x + dx) * 0.012, (y + dy) * 0.02 + 3, 5, 3), 0, -240) - 0.5) * (0.3 + tt);
    const c = g.cx + g.lean * Math.pow(tt, 1.6) + wob;
    const hw = (g.w / 2) * (0.45 + 0.55 * E.fire) * Math.pow(1 - tt, 0.7) * (t < 0 ? 1 + t * 6 : 1);
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

// AIR: the fire's own smoke. A plume that rises straight out of the flame
// tips and leans a little with the wind as it climbs, so fire and smoke read
// as one thing (Angpao, 2026-11-21: the band over the hill looked strange).
// Dark and thick at the fire, thinner and paler as it rises. It stays clear
// of the title block on the left.
const SMOKE_BASE = 545; // inside the flames, so it seems to come out of them
const SMOKE_TOP = 40;
/** Where the plume is at height y: its centre, half-width and how far up (0 at the fire, 1 at the top). */
const smokeAt = (y) => {
  const t = clamp((SMOKE_BASE - y) / (SMOKE_BASE - SMOKE_TOP));
  // It curls: an S that grows as it climbs, and leans left with the wind.
  // It leans right, away from the title, and fans out wide as it climbs.
  // Mostly upright but spread out (Angpao, 2026-11-23): it fans as wide as
  // the first version, with about half of that version's curl and lean.
  const curl = 70 * Math.sin(t * 4.5 + 0.4) * Math.pow(t, 0.8);
  return { t, xc: FIRE.x - 10 + 70 * Math.pow(t, 1.4) + curl, hw: 34 + 188 * Math.pow(t, 1.05) };
};
/** Smoke density 0..1. */
const smogField = (x, y) => {
  if (y > SMOKE_BASE + 140 || y < SMOKE_TOP - 60) return 0;
  const { t, xc, hw } = smokeAt(y);
  // Rises with the heat and drifts a little left.
  const n = flow((dx, dy) => fbm((x + dx) * 0.012, (y + dy) * 0.01, 92, 4), -30, -160);
  const billow = flow((dx, dy) => fbm((x + dx) * 0.006, (y + dy) * 0.007, 95, 3), -30, -160);
  // Billows: the width swells and pinches a lot, and the centre wanders.
  const w = hw * (0.7 + 0.8 * billow);
  const d = Math.abs(x - xc - (billow - 0.5) * 150 * t) / w;
  if (d >= 1.8) return 0;
  // Scattered: past the plume's edge, loose wisps and specks break away.
  if (d >= 1) {
    const speck = fbm(x * 0.05, y * 0.05, 99, 2);
    const wisp = flow((dx, dy) => fbm((x + dx) * 0.02, (y + dy) * 0.03, 98, 3), -30, -160);
    const loose = ((1.8 - d) / 0.8) * smooth(0.55, 0.7, wisp) * (speck > 0.5 ? 1 : 0.3) * (0.3 + 0.7 * t);
    const start0 = smooth(SMOKE_BASE + 60, SMOKE_BASE - 40, y);
    const reach0 = 1 - smooth(E.air * 1.15 - 0.15, E.air * 1.15, t);
    const off0 = 1 - (1 - smooth(500, 540, y)) * (1 - smooth(690, 730, x));
    return clamp(0.45 * loose * start0 * reach0 * off0 * smooth(0, 0.35, E.air) * (E.fire > 0 ? 1 : 0));
  }
  // Round puffs, not a solid column: gaps open between them, more as it thins.
  const puffs = smooth(0.15 + 0.3 * t, 0.5, flow((dx, dy) => fbm((x + dx) * 0.014, (y + dy) * 0.014, 97, 3), -30, -160));
  // How high it has climbed so far in the story.
  const reach = 1 - smooth(E.air * 1.15 - 0.15, E.air * 1.15, t);
  // It starts inside the flames, with a ragged bottom: wisps reach down
  // into the flame tips at different heights.
  const start = smooth(SMOKE_BASE + 90 + (n - 0.5) * 140, SMOKE_BASE - 60, y);
  // Kept off the title block (left of x 690, above y 500).
  const offTitle = 1 - (1 - smooth(500, 540, y)) * (1 - smooth(690, 730, x + (n - 0.5) * 40));
  // Solid in the core; the puffs and gaps are at the edge only.
  const f = (1 - d * d) * reach * start * mix(1, puffs, smooth(0.35, 0.9, d)) * (1 - 0.35 * t) * (0.7 + 0.6 * n);
  return clamp(f * offTitle * smooth(0, 0.35, E.air) * (E.fire > 0 ? 1 : 0));
};
// The sky before any smoke, kept so the QR pass can open clear air again.
const skyCopy = QR_SMOKE ? Float32Array.from(img) : null;
// A faint haze behind it, so the pixels sit in the air.
{
  const haze = new Float32Array(W * H * 4);
  for (let y = 0; y < 720; y++)
    for (let x = 440; x < 1080; x++) {
      const f = smogField(x, y);
      if (f > 0.05) paint(haze, x, y, P.smokeHaze, 0.3 * f);
    }
  drawLayer(await blurLayer(haze, 18), "normal", P.smokeHaze);
}

// WATER: the dump's runoff poisons the river. Green blooms spread out from
// the dump's foot in patches, not as one sheet, and the water keeps its own
// ripples and reflections under the colour.
const isWater = (x, y) => {
  if (x < WATER.x0 || x >= WATER.x1 || y < WATER.y0 || y >= WATER.y1) return 0;
  const b = y - baseAt(x);
  if (b < -4) return 0;
  const wet = smooth(0.34, 0.46, lum(get(x, y)));
  if (wet <= 0) return 0;
  // The poison spreads away from the dump's foot, further on the left.
  const reach = b + x * 0.1 + Math.max(0, x - X1) * 1.1 + 150 * (fbm(x * 0.004, y * 0.02, 21, 4) - 0.5);
  const edge = 1 - smooth(E.water * 420 - 90, E.water * 420 - 20, reach);
  if (edge <= 0 || (edge < 1 && edge < bayer(x >> 1, y >> 1))) return 0;
  // Patches: thick where the stains run in, drifting blooms further out.
  const blooms = smooth(0.5, 0.62, fbm(x * 0.0026, y * 0.009, 24, 4)) * smooth(780, 320, x);
  const inflow = 1.3 * smooth(200, 40, b + Math.max(0, x - X1) * 1.1 + (fbm(x * 0.008, y * 0.02, 25, 3) - 0.5) * 180);
  const patch = clamp(blooms + inflow - 0.15);
  if (patch <= 0 || (patch < 1 && patch < bayer(x >> 1, y >> 1))) return 0;
  return wet;
};
const waterMask = new Float32Array(W * H);
let waterLum = 0.6;
if (E.water > 0) {
  let sum = 0;
  let n = 0;
  for (let y = WATER.y0; y < WATER.y1; y++)
    for (let x = WATER.x0; x < WATER.x1; x++) {
      const m = (waterMask[y * W + x] = isWater(x, y));
      if (m > 0.5) {
        sum += lum(get(x, y));
        n++;
      }
    }
  if (n) waterLum = sum / n;
}
{
  const bright = hex("#b4d44e");
  for (let y = WATER.y0; y < WATER.y1; y++)
    for (let x = WATER.x0; x < WATER.x1; x++) {
      const m = waterMask[y * W + x];
      if (!m) continue;
      const l = lum(get(x, y));
      // Stretch the water's own light around its average, then map it from
      // murky to acid, with slow oily swirls. Only the brightest ripples
      // reach acid green.
      const tl = clamp(0.3 + (l - waterLum) * 2.4 + (fbm(x * 0.004, y * 0.014, 23, 4) - 0.5) * 0.4);
      // Thick and dark by the dump, thinner further out.
      const near = smooth(220, 20, y - baseAt(x));
      const toxic = tl < 0.5 ? P.g0.map((v, k) => mix(v, P.g2[k], tl * 2)) : P.g2.map((v, k) => mix(v, bright[k], (tl - 0.5) * 2));
      put(x, y, toxic, (0.6 + 0.22 * near) * m);
    }
}

// FIRE: glow on the sky and the ground first, then the smooth flame.
if (E.fire > 0) {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = (x - FIRE.x) / 380;
      const dy = (y - (FIRE.base - 150)) / 360;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < 1) put(x, y, P.orange, 0.4 * E.fire * Math.pow(1 - r, 1.7));
      // Light thrown on the ground around the base.
      const gx = (x - FIRE.x) / 320;
      const gy = (y - (FIRE.base + 14)) / 56;
      const gr = Math.sqrt(gx * gx + gy * gy);
      if (gr < 1) screen(x, y, P.yellow, 0.55 * E.fire * Math.pow(1 - gr, 1.3));
    }
  const glow = new Float32Array(W * H * 4);
  // The glow plume the pixels ride on, up and to the left.
  for (let s = 0; s < 1; s += 0.004) {
    const px = FIRE.x - 36 + 84 * Math.sin(s * 2.2) - 44 * s;
    const py = FIRE.base - (380 + s * 520) * (0.2 + 0.8 * E.fire);
    const w = 50 + 90 * s;
    for (let k = 0; k < 40; k++) {
      const ox = (hash(k, s * 1000, 3) - 0.5) * w * 2;
      const oy = (hash(k, s * 1000, 4) - 0.5) * 20;
      paint(glow, Math.round(px + ox), Math.round(py + oy), P.orange, 0.12 * smooth(0.35, 1, E.fire) * (1 - s * 0.7));
    }
  }
  drawLayer(await blurLayer(glow, 22), "normal", P.orange);

  // A dark burnt base: dot matrix, so the fire stands on something (as in
  // Bunyasit's plate; Angpao, 2026-11-23: black at the bottom of the fire).
  for (const [x0, y0] of blobCells(FIRE.x + 10, FIRE.base + 2, 120, 20, 8, 69, 0.9))
    for (let y = y0; y < y0 + 10; y++)
      for (let x = x0; x < x0 + 10; x++) {
        const l = lum(get(x, y));
        put(x, y, x % 3 === 0 && y % 3 === 0 ? [l, l * 0.8, l * 0.6] : P.ink, 0.92 * smooth(0, 0.3, E.fire));
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
      const fil = flow((dx, dy) => fbm((x + dx) * 0.07, (y + dy) * 0.009 + 9, 71, 3), 0, -320);
      const lick = v * (0.62 + 0.7 * fil) * (1 - 0.25 * h);
      const a = smooth(0.1, 0.42, lick) * (1 - 0.35 * h);
      // The edge is dithered on a 2px grid, not cut: it dissolves into the air.
      if (a < 0.98 && a < bayer(x >> 1, y >> 1)) continue;
      paint(flame, x, y, flameColour(lick), 1);
    }
  drawLayer(await blurLayer(flame, 0.8), "normal");
  // Bloom: the flame's own light spilling into the air around it.
  for (let i = 3; i < flame.length; i += 4) flame[i] *= 0.28;
  drawLayer(await blurLayer(flame, 28), "screen");
  // Scorched ground: the plain burnt black around the base, fading out in a
  // dithered ring of ash and singed grass, so the fire stands in the land
  // and not on a slab.
  for (let y = FIRE.base - 60; y < FIRE.base + 70; y++)
    for (let x = FIRE.x - 330; x < FIRE.x + 274; x++) {
      const dx = (x - FIRE.x) / 300;
      const dy = (y - (FIRE.base + 10)) / 52;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.45 * (fbm(x * 0.02, y * 0.06, 85, 3) - 0.5);
      if (d >= 1) continue;
      // Around the flame, not over it.
      if (flameField(x, y) > 0.08) continue;
      const burn = (1 - d) * smooth(0, 0.3, E.fire);
      if (burn < 0.35 && burn * 2.8 < bayer(x >> 1, y >> 1)) continue;
      const c = get(x, y);
      const scorch = burn > 0.55 ? (x % 3 < 2 && y % 3 < 2 ? P.ash : P.ink) : c.map((v, k) => v * 0.45 + [0.05, 0.03, 0.02][k]);
      put(x, y, scorch, Math.min(0.95, 0.5 + burn));
    }
}

// ---------- pixel passes: made from what is underneath ----------

// WATER pixels: algal scum, a mosaic of the poisoned water in four greens. A
// band along the shore that thins out into the open water in a dither.
{
  const cell = 10;
  for (let y = WATER.y0; y < WATER.y1 - 12; y += cell)
    for (let x = WATER.x0; x < WATER.x1 - 12; x += cell) {
      if (waterMask[(y + 6) * W + x + 6] < 0.5) continue;
      // The toxic water flows along the river.
      const n = flow((dx, dy) => fbm((x + dx) * 0.012, (y + dy) * 0.03, 31, 3), -70, 0);
      const up = (d) => (y - d < WATER.y0 || waterMask[(y - d) * W + x] < 0.5 ? 1 : 0);
      const scum = n + up(24) * 0.2;
      if (scum < 0.7) continue;
      if (scum < 0.8 && bayer(x / cell, y / cell) > (scum - 0.7) * 10) continue;
      let l = 0;
      for (let yy = 0; yy < cell; yy++) for (let xx = 0; xx < cell; xx++) l += lum(get(x + xx, y + yy));
      l /= cell * cell;
      rect(x, y, cell, [P.g0, P.g1, P.g2, P.g3][clamp(Math.floor(l * 5.4 - 0.4), 0, 3)], 0.9);
    }
  // Oily swirls on the surface, strongest near the dump.
  const c6 = 6;
  if (E.water > 0)
    for (let y = WATER.y0; y < WATER.y1 - c6; y += c6)
      for (let x = 0; x < W - c6; x += c6) {
        if (waterMask[(y + 3) * W + x + 3] < 0.5) continue;
        const wx = x + 160 * (fbm(x * 0.003, y * 0.006, 201, 3) - 0.5);
        const wy = y + 80 * (fbm(x * 0.003, y * 0.006, 202, 3) - 0.5);
        const band = 1 - Math.abs(Math.sin(wx * 0.006 + wy * 0.045 + 7 * fbm(wx * 0.0025, wy * 0.005, 203, 3)));
        const near = smooth(250, 30, y - baseAt(x));
        const th = 0.92 - 0.04 * near;
        if (band < th) continue;
        if (band < th + 0.05 && bayer(x / c6, y / c6) > 0.5) continue;
        const l = lum(get(x, y));
        rect(x, y, c6, l > 0.36 ? P.acid : l > 0.24 ? P.g3 : P.g2, 0.6 * near + 0.3);
      }
  // A few bubbles.
  for (let k = 0; k < 30; k++) {
    const x = Math.round((40 + hash(k, 1, 34) * 900) / 6) * 6;
    const y = Math.round((baseAt(x) + 20 + hash(k, 2, 34) * 200) / 6) * 6;
    if (y >= WATER.y1 || waterMask[y * W + x] < 0.5) continue;
    rect(x, y, 6, P.g3);
    if (hash(k, 3, 34) < 0.5) rect(x + 6, y - 6, 6, P.white);
  }
}

// EARTH pixels: an e-waste dump all along the bank. Circuit boards, monitors,
// cracked phones, cable loops, keyboards and batteries on a dot screen of the
// photo, so the pile keeps the land's light. Black runoff leaks from its foot
// into the river, rubbish floats out from it, and the part under the fire
// burns: the pile's own image turns to fire colours.
if (E.earth > 0) {
  const PCB = hex("#33603e"), PCB_D = hex("#1d4a29"), TRACE = hex("#7aa266"), GOLD = hex("#d2a63a");
  const CHIP = hex("#141414"), SCREEN = hex("#0f1418"), GLASS = hex("#9fb6c4");
  const PLASTIC = [hex("#c9c4b8"), hex("#8f8a80"), hex("#d9d4c6"), hex("#5c5a55")];
  const WIRES = [hex("#141414"), hex("#c23a2a"), hex("#2f5fa8"), hex("#d8b23a"), hex("#e8e6de")];
  const BATT = [hex("#2a2a2a"), hex("#c76a2a"), hex("#3a6fb0")];
  const C = 4; // e-waste detail grid
  const SEED = 111;
  const footAt = (x) => baseAt(x) - 6 + 10 * fbm(x * 0.03, SEED, 68, 2);
  const inHeap = (x, y) => x > X0 && x < X1 && y >= topLong(x) && y <= footAt(x);
  const px = (x, y, c) => {
    const xx = Math.round(x / C) * C;
    const yy = Math.round(y / C) * C;
    if (!inHeap(xx, yy)) return;
    // Lower in the heap is in shadow.
    const sh = clamp((yy - topLong(xx)) / Math.max(20, baseAt(xx) - topLong(xx)));
    rect(xx, yy, C, c.map((v) => v * (1 - 0.45 * sh)));
  };
  // Runoff: a black oily slick on the water along the dump's foot.
  for (let x = X0; x < X1 + 30; x++) {
    const b = baseAt(Math.min(x, X1));
    const reach = 14 + 26 * fbm(x * 0.012, 1, 61, 3);
    for (let y = Math.round(b - 8); y < b + reach; y++) {
      const d = (y - b + 8) / (reach + 8) + 0.3 * (fbm(x * 0.05, y * 0.1, 62, 2) - 0.5);
      if (d >= 1 || (d > 0.5 && bayer(x >> 1, y >> 1) < (d - 0.5) * 2)) continue;
      put(x, y, hash(x, y, 63) < 0.05 ? P.acid : [0.06, 0.07, 0.04], 0.8 * E.earth);
    }
  }
  // Underlay: the photo as a dot screen, with a dithered top edge.
  for (let y = 840; y < 1020; y++)
    for (let x = X0; x < X1; x++) {
      if (!inHeap(x, y)) continue;
      const top = topLong(x);
      if (y < top + 6 && bayer(x >> 1, y >> 1) > (y - top + 1) / 7) continue;
      const l = lum(get(x, y));
      put(x, y, x % 3 < 2 && y % 3 < 2 ? [l * 0.9, l * 0.9, l * 0.85] : [0.16, 0.16, 0.15], 0.95);
    }
  const r = (k, i) => hash(k, i, SEED);
  // Items, back to front. They land one by one, in a fixed order.
  const list = [];
  for (let k = 0; k < 250; k++) {
    if (r(k, 15) >= E.earth) continue;
    const x = X0 + r(k, 1) * (X1 - X0);
    const top = topLong(x);
    const y = top + r(k, 2) * (baseAt(x) - top);
    const roll = r(k, 3);
    // Mostly casings, monitors and cables; boards are the accent.
    list.push({ k, x, y, type: roll < 0.18 ? 0 : roll < 0.3 ? 2 : roll < 0.48 ? 3 : roll < 0.6 ? 4 : roll < 0.68 ? 5 : 6 });
  }
  list.sort((a, b) => a.y - b.y);
  for (const { k, x, y, type } of list) {
    if (type === 0) {
      // Circuit board, slightly tilted, with traces, pads and a chip.
      const w = 10 + Math.floor(r(k, 4) * 8), hh = 5 + Math.floor(r(k, 5) * 5), tilt = (r(k, 6) - 0.5) * 0.5;
      for (let j = 0; j < hh; j++)
        for (let i = 0; i < w; i++) {
          let c = (i + j) % 7 === 0 ? PCB_D : PCB;
          if (j === Math.floor(hh / 2) || i % 5 === 2) c = TRACE;
          if ((i * 3 + j * 5) % 11 === 0) c = GOLD;
          if (i > w / 2 - 2 && i < w / 2 + 2 && j > 0 && j < hh - 1) c = CHIP;
          px(x + (i - w / 2) * C, y + (j - hh / 2) * C + (i - w / 2) * tilt * C, c);
        }
    } else if (type === 2) {
      // Phone with a cracked screen.
      for (let j = 0; j < 10; j++)
        for (let i = 0; i < 6; i++) {
          const edge = i === 0 || j === 0 || i === 5 || j === 9;
          const crack = Math.abs(i - (j * 0.6 + 1)) < 0.6 || Math.abs(i - (10 - j) * 0.5) < 0.5;
          px(x + i * C, y + j * C * 0.7, edge ? PLASTIC[3] : crack ? GLASS : SCREEN);
        }
    } else if (type === 3) {
      // A loop of cable.
      const c = WIRES[Math.floor(r(k, 7) * WIRES.length)], rad = (2 + r(k, 8) * 3.5) * C;
      for (let t = 0; t < Math.PI * 1.7; t += 0.12) px(x + Math.cos(t + k) * rad, y + Math.sin(t + k) * rad * 0.45, c);
    } else if (type === 4) {
      // Keyboard keys / casing.
      const c = PLASTIC[Math.floor(r(k, 9) * 3)];
      for (let j = 0; j < 3; j++) for (let i = 0; i < 7; i++) px(x + i * C * 1.5, y + j * C * 1.5, (i + j) % 2 ? c : PLASTIC[1]);
    } else if (type === 6) {
      // A monitor or casing: a plastic box, a dark screen with a glare.
      const w = 9 + Math.floor(r(k, 11) * 6), hh = 6 + Math.floor(r(k, 12) * 4);
      const shell = PLASTIC[Math.floor(r(k, 13) * 4)], scr = r(k, 14) < 0.6;
      for (let j = 0; j < hh; j++)
        for (let i = 0; i < w; i++) {
          const inner = scr && i > 0 && j > 0 && i < w - 1 && j < hh - 1;
          px(x + i * C, y + j * C, inner && i === j + 1 ? GLASS : inner ? SCREEN : (i + j) % 6 === 0 ? PLASTIC[1] : shell);
        }
    } else {
      // A battery.
      const c = BATT[Math.floor(r(k, 10) * BATT.length)];
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) px(x + i * C, y + j * C, i === 5 ? GOLD : j === 0 ? PLASTIC[2] : c);
    }
  }
  // Loose wires trailing off the pile.
  for (let k = 0; k < Math.round(8 * E.earth); k++) {
    let x = X0 + r(k, 20) * (X1 - X0), y = baseAt(x) - 4;
    const c = WIRES[k % WIRES.length];
    for (let i = 0; i < 18; i++) {
      x += (r(k, 30 + i) - 0.3) * 2 * C;
      y += r(k, 60 + i) * 0.8 * C;
      rect(Math.round(x / C) * C, Math.round(y / C) * C, C, c, 0.95);
    }
  }
  // Rubbish floating out from the dump onto the river, thinning with distance.
  {
    const junkC = [hex("#c9c4b8"), hex("#e8e6de"), hex("#0f1418"), hex("#c23a2a"), hex("#2f5fa8"), hex("#d8b23a"), hex("#8f8a80")];
    for (let k = 0; k < Math.round(95 * E.earth); k++) {
      const x = Math.round(X0 + 40 + hash(k, 1, 131) * (X1 - X0));
      const y = Math.round(baseAt(x) + 10 + Math.pow(hash(k, 2, 131), 2.6) * 170);
      // On the water only (the water is the bright part of the photo here).
      if (y >= WATER.y1 || lum(get(x, y)) < 0.3) continue;
      const c = junkC[Math.floor(hash(k, 4, 131) * junkC.length)];
      const n = 1 + Math.floor(hash(k, 5, 131) * 3);
      for (let i = 0; i < n; i++) rect(Math.round(x / 4) * 4 + i * 4, Math.round(y / 4) * 4, 4, c, 0.95);
    }
  }
  // The garbage under and beside the fire catches. The burn is measured from
  // where the flame meets the heap, so the nearest garbage is always the most
  // burnt: solid at the flame's foot, then an ordered dither that thins with
  // distance, nothing skipped in between.
  if (E.fire > 0) {
    const levels = ["#3e0f06", "#5a1508", "#8e2410", "#b8301a", "#e2461b", "#f38a36", "#ffd067"].map(hex);
    const FOOT = 105; // half-width of the flame where it meets the heap
    const heatAt = (x, y) => {
      const hx = Math.max(0, Math.abs(x - FIRE.x) - FOOT * E.fire) / 120;
      const vy = Math.max(0, y - topLong(x)) / 56;
      // Only the edge is ragged; the inside is never broken up.
      return (1 - Math.sqrt(hx * hx + vy * vy) - 0.14 * (fbm(x * 0.012, y * 0.03, 161, 3) - 0.5)) * smooth(0, 0.5, E.fire);
    };
    for (let y = FIRE.base - 80; y < FIRE.base + 110; y += 2)
      for (let x = FIRE.x - FOOT - 230; x < FIRE.x + FOOT + 230; x += 2) {
        if (!inHeap(x, y)) continue;
        const heat = heatAt(x, y);
        if (heat <= 0) continue;
        // Solid by the flame, then fewer and fewer dots.
        if (heat < 0.7 && heat * 1.3 < bayer(x >> 1, y >> 1)) continue;
        const l = lum(get(x, y));
        rect(x, y, 2, levels[clamp(Math.floor((l * 0.75 + heat * 0.85) * 4.1), 0, 6)], 0.94);
      }
  }
}

// AIR pixels: the smoke as an ordered dither on an 8px grid, in smoke
// greys: dark and dense by the fire, pale where it thins over the hill, so
// it fades into the sky in a pattern, not a blur.
{
  const cell = 8;
  const tones = [hex("#9c978e"), hex("#7a756d"), hex("#55514b"), hex("#34312d")];
  for (let y = 0; y < 720; y += cell)
    for (let x = 440; x < 1080; x += cell) {
      const f = smogField(x + 4, y + 4);
      if (f < 0.04) continue; // clear sky stays clear
      // A wide dither spread, so the edges break into scattered cells.
      // Half ordered, half random, so it never shows a regular checker.
      const d = f * 3 + (0.45 * bayer(x / cell, y / cell) + 0.55 * hash(x, y, 77) - 0.5) * 1.9;
      if (d < 0.75) continue;
      // Darker near the fire and where it's thick.
      const near = 1 - smokeAt(y).t;
      rect(x, y, cell, tones[clamp(Math.floor(d - 0.75 + near * 1.4), 0, 3)], 0.92);
    }
}

// FLOATING BLOCKS, after the LOOK+ reference. Placed by hand on a 20px grid,
// not at random: see-through orange blocks ride the fire's plume and get
// fainter as they rise, darker "missing tiles" of sky sit beside them, and a
// few white and pale-blue accents and sharp checker clusters break the
// edges. All of it stays right of the title.
if (E.fire > 0.5) {
  const on = smooth(0.5, 1, E.fire) * smooth(0.2, 0.8, E.air);
  const steps = (x, y, w, h, k) => [
    [x, y, w, h],
    [x + Math.round((w * 0.4) / 20) * 20, y + h, Math.max(20, Math.round((w * 0.5) / 20) * 20), 20 + 20 * (k % 3)],
    ...(k % 2 ? [[x - 40, y + 20, 40, 20]] : []),
  ];
  const glow = [
    // [x, y, w, h, strength] along the plume, bottom to top
    [840, 540, 80, 60, 0.9], [720, 480, 60, 80, 0.8], [860, 400, 100, 60, 0.65], [760, 300, 80, 60, 0.55],
    [900, 200, 60, 100, 0.45], [800, 100, 120, 60, 0.4],
  ];
  const soft = new Float32Array(W * H * 4);
  glow.forEach(([x, y, w, h, st], k) => {
    for (const [bx, by, bw, bh] of steps(x, y, w, h, k))
      for (let yy = by; yy < by + bh; yy++)
        for (let xx = bx; xx < bx + bw; xx++) {
          // Hot at the bottom, fading up, like light leaking out of the fire.
          const t = (yy - by) / bh;
          paint(soft, xx, yy, t > 0.55 ? hex("#f08a3c") : hex("#f6b26b"), on * st * (0.3 + 0.7 * t));
        }
  });
  drawLayer(await blurLayer(soft, 3), "normal");
  [[900, 460, 80, 100], [700, 180, 100, 80], [960, 60, 60, 80]].forEach(([x, y, w, h], k) => {
    for (const [bx, by, bw, bh] of steps(x, y, w, h, k + 1))
      for (let yy = by; yy < by + bh; yy++)
        for (let xx = bx; xx < bx + bw; xx++) if (xx >= 0 && yy >= 0 && xx < W && yy < H) put(xx, yy, get(xx, yy).map((v) => v * 0.7), 0.6 * on);
  });
  for (const [x, y, w, h, c, a] of [
    [900, 600, 40, 40, P.white, 0.7], [960, 320, 40, 60, P.flatBlue, 0.8],
  ])
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, c, a * on);
  // Sharp checker clusters at the edges of the blocks.
  const C2 = 10;
  [[860, 250], [720, 400], [940, 560]].forEach(([cx, cy], j) => {
    const col = j % 3 === 1 ? P.flatBlue : P.white;
    for (let a = 0; a < 6; a++)
      for (let b = 0; b < 6; b++) {
        if ((a + b) % 2 || hash(j * 40 + a * 6 + b, 1, 23) < 0.4) continue;
        rect(cx + a * C2, cy + b * C2, C2, col, 0.95 * on);
      }
  });
}

// FIRE pixels, after the LOOK+ reference: the flame keeps its smooth light,
// and flat one-colour stepped shapes sit on it. Red-orange down the flame's
// axis, pale blue beside it, a white stepped crown low on its edge, and the
// tips break into white cells. No multi-tone mosaic.
if (E.fire > 0) {
  const cell = 10;
  for (let y = FIRE.base - 600; y < FIRE.base - 30; y += cell)
    for (let x = FIRE.x - 300; x < FIRE.x + 260; x += cell) {
      const v = flameField(x + 5, y + 5);
      if (v <= 0.1) continue;
      const h = (FIRE.base - y) / 520;
      // The flame's pixels rise with it.
      const n = flow((dx, dy) => fbm((x + dx) * 0.03, (y + dy) * 0.03, 61, 2), 0, -260);
      // Crown: white steps along the flame's outer edge, low down.
      if (((v > 0.12 && v < 0.3 && h > 0.12 && h < 0.6) || (v > 0.5 && h > 0.14 && h < 0.34)) && n > 0.52) rect(x, y, cell, P.white);
      // The tips break into white cells.
      else if (h > 0.6 && n < 0.18 + (h - 0.6) * 1.1) rect(x, y, cell, P.white);
    }
  const G = 12;
  const flat = (cx, cy, rx, ry, c, seed) => {
    for (const [x, y] of blobCells(cx, cy, rx, ry, G, seed, 0.75)) rect(x, y, G, c);
  };
  if (E.fire > 0.7) {
    flat(FIRE.x - 22, FIRE.base - 225, 46, 70, P.flatRed, 62);
  }
  if (E.fire > 0.85) {
    flat(FIRE.x + 54, FIRE.base - 300, 14, 50, P.flatBlue, 63);
    flat(FIRE.x + 6, FIRE.base - 352, 9, 20, P.flatBlue, 65);
  }
}

// Burnt logs in front of the fire, so the base is broken up instead of
// sitting on a straight line (as in Bunyasit's plate).
if (E.fire > 0.15) {
  for (const [x0, y0] of blobCells(FIRE.x + 70, FIRE.base + 8, 96, 26, 10, 81, 0.8))
    for (let y = y0; y < y0 + 10; y++)
      for (let x = x0; x < x0 + 10; x++) {
        const l = lum(get(x, y));
        put(x, y, x % 3 < 2 && y % 3 < 2 ? [0.25 + l * 0.6, 0.22 + l * 0.5, 0.2 + l * 0.45].map((v) => clamp(v)) : P.ink);
      }
  for (const [x0, y0] of blobCells(FIRE.x - 130, FIRE.base + 4, 60, 18, 10, 82, 0.8))
    for (let y = y0; y < y0 + 10; y++)
      for (let x = x0; x < x0 + 10; x++) put(x, y, x % 3 < 2 && y % 3 < 2 ? P.ash : P.ink);
}

// Embers on the dump under the fire.
if (E.fire > 0.15) {
  for (let k = 0; k < Math.round(28 * E.fire); k++) {
    const x = Math.round((FIRE.x - 240 + hash(k, 1, 83) * 480) / 5) * 5;
    const y = Math.round((FIRE.base - 26 + hash(k, 2, 83) * 60) / 5) * 5;
    if (FRAMES && hash(k, FRAME, 84) < 0.25) continue;
    rect(x, y, 5, hash(k, 3 + FRAME, 83) < 0.5 ? P.yellow : P.orange, 0.9);
  }
}

// QR SMOKE: the sign-up QR code sits in the smoke, and it is round (Angpao,
// 2026-11-23). The plume is drawn as normal, all the way up. A round window
// is opened in it, back to clear sky. The code sits in the middle of the
// window, and loose cells fill the rest of the circle, one cell clear of the
// code, so the whole thing reads as one round patch of the smoke.
// Colour: each cell takes the colour the normal smoke has at that very spot,
// then darkened by --qr-dark. On the blue sky the smoke's light grey is as
// bright as the sky and the code can't be read, so it is darkened more there.
// --qr-shape dots draws round cells and round eyes instead of square ones.
if (QR_SMOKE && E.air > 0.6) {
  const QRCode = (await import("qrcode")).default;
  const qr = QRCode.create(QR_URL, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const DOTS = arg("--qr-shape") === "dots";
  const M = Number(arg("--qr-cell") ?? (DOTS ? 7 : 6)); // px per code cell
  const AIR = Number(arg("--qr-air") ?? 6);
  const DARK = Number(arg("--qr-dark") ?? (SKY_BLUE ? 0.5 : 0.8));
  const side = n * M;
  const R = Math.ceil((side * Math.SQRT2) / 2) + AIR; // the round window
  const cx = 852;
  const cy = Math.max(164, R + 8);
  const x0 = cx - Math.round(side / 2);
  const y0 = cy - Math.round(side / 2);
  const EXT = Math.ceil((R - side / 2) / M) + 1; // cells of the grid outside the code
  // The smoke's colour at each cell of the grid, read before the window is opened.
  const isSmoke = (c, k) => Math.abs(c[0] - skyCopy[k]) + Math.abs(c[1] - skyCopy[k + 1]) + Math.abs(c[2] - skyCopy[k + 2]) > 0.12;
  const G = n + EXT * 2;
  const tone = [];
  for (let j = 0; j < G; j++)
    for (let i = 0; i < G; i++) {
      const x = clamp(x0 + (i - EXT) * M + (M >> 1), 0, W - 1);
      const y = clamp(y0 + (j - EXT) * M + (M >> 1), 0, H - 1);
      const c = get(x, y);
      tone.push(isSmoke(c, (y * W + x) * 3) ? c : null);
    }
  const toneAt = (i, j) => {
    const gi = i + EXT;
    const gj = j + EXT;
    for (let r = 0; r < G; r++)
      for (let dj = -r; dj <= r; dj++)
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const a = gi + di;
          const b = gj + dj;
          if (a >= 0 && b >= 0 && a < G && b < G && tone[b * G + a]) return tone[b * G + a].map((v) => v * DARK);
        }
    return hex("#7a756d").map((v) => v * DARK);
  };
  // Open the round window.
  for (let y = cy - R; y <= cy + R; y++)
    for (let x = cx - R; x <= cx + R; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H || (x - cx) ** 2 + (y - cy) ** 2 > R * R) continue;
      const k = (y * W + x) * 3;
      img[k] = skyCopy[k];
      img[k + 1] = skyCopy[k + 1];
      img[k + 2] = skyCopy[k + 2];
    }
  /** A filled circle with a soft one-pixel edge. */
  const disc = (px, py, r, c) => {
    for (let y = Math.floor(py - r - 1); y <= py + r + 1; y++)
      for (let x = Math.floor(px - r - 1); x <= px + r + 1; x++) {
        const a = clamp(r + 0.5 - Math.hypot(x + 0.5 - px, y + 0.5 - py));
        if (a > 0) put(x, y, c, a);
      }
  };
  const cell = (i, j) => {
    const c = toneAt(i, j);
    if (DOTS) disc(x0 + i * M + M / 2, y0 + j * M + M / 2, M / 2 - 0.15, c);
    else rect(x0 + i * M, y0 + j * M, M, c);
  };
  const eyes = [[0, 0], [n - 7, 0], [0, n - 7]];
  const inEye = (i, j) => eyes.some(([ex, ey]) => i >= ex && i < ex + 7 && j >= ey && j < ey + 7);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (qr.modules.get(j, i) && !(DOTS && inEye(i, j))) cell(i, j);
  if (DOTS)
    for (const [ex, ey] of eyes) {
      // A round eye: a ring and a dot.
      const px = x0 + (ex + 3.5) * M;
      const py = y0 + (ey + 3.5) * M;
      const c = toneAt(ex + 3, ey + 3);
      for (let y = Math.floor(py - 3.5 * M - 1); y <= py + 3.5 * M + 1; y++)
        for (let x = Math.floor(px - 3.5 * M - 1); x <= px + 3.5 * M + 1; x++) {
          const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
          const a = Math.max(clamp(3.5 * M + 0.5 - d) * clamp(d - 2.5 * M + 0.5), clamp(1.5 * M + 0.5 - d));
          if (a > 0) put(x, y, c, a);
        }
    }
  // Loose cells fill the rest of the circle, one cell clear of the code and of the window's edge.
  for (let j = -EXT; j < n + EXT; j++)
    for (let i = -EXT; i < n + EXT; i++) {
      const out = Math.max(-i, -j, i - (n - 1), j - (n - 1), 0);
      if (out < 2) continue;
      const px = x0 + i * M + M / 2;
      const py = y0 + j * M + M / 2;
      if (Math.hypot(px - cx, py - cy) > R - AIR - M * 0.7) continue;
      if (hash(i + 90, j + 90, 418) < 0.5) cell(i, j);
    }
}

// Grain over everything, pixels included (--no-grain leaves it to the caller).
if (!process.argv.includes("--no-grain"))
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const n = (hash(x, y, 99 + FRAME * 3) + hash(x, y, 98 + FRAME * 3) - 1) * 0.065;
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
