#!/usr/bin/env node
/**
 * One Elemental poster plate per element: a calm, healthy photo, corrupted
 * by that element's pollution in pixels made from the photo itself.
 *
 *   node scripts/render-elemental-element.mjs --element water|earth|air|fire|aether [--out file]
 *
 * Writes public/hackathon/poster/elemental/elements/plate-<element>.png
 * (1080x1350). The type is added by ElementalElementPoster. Rules:
 * components/hackathon/poster/elemental/brand.ts. The pixel recipes follow
 * scripts/render-elemental-plate.mjs (the key visual).
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);
const ELEMENT = arg("--element");
const PHOTOS = {
  water: "water-viktorija-demjanenko-unsplash.jpg",
  earth: "earth-meric-tuna-unsplash.jpg",
  air: "air-pavel-okrema-unsplash.jpg",
  fire: "fire-bhuban-narzari-unsplash.jpg",
  aether: "aether-olga-budko-unsplash.jpg",
};
if (!PHOTOS[ELEMENT]) {
  console.error(`--element must be one of ${Object.keys(PHOTOS).join(", ")}`);
  process.exit(1);
}
const OUT = arg("--out") ?? join(ROOT, `public/hackathon/poster/elemental/elements/plate-${ELEMENT}.png`);
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
  return mix(mix(hash(xi, yi, seed), hash(xi + 1, yi, seed), u), mix(hash(xi, yi + 1, seed), hash(xi + 1, yi + 1, seed), u), v);
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
const get = (x, y) => {
  const i = (clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)) * 3;
  return [img[i], img[i + 1], img[i + 2]];
};
function put(x, y, c, a = 1) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  for (let k = 0; k < 3; k++) img[i + k] = mix(img[i + k], c[k], a);
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
const cellLum = (x, y, cell) => {
  let l = 0;
  for (let yy = 0; yy < cell; yy++) for (let xx = 0; xx < cell; xx++) l += lum(get(x + xx, y + yy));
  return l / (cell * cell);
};
async function blurLayer(layer, sigma) {
  const u8 = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H * 4; i++) u8[i] = Math.round(clamp(layer[i]) * 255);
  const { data } = await sharp(u8, { raw: { width: W, height: H, channels: 4 } }).blur(sigma).raw().toBuffer({ resolveWithObject: true });
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
      const c = fixed ?? [0, 1, 2].map((k) => clamp(layer[i + k] / Math.max(a, 1e-4)));
      if (mode === "screen") screen(x, y, c, a);
      else put(x, y, c, a);
    }
}
function paint(layer, x, y, c, a) {
  if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
  const i = (y * W + x) * 4;
  const keep = 1 - a;
  for (let k = 0; k < 3; k++) layer[i + k] = layer[i + k] * keep + c[k] * a;
  layer[i + 3] = layer[i + 3] * keep + a;
}
function blobCells(cx, cy, rx, ry, cell, seed, edge = 0.45) {
  const cells = [];
  for (let y = Math.floor((cy - ry * 1.3) / cell) * cell; y <= cy + ry * 1.3; y += cell)
    for (let x = Math.floor((cx - rx * 1.3) / cell) * cell; x <= cx + rx * 1.3; x += cell) {
      const dx = (x + cell / 2 - cx) / rx;
      const dy = (y + cell / 2 - cy) / ry;
      if (Math.sqrt(dx * dx + dy * dy) + edge * (fbm(x * 0.03, y * 0.03, seed, 2) - 0.5) < 1) cells.push([x, y]);
    }
  return cells;
}

// ---------- palette (the key visual's) ----------
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
  g0: hex("#0e1d06"),
  g1: hex("#244710"),
  g2: hex("#4a7d1a"),
  g3: hex("#8dbd3c"),
  acid: hex("#84c424"),
  smogA: hex("#b39a48"),
  violet: hex("#9d7bff"),
  lilac: hex("#e4d8ff"),
  violetDeep: hex("#4a2db0"),
};

// ---------- the photo, a little faded ----------
const { data: bg } = await sharp(join(ROOT, "public/hackathon/poster/elemental/bg", PHOTOS[ELEMENT]))
  .resize(W, H, { fit: "cover" })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
for (let i = 0; i < W * H; i++) {
  const r = bg[i * 3] / 255;
  const g = bg[i * 3 + 1] / 255;
  const b = bg[i * 3 + 2] / 255;
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  img[i * 3] = mix(l, r, 0.88) * 0.97 + 0.02;
  img[i * 3 + 1] = mix(l, g, 0.88) * 0.97 + 0.02;
  img[i * 3 + 2] = mix(l, b, 0.88) * 0.97 + 0.025;
}

// ---------- WATER: the river turns toxic green ----------
async function water() {
  // The river, from the photo: below the far bank, left of the near bank,
  // and not the pale, warm gravel.
  const topEdge = (x) => 918 - x * 0.08;
  const rightBank = (y) => (y < 1000 ? 880 : 828 + (y - 1000) * 0.03);
  const mask = new Float32Array(W * H);
  for (let y = 840; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (y < topEdge(x) || x > rightBank(y)) continue;
      const c = get(x, y);
      const l = lum(c);
      const gravel = smooth(0.36, 0.46, l) * smooth(0.0, 0.05, c[0] - c[2]);
      // The spill comes down the river from the left; its front is ragged.
      const front = x + 280 * (fbm(x * 0.004, y * 0.02, 21, 4) - 0.5) - (y - 900) * 0.25;
      const edge = 1 - smooth(640, 760, front);
      if (edge > 0 && edge < 1 && edge < bayer(x >> 1, y >> 1)) continue;
      mask[y * W + x] = (1 - gravel) * (edge > 0 ? 1 : 0);
    }
  for (let y = 840; y < H; y++)
    for (let x = 0; x < W; x++) {
      const m = mask[y * W + x];
      if (!m) continue;
      const l = lum(get(x, y));
      put(x, y, [0.07 + 0.27 * l, 0.17 + 0.47 * l, 0.03 + 0.13 * l], 0.85 * m);
    }
  // Mosaic of the poisoned water in four greens, a dot-screen band at the front.
  const cell = 12;
  const greens = [P.g0, P.g1, P.g2, P.g3];
  for (let y = 852; y < H - 4; y += cell)
    for (let x = 0; x < W; x += cell) {
      if (mask[(y + 6) * W + Math.min(x + 6, W - 1)] < 0.5) continue;
      if (fbm(x * 0.012, y * 0.03, 31, 3) < 0.5) continue;
      rect(x, y, cell, greens[clamp(Math.floor(cellLum(x, y, cell) * 4.2 - 0.5), 0, 3)]);
    }
  // Dead fish? No: Angpao kept that undecided. Acid slicks and bubbles instead.
  for (const [cx, cy, rx, ry, s] of [
    [180, 1180, 90, 30, 33],
    [380, 1040, 60, 20, 34],
  ])
    for (const [x, y] of blobCells(cx, cy, rx, ry, 12, s)) if (mask[Math.min(y, H - 1) * W + x] > 0.3) rect(x, y, 12, P.acid);
  for (let k = 0; k < 60; k++) {
    const x = Math.round((hash(k, 1, 35) * 620) / 6) * 6;
    const y = Math.round((870 + hash(k, 2, 35) * 470) / 6) * 6;
    if (mask[Math.min(y, H - 1) * W + x] < 0.5) continue;
    rect(x, y, 6, P.g3);
    if (hash(k, 3, 35) < 0.5) rect(x + 6, y - 6, 6, P.white);
  }
  // A sick green sheen over the banks, so the poison reaches the land.
  const layer = new Float32Array(W * H * 4);
  for (let y = 800; y < H; y++) for (let x = 0; x < 700; x++) paint(layer, x, y, P.g2, 0.12 * (1 - smooth(300, 700, x)));
  drawLayer(await blurLayer(layer, 20), "screen");
}

// ---------- EARTH: a rubbish pile, in pixels made from the photo ----------
function earth() {
  // The pile: a mound with a ragged top, built from 8px cells. Neighbouring
  // cells share a colour in 16px clusters, so they read as bags and boxes,
  // and each cell keeps the photo's dot screen so the pile sits in the scene.
  const HP = { cx: 480, cy: 1060, rx: 330, ry: 290 };
  const top = (x) => {
    const u = (x - HP.cx) / HP.rx;
    if (Math.abs(u) >= 1) return Infinity;
    return HP.cy - HP.ry * Math.pow(1 - u * u, 0.8) * (0.8 + 0.55 * (fbm(x * 0.02, 0.3, 70, 3) - 0.5));
  };
  const bottom = (x) => HP.cy + 34 - 22 * Math.pow((x - HP.cx) / HP.rx, 2);
  const RUBBISH = [
    [hex("#e4e1d8"), 0.22], // white bags
    [hex("#a9a59c"), 0.12], // grey bags
    [hex("#1e1d1b"), 0.2], // black bags
    [hex("#8a6a44"), 0.12], // cardboard
    [hex("#3a6fb0"), 0.09], // blue
    [hex("#c23a2a"), 0.08], // red
    [hex("#d8b23a"), 0.07], // yellow
    [hex("#4f7a3a"), 0.1], // green bottles
  ];
  const pick = (r) => {
    let s = 0;
    for (const [c, w] of RUBBISH) {
      s += w;
      if (r < s) return c;
    }
    return RUBBISH[0][0];
  };
  // Shadow on the grass.
  for (let y = HP.cy - 10; y < HP.cy + 80; y++)
    for (let x = HP.cx - HP.rx - 20; x < HP.cx + HP.rx + 90; x++) {
      const dx = (x - HP.cx - 40) / (HP.rx + 50);
      const dy = (y - HP.cy - 30) / 42;
      const d = dx * dx + dy * dy;
      if (d < 1) put(x, y, [0.05, 0.05, 0.03], 0.5 * (1 - d));
    }
  const cell = 8;
  for (let y = HP.cy - HP.ry - 40; y < HP.cy + 40; y += cell)
    for (let x = HP.cx - HP.rx; x < HP.cx + HP.rx; x += cell) {
      const t = top(x + 4);
      const b = bottom(x + 4);
      if (!(y + 4 > t - 10 && y + 4 < b)) continue;
      // The edge dissolves into the grass in an ordered dither.
      const edgeIn = Math.min(y + 4 - t, b - (y + 4));
      if (edgeIn < 14 && bayer(x / cell, y / cell) > edgeIn / 14) continue;
      const depth = clamp((y - t) / Math.max(b - t, 1));
      const lit = clamp(1.12 - 0.55 * depth - 0.2 * ((x - HP.cx) / HP.rx), 0.35, 1.2);
      const jitter = fbm(x * 0.05, y * 0.05, 73, 2) * 6;
      const base = pick(hash(Math.floor((x + jitter) / 16), Math.floor((y + jitter) / 16), 74));
      for (let yy = 0; yy < cell; yy++)
        for (let xx = 0; xx < cell; xx++) {
          const l = lum(get(x + xx, y + yy));
          // Dot screen: three of every four dots carry the rubbish colour, lit by the photo.
          const dot = (x + xx) % 4 < 3 && (y + yy) % 4 < 3;
          const c = dot ? base.map((v) => clamp(v * lit * (0.75 + 0.5 * l))) : base.map((v) => v * lit * 0.45);
          put(x + xx, y + yy, c, 0.96);
        }
    }
  // Loose pixels blown off the pile into the field.
  for (let k = 0; k < 90; k++) {
    const a = hash(k, 1, 75) * Math.PI;
    const r = 1 + Math.pow(hash(k, 2, 75), 1.5) * 0.9;
    const x = Math.round((HP.cx + Math.cos(a) * HP.rx * r) / cell) * cell;
    const y = Math.round((HP.cy + 30 + Math.sin(a) * 120 * r * (hash(k, 3, 75) < 0.5 ? 1 : 0.6)) / cell) * cell;
    if (y < 860) continue;
    rect(x, y, cell, pick(hash(k, 4, 75)), 0.92);
  }
  // Black oil leaking from under the pile, a sick green where it catches the light.
  const SLUDGE = [hex("#0c0d09"), hex("#1b2010"), hex("#4a5a18"), hex("#a6b832")];
  for (const [cx, cy, rx, ry, s] of [
    [500, 1130, 240, 36, 51],
    [860, 1120, 100, 22, 52],
  ])
    for (const [x, y] of blobCells(cx, cy, rx, ry, 8, s, 0.7)) {
      const n = fbm(x * 0.03, y * 0.06, s, 2);
      rect(x, y, 8, n > 0.76 ? SLUDGE[3] : n > 0.66 ? SLUDGE[2] : n > 0.5 ? SLUDGE[1] : SLUDGE[0], 0.95);
    }
}

// ---------- AIR: PM2.5 smoke chokes the valley ----------
async function air() {
  const sky = new Int32Array(W);
  for (let x = 0; x < W; x++) {
    let y = 0;
    while (y < H - 1 && get(x, y)[2] - get(x, y)[1] > 0.02) y++;
    sky[x] = y;
  }
  const SMOKE = hex("#8d847a");
  // 1. The veil: grey-brown smoke soaks the lower sky and swallows the hills.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const top = 600 + 60 * (fbm(x * 0.003, 0.5, 91, 3) - 0.5);
      const a = y < sky[x] ? 0.82 * smooth(top, sky[x] + 30, y) : 0.66 * (1 - smooth(sky[x], sky[x] + 560, y)) + 0.14;
      if (a <= 0) continue;
      const l = lum(get(x, y));
      put(x, y, SMOKE.map((v) => clamp(v * (0.7 + 0.55 * l))), a);
    }
  // 2. A red sun, the way it looks through wildfire smoke.
  const SUN = { x: 800, y: 700, r: 40 };
  const glow = new Float32Array(W * H * 4);
  for (let y = SUN.y - 150; y < SUN.y + 150; y++)
    for (let x = SUN.x - 150; x < SUN.x + 150; x++) {
      const d = Math.hypot(x - SUN.x, y - SUN.y) / 150;
      if (d < 1) paint(glow, x, y, hex("#e0784a"), 0.4 * Math.pow(1 - d, 2));
    }
  drawLayer(await blurLayer(glow, 12), "screen", hex("#e0784a"));
  for (let y = SUN.y - SUN.r; y < SUN.y + SUN.r; y += 6)
    for (let x = SUN.x - SUN.r; x < SUN.x + SUN.r; x += 6) {
      if (Math.hypot(x + 3 - SUN.x, y + 3 - SUN.y) > SUN.r) continue;
      if (fbm(x * 0.01, y * 0.06, 97, 2) > 0.64) continue;
      rect(x, y, 6, hex("#e8774a"), 0.85);
    }
  // 3. The smoke as pixels made from the photo: an ordered dither on an 8px
  // grid whose tone comes from the picture underneath plus the smoke density.
  const cell = 8;
  const tones = [hex("#e0dbd0"), hex("#aaa296"), hex("#726a5f"), hex("#3f3a34")];
  for (let y = 600; y < 1100; y += cell)
    for (let x = 0; x < W; x += cell) {
      const t = smooth(610, 760, y) * (1 - smooth(950, 1100, y));
      const n = fbm(x * 0.004, y * 0.02, 95, 4);
      const dens = t * (n * 2 - 0.5);
      if (dens + (bayer(x / cell, y / cell) - 0.5) * 0.9 < 0.45) continue;
      const l = cellLum(x, y, cell);
      const k = clamp(Math.floor((1 - l) * 2.2 + dens * 1.6 - 0.6), 0, 3);
      rect(x, y, cell, tones[k], 0.9);
    }
  // 4. PM2.5: fine particles everywhere below the type.
  for (let k = 0; k < 360; k++) {
    const x = Math.round((hash(k, 1, 93) * W) / 4) * 4;
    const y = Math.round((640 + hash(k, 2, 93) * 690) / 4) * 4;
    rect(x, y, hash(k, 4, 93) < 0.2 ? 6 : 4, hash(k, 3, 93) < 0.6 ? hex("#5e574e") : hex("#2b2723"), 0.85);
  }
}

// ---------- FIRE: the forest catches, like the key visual's fire ----------
async function fire() {
  const F = { x: 760, base: 950 };
  // The untouched photo: the burning trees take their tones from it, not from the glow.
  const orig = img.slice();
  const origAt = (x, y) => {
    const i = (clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)) * 3;
    return [orig[i], orig[i + 1], orig[i + 2]];
  };
  const origCellLum = (x, y, n) => {
    let l = 0;
    for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < n; xx++) l += lum(origAt(x + xx, y + yy));
    return l / (n * n);
  };
  // One fire, built like the key visual's, rising out of the trees.
  const field = (x, y) => {
    const tongues = [
      { cx: F.x, w: 280, h: 470, lean: 20 },
      { cx: F.x - 110, w: 170, h: 300, lean: 0 },
      { cx: F.x + 100, w: 180, h: 340, lean: 30 },
      { cx: F.x + 20, w: 130, h: 540, lean: 40 },
      { cx: F.x - 220, w: 120, h: 190, lean: 10 },
    ];
    let best = 0;
    for (const g of tongues) {
      const t = (F.base - y) / g.h;
      if (t < -0.08 || t > 1) continue;
      const tt = Math.max(t, 0);
      const wob = 46 * (fbm(x * 0.012, y * 0.02 + 3, 5, 3) - 0.5) * (0.3 + tt);
      const c = g.cx + g.lean * Math.pow(tt, 1.6) + wob;
      const hw = (g.w / 2) * Math.pow(1 - tt, 0.7) * (t < 0 ? 1 + t * 6 : 1);
      const d = Math.abs(x - c) / Math.max(hw, 1);
      if (d < 1) best = Math.max(best, (1 - d * d) * Math.pow(1 - tt, 0.45));
    }
    return best;
  };
  const colour = (v) => {
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
  };
  // Glow on the sky, the forest and the meadow.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = (x - F.x) / 520;
      const dy = (y - (F.base - 120)) / 460;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < 1) put(x, y, P.orange, 0.36 * Math.pow(1 - r, 1.6));
      const gx = (x - F.x) / 480;
      const gy = (y - (F.base + 120)) / 170;
      const gr = Math.sqrt(gx * gx + gy * gy);
      if (gr < 1) screen(x, y, P.yellow, 0.28 * Math.pow(1 - gr, 1.3));
    }
  // Smoke: a dark column out of the fire, drifting up and to the right.
  const smoke = new Float32Array(W * H * 4);
  for (let s = 0; s < 1; s += 0.003) {
    const cx = F.x + 40 + 200 * s + 50 * Math.sin(s * 5);
    const cy = F.base - 430 - s * 330;
    const w = 80 + 200 * s;
    for (let k = 0; k < 44; k++) paint(smoke, Math.round(cx + (hash(k, s * 1000, 3) - 0.5) * w * 2), Math.round(cy + (hash(k, s * 1000, 4) - 0.5) * 50), hex("#3b3430"), 0.1);
  }
  drawLayer(await blurLayer(smoke, 26), "normal", hex("#3b3430"));
  const halo = new Float32Array(W * H * 4);
  const flame = new Float32Array(W * H * 4);
  for (let y = F.base - 620; y < F.base + 20; y++)
    for (let x = F.x - 400; x < Math.min(W, F.x + 360); x++) {
      const v = field(x, y);
      if (v > 0.02 && y < F.base - 40) paint(halo, x, y, P.orange, 0.5 * smooth(0.02, 0.3, v));
      if (v < 0.1) continue;
      const h = clamp((F.base - y) / 540);
      const lick = v * (0.62 + 0.7 * fbm(x * 0.07, y * 0.009 + 9, 71, 3)) * (1 - 0.25 * h);
      const a = smooth(0.1, 0.42, lick) * (1 - 0.35 * h);
      if (a < 0.98 && a < bayer(x >> 1, y >> 1)) continue;
      paint(flame, x, y, colour(lick), 1);
    }
  drawLayer(await blurLayer(halo, 28), "normal", P.orange);
  drawLayer(await blurLayer(flame, 0.8), "normal");
  const cell = 10;
  // Pixel passes from the key visual: mosaic tops, a white stepped crown,
  // two flat shapes, sparks rising with the smoke.
  const lv = [P.red, P.orange, P.cream, P.white];
  for (let y = F.base - 640; y < F.base - 60; y += cell)
    for (let x = F.x - 400; x < Math.min(W, F.x + 360); x += cell) {
      const v = field(x + 6, y + 6);
      const h = (F.base - y) / 540;
      const n = fbm(x * 0.03, y * 0.03, 61, 2);
      if (((v > 0.12 && v < 0.3 && h > 0.12 && h < 0.6) || (v > 0.5 && h > 0.14 && h < 0.34)) && n > 0.52) rect(x, y, cell, P.white);
      else if (v > 0.16 && n < 0.05 + h * 0.85) rect(x, y, cell, lv[clamp(Math.floor(v * 4.2), 0, 3)]);
    }
  for (const [x, y] of blobCells(F.x - 20, F.base - 240, 36, 66, 14, 62)) rect(x, y, 14, P.flatRed);
  for (const [x, y] of blobCells(F.x + 70, F.base - 350, 18, 46, 12, 63)) rect(x, y, 12, P.flatBlue);
  const c2 = 14;
  for (let id = 0; id < 1; id += 0.03) {
    const sx = F.x + 40 + 200 * id + 50 * Math.sin(id * 5);
    const sy = F.base - 430 - id * 330;
    for (let k = 0; k < 4; k++) {
      if (hash(k, id * 999, 64) > 0.42 - id * 0.2) continue;
      const x = Math.round((sx + (hash(k, id * 999, 65) - 0.5) * (90 + 140 * id)) / c2) * c2;
      const y = Math.round((sy + (hash(k, id * 999, 66) - 0.5) * 30) / c2) * c2;
      rect(x, y, c2, hash(k, id * 999, 67) < 0.86 ? P.white : P.flatBlue);
      if (hash(k, id * 999, 68) < 0.6) rect(x + c2, y + c2, c2, P.white);
    }
  }
  // The trees catch, in front of the flames: around the fire's base the
  // forest itself turns into fire pixels and hides where the flames start. Each 10px cell takes its tone from the photo (bright leaves
  // burn yellow, shadows burn red, the darkest char), so the fire grows out
  // of the trees instead of sitting on them.
  const levels = [P.ink, P.deep, P.red, P.orange, P.yellow, P.cream];
  for (let y = 780; y < 1240; y += cell)
    for (let x = 120; x < W; x += cell) {
      const dx = (x + 5 - F.x) / 580;
      // Wider below the fire: it spreads down through the trees into the grass.
      const dy = (y + 5 - (F.base + 40)) / (y > F.base ? 230 : 120);
      const d = Math.sqrt(dx * dx + dy * dy) + 0.8 * (fbm(x * 0.012, y * 0.03, 151, 4) - 0.5);
      const heat = 1 - smooth(0.35, 1, d);
      if (heat <= 0 || heat < bayer(x / cell, y / cell) * 0.9) continue;
      const c = origAt(x + 5, y + 5);
      if (!(c[1] > c[2] + 0.01)) continue; // trees and grass, not the mountain behind
      // Contrast-stretched photo tone: shadows char, lit leaves burn.
      const l = clamp((origCellLum(x, y, cell) - 0.12) / 0.4);
      rect(x, y, cell, levels[clamp(Math.round(l * 2.8 + heat * 1.3 - 1 + (hash(x, y, 155) - 0.5) * 1.2), 0, 5)]);
    }
  // Embers drifting onto the meadow.
  for (let k = 0; k < 60; k++) {
    const x = Math.round((F.x - 420 + hash(k, 1, 83) * 760) / 5) * 5;
    const y = Math.round((F.base + 100 + hash(k, 2, 83) * 160) / 5) * 5;
    rect(x, y, 5, hash(k, 3, 83) < 0.5 ? P.yellow : P.orange, 0.9);
  }
}

// ---------- AETHER: harm you can't see, a violet glitch in a calm field ----------
async function aether() {
  // The field's rows slip sideways in bands, like a corrupted file.
  const copy = img.slice();
  const sample = (x, y) => {
    const i = (clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)) * 3;
    return [copy[i], copy[i + 1], copy[i + 2]];
  };
  for (let band = 0; band < 14; band++) {
    const y0 = Math.round((560 + hash(band, 1, 120) * 760) / 4) * 4;
    const hgt = 4 + Math.floor(hash(band, 2, 120) * 5) * 4;
    const shift = Math.round((hash(band, 3, 120) - 0.5) * 120);
    const x0 = Math.floor(hash(band, 4, 120) * 600);
    const len = 160 + hash(band, 5, 120) * 480;
    for (let y = y0; y < y0 + hgt; y++)
      for (let x = x0; x < Math.min(W, x0 + len); x++) {
        const c = sample(x - shift, y);
        put(x, y, [c[0] * 0.95 + 0.03, c[1] * 0.92, c[2] * 0.95 + 0.06]);
      }
  }
  // A faint violet glow over the field: there, but easy to miss.
  const glow = new Float32Array(W * H * 4);
  for (let y = 520; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = fbm(x * 0.004, y * 0.006, 130, 4);
      paint(glow, x, y, P.violet, 0.3 * smooth(0.45, 0.75, n));
    }
  drawLayer(await blurLayer(glow, 30), "screen", P.violet);
  // Glowing violet pixels drifting up out of the field and fading into the sky.
  const sparks = new Float32Array(W * H * 4);
  const pts = [];
  for (let k = 0; k < 420; k++) {
    const x = hash(k, 1, 131) * W;
    const t = Math.pow(hash(k, 2, 131), 0.7);
    const y = 1300 - t * 820;
    const s = [6, 8, 12][Math.floor(hash(k, 3, 131) * 3)];
    const a = (1 - t * 0.85) * (0.5 + 0.5 * hash(k, 4, 131));
    // Fewer where the field is quiet; denser in a drifting stream.
    if (fbm(x * 0.004, y * 0.004, 132, 3) < 0.45) continue;
    pts.push([Math.round(x / s) * s, Math.round(y / s) * s, s, a, hash(k, 5, 131) < 0.4]);
  }
  for (const [x, y, s, a] of pts) for (let yy = -s; yy < 2 * s; yy++) for (let xx = -s; xx < 2 * s; xx++) paint(sparks, x + xx, y + yy, P.violet, a * 0.25);
  drawLayer(await blurLayer(sparks, 10), "screen", P.violet);
  for (const [x, y, s, a, light] of pts) rect(x, y, s, light ? P.lilac : P.violet, a);
  // A few flat stepped violet shapes, half-erased by the Bayer pattern.
  for (const [cx, cy, rx, ry, seed] of [
    [260, 900, 70, 40, 140],
    [780, 760, 50, 30, 141],
    [620, 1120, 90, 36, 142],
  ])
    for (const [x, y] of blobCells(cx, cy, rx, ry, 12, seed, 0.8)) if (bayer(x / 12, y / 12) < 0.55) rect(x, y, 12, P.violetDeep, 0.85);
}

await { water, earth, air, fire, aether }[ELEMENT]();

// Grain over everything, pixels included.
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const n = (hash(x, y, 99) + hash(x, y, 98) - 1) * 0.065;
    const i = (y * W + x) * 3;
    for (let k = 0; k < 3; k++) img[i + k] = clamp(img[i + k] + n);
  }
const out = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H * 3; i++) out[i] = Math.round(clamp(img[i]) * 255);
mkdirSync(dirname(OUT), { recursive: true });
await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 9 }).toFile(OUT);
console.log(`✅ ${OUT}`);
