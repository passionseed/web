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

// ---------- EARTH: an e-waste and rubbish dump grows out of the field ----------
function earth() {
  const C4 = 4;
  const px = (x, y, c, a = 1) => rect(Math.round(x / C4) * C4, Math.round(y / C4) * C4, C4, c, a);
  const heaps = [
    { cx: 380, cy: 1040, rx: 230, ry: 120, seed: 41 },
    { cx: 760, cy: 1120, rx: 170, ry: 95, seed: 42 },
    { cx: 600, cy: 935, rx: 110, ry: 40, seed: 43 },
  ];
  const inHeap = (x, y, h) => {
    const dx = (x - h.cx) / h.rx;
    const dy = (y - h.cy) / h.ry;
    const top = dy < 0 ? dx * dx + dy * dy : dx * dx + dy * dy * 0.35;
    return top + 0.4 * (fbm(x * 0.03, y * 0.03, h.seed, 2) - 0.5) < 1;
  };
  // The soil dies around the heaps: grass turns brown-grey, in a dithered ring.
  for (let y = 830; y < H; y++)
    for (let x = 0; x < W; x++) {
      let d = 9;
      for (const h of heaps) {
        const dx = (x - h.cx) / (h.rx * 1.7);
        const dy = (y - h.cy) / (h.ry * 2.4);
        d = Math.min(d, Math.sqrt(dx * dx + dy * dy));
      }
      const dead = 1 - smooth(0.55, 1.05, d + 0.35 * (fbm(x * 0.01, y * 0.02, 44, 3) - 0.5));
      if (dead <= 0) continue;
      if (dead < 0.9 && dead < bayer(x >> 1, y >> 1)) continue;
      const l = lum(get(x, y));
      put(x, y, [0.2 + l * 0.6, 0.17 + l * 0.45, 0.1 + l * 0.3], 0.8);
    }
  // Shadows, then the dot-screen underlay that keeps the photo's light.
  for (const h of heaps)
    for (let y = h.cy; y < h.cy + h.ry + 24; y++)
      for (let x = h.cx - h.rx - 24; x < h.cx + h.rx + 24; x++) {
        const dx = (x - h.cx) / (h.rx + 24);
        const dy = (y - (h.cy + h.ry * 0.6)) / 30;
        const d = dx * dx + dy * dy;
        if (d < 1) put(x, y, [0.05, 0.05, 0.04], 0.4 * (1 - d));
      }
  for (const h of heaps)
    for (let y = h.cy - h.ry; y < h.cy + h.ry; y++)
      for (let x = h.cx - h.rx; x < h.cx + h.rx; x++) {
        if (!inHeap(x, y, h)) continue;
        const l = lum(get(x, y));
        // Soil-brown dot screen, lit from the top of the mound.
        const lit = 1 - 0.5 * clamp((y - (h.cy - h.ry)) / (h.ry * 2));
        put(x, y, x % 3 < 2 && y % 3 < 2 ? [(0.3 + l * 0.5) * lit, (0.25 + l * 0.4) * lit, (0.18 + l * 0.3) * lit] : [0.22 * lit, 0.18 * lit, 0.13 * lit], 0.95);
      }
  const PCB = hex("#33603e");
  const TRACE = hex("#7aa266");
  const GOLD = hex("#d2a63a");
  const CHIP = hex("#141414");
  const SCREEN = hex("#0f1418");
  const GLASS = hex("#9fb6c4");
  const PLASTIC = [hex("#c9c4b8"), hex("#8f8a80"), hex("#d9d4c6"), hex("#5c5a55")];
  const BAGS = [hex("#e8e6de"), hex("#3a6fb0"), hex("#c23a2a"), hex("#d8b23a"), hex("#2a2a2a")];
  const WIRES = [hex("#141414"), hex("#c23a2a"), hex("#2f5fa8"), hex("#d8b23a")];
  const r = (k, i) => hash(k, i, 111);
  const items = [];
  for (let k = 0; k < 420; k++) {
    const h = heaps[k % 5 === 0 ? 2 : k % 2];
    const x = h.cx + (r(k, 1) - 0.5) * 2 * h.rx * 0.92;
    const y = h.cy + (r(k, 2) - 0.6) * 2 * h.ry * 0.92;
    if (!inHeap(x, y, h)) continue;
    items.push({ k, x, y, h, roll: r(k, 3) });
  }
  items.sort((a, b) => a.y - b.y);
  for (const { k, x, y, h, roll } of items) {
    const shade = (yy) => clamp((yy - (h.cy - h.ry)) / (h.ry * 2));
    const dot = (xx, yy, c) => inHeap(xx, yy, h) && px(xx, yy, c.map((v) => v * (1 - 0.45 * shade(yy))));
    if (roll < 0.16) {
      // Circuit board.
      const w = 10 + Math.floor(r(k, 4) * 8);
      const hh = 5 + Math.floor(r(k, 5) * 5);
      for (let j = 0; j < hh; j++)
        for (let i = 0; i < w; i++) {
          let c = i % 5 === 2 || j === Math.floor(hh / 2) ? TRACE : PCB;
          if ((i * 3 + j * 5) % 11 === 0) c = GOLD;
          if (i > w / 2 - 2 && i < w / 2 + 2 && j > 0 && j < hh - 1) c = CHIP;
          dot(x + (i - w / 2) * C4, y + (j - hh / 2) * C4, c);
        }
    } else if (roll < 0.42) {
      // A plastic bag or bottle: a soft lump in one flat colour with a highlight.
      const c = BAGS[Math.floor(r(k, 6) * BAGS.length)];
      for (const [bx, by] of blobCells(x, y, 10 + r(k, 7) * 12, 7 + r(k, 8) * 8, C4, k, 0.7)) dot(bx, by, (bx + by) % 12 === 0 ? P.white : c);
    } else if (roll < 0.55) {
      // Cracked phone.
      for (let j = 0; j < 10; j++)
        for (let i = 0; i < 6; i++) {
          const edge = i === 0 || j === 0 || i === 5 || j === 9;
          const crack = Math.abs(i - (j * 0.6 + 1)) < 0.6;
          dot(x + i * C4, y + j * C4 * 0.7, edge ? PLASTIC[3] : crack ? GLASS : SCREEN);
        }
    } else if (roll < 0.7) {
      // A loop of cable.
      const c = WIRES[Math.floor(r(k, 9) * WIRES.length)];
      const rad = 8 + r(k, 10) * 14;
      for (let t = 0; t < Math.PI * 1.7; t += 0.12) dot(x + Math.cos(t + k) * rad, y + Math.sin(t + k) * rad * 0.45, c);
    } else {
      // A monitor or casing.
      const w = 9 + Math.floor(r(k, 11) * 6);
      const hh = 6 + Math.floor(r(k, 12) * 4);
      const shell = PLASTIC[Math.floor(r(k, 13) * 4)];
      for (let j = 0; j < hh; j++)
        for (let i = 0; i < w; i++) {
          const inner = i > 0 && j > 0 && i < w - 1 && j < hh - 1;
          dot(x + i * C4, y + j * C4, inner && i === j + 1 ? GLASS : inner ? SCREEN : shell);
        }
    }
  }
  // Loose rubbish blown across the field, in flat pixels.
  for (let k = 0; k < 70; k++) {
    const x = Math.round((hash(k, 1, 47) * W) / 8) * 8;
    const y = Math.round((900 + Math.pow(hash(k, 2, 47), 0.8) * 440) / 8) * 8;
    const c = BAGS[Math.floor(hash(k, 3, 47) * BAGS.length)];
    rect(x, y, 8, c, 0.95);
    if (hash(k, 4, 47) < 0.5) rect(x + 8, y, 8, c, 0.95);
  }
}

// ---------- AIR: smog rolls over the hill and fills the sky ----------
async function air() {
  // The hill's skyline, read from the photo: the first dark pixel per column.
  const sky = new Int32Array(W);
  for (let x = 0; x < W; x++) {
    let y = 0;
    // Sky is blue over green; the hill is green over blue.
    while (y < H - 1 && get(x, y)[2] - get(x, y)[1] > 0.02) y++;
    sky[x] = y;
  }
  const field = (x, y) => {
    const above = sky[clamp(Math.round(x), 0, W - 1)] - y;
    const n = fbm(x * 0.004, y * 0.01, 92, 5);
    const puffs = fbm(x * 0.009, y * 0.012, 94, 3);
    // Billows rolling over the ridge from the left, rising in uneven heads.
    const top = 120 + 360 * puffs + 180 * (1 - x / W);
    const thick = smooth(-60, 20, above) * (1 - smooth(top * 0.55, top, above));
    const belowType = smooth(520, 640, y + (n - 0.5) * 70);
    return clamp(thick * belowType * (0.4 + 0.8 * n));
  };
  const haze = new Float32Array(W * H * 4);
  for (let y = 300; y < 1000; y++) for (let x = 0; x < W; x++) if (field(x, y) > 0.05) paint(haze, x, y, P.smogA, 0.35 * field(x, y));
  drawLayer(await blurLayer(haze, 22), "normal", P.smogA);
  const cell = 8;
  const tones = [hex("#d8cb9c"), hex("#a89155"), hex("#6f5d3c")];
  for (let y = 300; y < 1000; y += cell)
    for (let x = 0; x < W; x += cell) {
      const d = field(x + 4, y + 4) * 2.6 + (bayer(x / cell, y / cell) - 0.5) * 1.1;
      if (d < 0.75) continue;
      rect(x, y, cell, tones[clamp(Math.floor(d - 0.75), 0, 2)], 0.92);
    }
  // The haze settles on the hill too: its grass goes dull and yellow.
  for (let y = 650; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (y < sky[x]) continue;
      const a = 0.22 * (1 - smooth(sky[x], sky[x] + 420, y));
      put(x, y, hex("#6f5d3c"), a);
    }
  // PM2.5: fine dust specks drifting everywhere below the type.
  for (let k = 0; k < 140; k++) {
    const x = Math.round((hash(k, 1, 93) * W) / 6) * 6;
    const y = Math.round((560 + hash(k, 2, 93) * 700) / 6) * 6;
    rect(x, y, hash(k, 4, 93) < 0.3 ? 6 : 4, hash(k, 3, 93) < 0.6 ? hex("#8a7748") : hex("#5a4b31"), 0.8);
  }
}

// ---------- FIRE: fire breaks out of the treeline ----------
async function fire() {
  const F = { x: 640, base: 1004 };
  const field = (x, y) => {
    const tongues = [
      { cx: F.x, w: 300, h: 470, lean: -30 },
      { cx: F.x - 120, w: 170, h: 300, lean: -40 },
      { cx: F.x + 110, w: 180, h: 340, lean: -10 },
      { cx: F.x + 20, w: 130, h: 560, lean: -60 },
      { cx: F.x + 250, w: 120, h: 200, lean: -10 },
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
  // Glow over the sky, the trees and the meadow.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = (x - F.x) / 460;
      const dy = (y - (F.base - 160)) / 420;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < 1) put(x, y, P.orange, 0.42 * Math.pow(1 - r, 1.6));
      const gx = (x - F.x) / 420;
      const gy = (y - (F.base + 40)) / 110;
      const gr = Math.sqrt(gx * gx + gy * gy);
      if (gr < 1) screen(x, y, P.yellow, 0.5 * Math.pow(1 - gr, 1.3));
    }
  // A dark smoke column leaning left, kept below the type.
  const smoke = new Float32Array(W * H * 4);
  for (let s = 0; s < 1; s += 0.003) {
    const cx = F.x - 40 - 260 * s + 60 * Math.sin(s * 4);
    const cy = F.base - 420 - s * 260;
    const w = 70 + 160 * s;
    for (let k = 0; k < 40; k++) paint(smoke, Math.round(cx + (hash(k, s * 1000, 3) - 0.5) * w * 2), Math.round(cy + (hash(k, s * 1000, 4) - 0.5) * 40), hex("#3a3330"), 0.1);
  }
  drawLayer(await blurLayer(smoke, 24), "normal", hex("#3a3330"));
  const halo = new Float32Array(W * H * 4);
  const flame = new Float32Array(W * H * 4);
  for (let y = F.base - 620; y < F.base + 30; y++)
    for (let x = F.x - 360; x < F.x + 400; x++) {
      const v = field(x, y);
      if (v > 0.02) paint(halo, x, y, P.orange, 0.55 * smooth(0.02, 0.3, v));
      if (v < 0.1) continue;
      const h = clamp((F.base - y) / 560);
      const lick = v * (0.62 + 0.7 * fbm(x * 0.07, y * 0.009 + 9, 71, 3)) * (1 - 0.25 * h);
      const a = smooth(0.1, 0.42, lick) * (1 - 0.35 * h);
      if (a < 0.98 && a < bayer(x >> 1, y >> 1)) continue;
      paint(flame, x, y, colour(lick), 1);
    }
  drawLayer(await blurLayer(halo, 28), "normal", P.orange);
  drawLayer(await blurLayer(flame, 0.8), "normal");
  // Pixel passes: mosaic and a white stepped crown, flat shapes, sparks, char.
  const cell = 10;
  const levels = [P.red, P.orange, P.cream, P.white];
  for (let y = F.base - 640; y < F.base - 50; y += cell)
    for (let x = F.x - 360; x < F.x + 400; x += cell) {
      const v = field(x + 6, y + 6);
      const h = (F.base - y) / 560;
      const n = fbm(x * 0.03, y * 0.03, 61, 2);
      if (((v > 0.12 && v < 0.3 && h > 0.12 && h < 0.6) || (v > 0.5 && h > 0.14 && h < 0.34)) && n > 0.52) rect(x, y, cell, P.white);
      else if (v > 0.16 && n < 0.05 + h * 0.85) rect(x, y, cell, levels[clamp(Math.floor(v * 4.2), 0, 3)]);
    }
  for (const [x, y] of blobCells(F.x - 30, F.base - 240, 36, 66, 14, 62)) rect(x, y, 14, P.flatRed);
  for (const [x, y] of blobCells(F.x + 60, F.base - 350, 18, 46, 12, 63)) rect(x, y, 12, P.flatBlue);
  const c2 = 14;
  for (let id = 0; id < 1; id += 0.025) {
    const sx = F.x - 40 - 200 * id + 80 * Math.sin(id * 3);
    const sy = F.base - 420 - id * 300;
    for (let k = 0; k < 4; k++) {
      if (hash(k, id * 999, 64) > 0.45 - id * 0.2) continue;
      const x = Math.round((sx + (hash(k, id * 999, 65) - 0.5) * (90 + 140 * id)) / c2) * c2;
      const y = Math.round((sy + (hash(k, id * 999, 66) - 0.5) * 30) / c2) * c2;
      rect(x, y, c2, hash(k, id * 999, 67) < 0.86 ? P.white : P.flatBlue);
      if (hash(k, id * 999, 68) < 0.6) rect(x + c2, y + c2, c2, P.white);
    }
  }
  // Burnt ground spreading into the meadow, as a dot matrix.
  for (const [x0, y0] of blobCells(F.x + 40, F.base + 34, 300, 44, 10, 81, 1.4))
    for (let y = y0; y < y0 + 10; y++)
      for (let x = x0; x < x0 + 10; x++) {
        const l = lum(get(x, y));
        put(x, y, x % 3 < 2 && y % 3 < 2 ? [0.2 + l * 0.5, 0.15 + l * 0.35, 0.1 + l * 0.25] : P.ink, 0.92);
      }
  for (let k = 0; k < 70; k++) {
    const x = Math.round((F.x - 380 + hash(k, 1, 83) * 760) / 5) * 5;
    const y = Math.round((F.base + hash(k, 2, 83) * 110) / 5) * 5;
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
