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

// ---------- EARTH: an e-waste heap poisons the field; oil leaks out of it ----------
function earth() {
  const C = { x: 530, y: 1070, rx: 440, ry: 160 };
  const deadAt = (x, y) => {
    const dx = (x - C.x) / C.rx;
    const dy = (y - C.y) / C.ry;
    return Math.sqrt(dx * dx + dy * dy) + 0.85 * (fbm(x * 0.006, y * 0.014, 44, 5) - 0.5);
  };
  // Dead soil: the grass turns to grey-brown dirt; yellowing grass at its dithered edge.
  for (let y = 840; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = 1 - smooth(0.7, 1.05, deadAt(x, y));
      if (t <= 0) continue;
      const c = get(x, y);
      if (t < 0.95 && t < bayer(x >> 1, y >> 1)) {
        put(x, y, [clamp(c[0] * 1.15 + 0.06), c[1] * 0.85, c[2] * 0.55], 0.55 * t + 0.2);
        continue;
      }
      const l = lum(c);
      const dirt = [0.26 + l * 0.35, 0.21 + l * 0.27, 0.15 + l * 0.18];
      put(x, y, x % 4 < 3 && y % 4 < 3 ? dirt : dirt.map((v) => v * 0.62), 0.95);
    }
  // Cracks wander across the dead soil.
  for (let k = 0; k < 46; k++) {
    let x = C.x + (hash(k, 1, 48) - 0.5) * C.rx * 1.6;
    let y = C.y + (hash(k, 2, 48) - 0.5) * C.ry * 1.4;
    let a = hash(k, 3, 48) * Math.PI * 2;
    for (let i = 0; i < 34; i++) {
      if (deadAt(x, y) > 0.78) break;
      rect(Math.round(x / 3) * 3, Math.round(y / 3) * 3, 3, [0.09, 0.08, 0.06], 0.9);
      a += (hash(k, 10 + i, 48) - 0.5) * 1.1;
      x += Math.cos(a) * 4;
      y += Math.sin(a) * 2.2;
    }
  }
  // The main thing: an e-waste heap. Monitors, boards, phones, keyboards and
  // cables piled into one mound, lit from the top left, its edge ragged
  // with things sticking out (Angpao, 2026-11-21: e-waste is the main one).
  {
    const HP = { cx: 480, cy: 1040, rx: 300, ry: 150 };
    const C4 = 4;
    const top = (x) => {
      const u = (x - HP.cx) / HP.rx;
      if (Math.abs(u) >= 1) return Infinity;
      return HP.cy - HP.ry * Math.pow(1 - u * u, 0.6) * (0.85 + 0.5 * (fbm(x * 0.025, 0.3, 70, 3) - 0.5));
    };
    const bottom = (x) => HP.cy + 30 - 20 * Math.pow((x - HP.cx) / HP.rx, 2);
    const inside = (x, y) => y > top(x) && y < bottom(x);
    const depth = (x, y) => clamp((y - top(x)) / Math.max(bottom(x) - top(x), 1));
    const light = (x, y) => clamp(1.15 - 0.6 * depth(x, y) - 0.25 * ((x - HP.cx) / HP.rx), 0.35, 1.2);
    const PCB = hex("#33603e");
    const TRACE = hex("#7aa266");
    const GOLD = hex("#d2a63a");
    const CHIP = hex("#141414");
    const SCREEN = hex("#0f1418");
    const GLASS = hex("#9fb6c4");
    const PLASTIC = [hex("#c9c4b8"), hex("#8f8a80"), hex("#d9d4c6"), hex("#5c5a55"), hex("#2e2d2b")];
    const WIRES = [hex("#141414"), hex("#c23a2a"), hex("#2f5fa8"), hex("#d8b23a"), hex("#e8e6de")];
    const JUMBLE = [...PLASTIC, PCB, PCB, SCREEN, CHIP, hex("#6b3a1c")];
    // Its shadow on the soil, to the lower right.
    for (let y = HP.cy - 20; y < HP.cy + 70; y++)
      for (let x = HP.cx - HP.rx; x < HP.cx + HP.rx + 80; x++) {
        const dx = (x - HP.cx - 40) / (HP.rx + 40);
        const dy = (y - HP.cy - 25) / 40;
        const d = dx * dx + dy * dy;
        if (d < 1) put(x, y, [0.05, 0.04, 0.03], 0.45 * (1 - d));
      }
    // The body: a dense jumble of parts, darker toward the bottom.
    for (let y = HP.cy - HP.ry - 20; y < HP.cy + 40; y += C4)
      for (let x = HP.cx - HP.rx; x < HP.cx + HP.rx; x += C4) {
        if (!inside(x + 2, y + 2)) continue;
        const c = JUMBLE[Math.floor(hash(x >> 2, y >> 2, 71) * JUMBLE.length)];
        rect(x, y, C4, c.map((v) => v * light(x, y) * (0.55 + 0.35 * hash(x, y, 72))));
      }
    // Parts on top of the jumble, back to front. They may stick out past the edge.
    const r = (k, i) => hash(k, i, 111);
    const px = (x, y, c, k) => {
      const l = inside(x, y) ? light(x, y) : light(x, Math.min(y + 12, bottom(x) - 1));
      rect(Math.round(x / C4) * C4, Math.round(y / C4) * C4, C4, c.map((v) => clamp(v * l)), k);
    };
    const items = [];
    for (let k = 0; k < 900 && items.length < 170; k++) {
      const x = HP.cx + (r(k, 1) - 0.5) * 2 * HP.rx * 0.9;
      const y = top(x) + r(k, 2) * (bottom(x) - top(x)) * 0.9;
      if (!Number.isFinite(y) || !inside(x, y + 2)) continue;
      items.push({ k, x, y, roll: r(k, 3) });
    }
    items.sort((a, b) => a.y - b.y);
    for (const { k, x, y, roll } of items) {
      if (roll < 0.22) {
        // A monitor: a shell, a dark screen with a glare; bigger ones near the top.
        const big = depth(x, y) < 0.3;
        const w = (big ? 14 : 8) + Math.floor(r(k, 4) * 5);
        const hh = Math.round(w * 0.72);
        const shell = PLASTIC[Math.floor(r(k, 5) * PLASTIC.length)];
        for (let j = 0; j < hh; j++)
          for (let i = 0; i < w; i++) {
            const inner = i > 0 && j > 0 && i < w - 1 && j < hh - 1;
            const c = inner && (i === j + 1 || i === j + 2) ? GLASS : inner ? SCREEN : shell;
            px(x + (i - w / 2) * C4, y + (j - hh) * C4, c, 1);
          }
      } else if (roll < 0.42) {
        // A circuit board, tilted.
        const w = 10 + Math.floor(r(k, 6) * 9);
        const hh = 5 + Math.floor(r(k, 7) * 5);
        const tilt = (r(k, 8) - 0.5) * 0.6;
        for (let j = 0; j < hh; j++)
          for (let i = 0; i < w; i++) {
            let c = i % 5 === 2 || j === Math.floor(hh / 2) ? TRACE : PCB;
            if ((i * 3 + j * 5) % 11 === 0) c = GOLD;
            if (i > w / 2 - 2 && i < w / 2 + 2 && j > 0 && j < hh - 1) c = CHIP;
            px(x + (i - w / 2) * C4, y + (j - hh / 2 + (i - w / 2) * tilt) * C4, c, 1);
          }
      } else if (roll < 0.56) {
        // A keyboard: rows of keys.
        const w = 12 + Math.floor(r(k, 9) * 6);
        for (let j = 0; j < 4; j++) for (let i = 0; i < w; i++) px(x + (i - w / 2) * C4, y + j * C4, (i + j) % 2 ? PLASTIC[0] : PLASTIC[3], 1);
      } else if (roll < 0.68) {
        // A phone with a cracked screen.
        for (let j = 0; j < 9; j++)
          for (let i = 0; i < 5; i++) {
            const edge = i === 0 || j === 0 || i === 4 || j === 8;
            px(x + i * C4, y + j * C4, edge ? PLASTIC[4] : Math.abs(i - j * 0.5) < 0.6 ? GLASS : SCREEN, 1);
          }
      } else if (roll < 0.86) {
        // A cable draped over the pile.
        const c = WIRES[Math.floor(r(k, 10) * WIRES.length)];
        let cx = x;
        let cy = y;
        for (let i = 0; i < 26; i++) {
          px(cx, cy, c, 1);
          cx += (r(k, 20 + i) - 0.5) * 10;
          cy += r(k, 50 + i) * 5;
        }
      } else {
        // A battery.
        const c = [hex("#2a2a2a"), hex("#c76a2a"), hex("#3a6fb0")][Math.floor(r(k, 11) * 3)];
        for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) px(x + i * C4, y + j * C4, i === 5 ? GOLD : j === 0 ? PLASTIC[2] : c, 1);
      }
    }
  }
  // Sludge pools: black oil leaking out of the heap, a sick green where it catches the light.
  const SLUDGE = [hex("#0c0d09"), hex("#1b2010"), hex("#4a5a18"), hex("#a6b832")];
  for (const [cx, cy, rx, ry, s] of [
    [470, 1120, 230, 38, 51],
    [800, 1110, 110, 26, 52],
    [190, 1090, 90, 20, 53],
  ])
    for (const [x, y] of blobCells(cx, cy, rx, ry, 8, s, 0.7)) {
      const n = fbm(x * 0.03, y * 0.06, s, 2);
      rect(x, y, 8, n > 0.76 ? SLUDGE[3] : n > 0.66 ? SLUDGE[2] : n > 0.5 ? SLUDGE[1] : SLUDGE[0], 0.95);
    }
  // Two chemical drums beside the heap, one tipped over and leaking.
  const drums = [
    { x: 840, y: 1040, c: "#b8301a" },
    { x: 900, y: 1085, c: "#d8b23a", tipped: true },
  ];
  for (const d of drums) {
    const cell = Math.round(6 + (d.y - 960) / 28);
    const base = hex(d.c);
    const cols = d.tipped ? 13 : 9;
    const rows = d.tipped ? 8 : 12;
    const x0 = Math.round(d.x - (cols * cell) / 2);
    const y0 = Math.round(d.y - rows * cell);
    // Shadow on the ground.
    for (const [sx, sy] of blobCells(d.x + cell * 2, d.y, (cols * cell) / 1.6, cell * 2, 4, 60, 0.3)) rect(sx, sy, 4, [0.06, 0.05, 0.04], 0.5);
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const u = i / (cols - 1);
        const v = j / (rows - 1);
        // Round body: lit on the left, dark on the right; ribs across it.
        const light = d.tipped ? 1.15 - 0.6 * Math.abs(v - 0.3) : 1.2 - 0.7 * u;
        let c = base.map((k) => clamp(k * light));
        const rib = d.tipped ? i === 3 || i === 9 : j === 3 || j === 8;
        if (rib) c = c.map((k) => k * 0.6);
        if (!d.tipped && j === 0) c = base.map((k) => clamp(k * 1.35));
        // Rust in dithered spots.
        if (fbm((x0 + i * cell) * 0.08, (y0 + j * cell) * 0.08, 61, 2) > 0.62) c = hex("#6b3a1c");
        // Hazard label: a white panel with a black mark.
        const label = d.tipped ? i >= 5 && i <= 7 && j >= 2 && j <= 5 : i >= 3 && i <= 5 && j >= 4 && j <= 6;
        if (label) c = (i + j) % 2 ? P.white : P.ink;
        // The tipped drum's open end is dark.
        if (d.tipped && i === cols - 1) c = P.ink;
        rect(x0 + i * cell, y0 + j * cell, cell, c);
      }
  }
  // Bags and bits snagged in the grass.
  const BAGS = [hex("#e8e6de"), hex("#3a6fb0"), hex("#c23a2a"), hex("#d8b23a"), hex("#2a2a2a"), hex("#8f8a80")];
  for (let k = 0; k < 50; k++) {
    const x = Math.round((hash(k, 1, 47) * W) / 6) * 6;
    const y = Math.round((880 + Math.pow(hash(k, 2, 47), 0.8) * 460) / 6) * 6;
    const c = BAGS[Math.floor(hash(k, 3, 47) * BAGS.length)];
    rect(x, y, 6, c, 0.95);
    if (hash(k, 4, 47) < 0.5) rect(x + 6, y - 6, 6, c, 0.95);
  }
}

// ---------- AIR: a toxic purple haze swallows the valley ----------
async function air() {
  const sky = new Int32Array(W);
  for (let x = 0; x < W; x++) {
    let y = 0;
    while (y < H - 1 && get(x, y)[2] - get(x, y)[1] > 0.02) y++;
    sky[x] = y;
  }
  // Purple, so it reads as poison, not weather (Angpao, 2026-11-21).
  const SMOG = hex("#8a5a9e");
  // 1. The veil: the sky sours to a toxic purple toward the horizon and the
  // hills fade into it, the way real haze eats distance.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const top = 560 + 70 * (fbm(x * 0.003, 0.5, 91, 3) - 0.5);
      let a;
      if (y < sky[x]) a = 0.78 * smooth(top, sky[x] + 40, y);
      else a = 0.62 * (1 - smooth(sky[x], sky[x] + 520, y)) + 0.12;
      if (a <= 0) continue;
      const l = lum(get(x, y));
      put(x, y, SMOG.map((v) => clamp(v * (0.75 + 0.5 * l))), a);
    }
  // 2. A dim sun, a flat orange disc seen through the smog.
  const SUN = { x: 790, y: 640, r: 44 };
  const glow = new Float32Array(W * H * 4);
  for (let y = SUN.y - 160; y < SUN.y + 160; y++)
    for (let x = SUN.x - 160; x < SUN.x + 160; x++) {
      const d = Math.hypot(x - SUN.x, y - SUN.y) / 160;
      if (d < 1) paint(glow, x, y, hex("#d9e07a"), 0.45 * Math.pow(1 - d, 2));
    }
  drawLayer(await blurLayer(glow, 12), "screen", hex("#d9e07a"));
  for (let y = SUN.y - SUN.r; y < SUN.y + SUN.r; y += 6)
    for (let x = SUN.x - SUN.r; x < SUN.x + SUN.r; x += 6) {
      if (Math.hypot(x + 3 - SUN.x, y + 3 - SUN.y) > SUN.r) continue;
      // Smog bands cross the disc.
      if (fbm(x * 0.01, y * 0.06, 97, 2) > 0.62) continue;
      rect(x, y, 6, hex("#e3e88a"), 0.85);
    }
  // 3. Pixel strata: long horizontal smog bands in an ordered dither.
  const cell = 8;
  const tones = [hex("#d9b3ea"), hex("#a06ab8"), hex("#5c2d72")];
  for (let y = 520; y < 1040; y += cell)
    for (let x = 0; x < W; x += cell) {
      const t = smooth(540, 760, y) * (1 - smooth(860, 1040, y));
      const n = fbm(x * 0.0035, y * 0.035, 95, 4);
      const d = t * (n * 2.2 - 0.55) + (bayer(x / cell, y / cell) - 0.5) * 0.9;
      if (d < 0.55) continue;
      rect(x, y, cell, tones[clamp(Math.floor((d - 0.55) * 2.2), 0, 2)], 0.88);
    }
  // 4. PM2.5: dust everywhere below the type.
  for (let k = 0; k < 220; k++) {
    const x = Math.round((hash(k, 1, 93) * W) / 4) * 4;
    const y = Math.round((560 + hash(k, 2, 93) * 760) / 4) * 4;
    rect(x, y, hash(k, 4, 93) < 0.25 ? 6 : 4, hash(k, 3, 93) < 0.6 ? hex("#6e3d86") : hex("#2e1a3a"), 0.85);
  }
}

// ---------- FIRE: the forest burns along its whole edge ----------
async function fire() {
  // The untouched photo, to cut the trees back out in front of the flames.
  const orig = img.slice();
  const origAt = (x, y) => {
    const i = (y * W + x) * 3;
    return [orig[i], orig[i + 1], orig[i + 2]];
  };
  // Flame sources along the treeline: x, base, height. Tallest to the right, away from the type.
  const SRC = [
    [240, 960, 240],
    [340, 955, 320],
    [455, 950, 360],
    [565, 945, 420],
    [680, 940, 510],
    [790, 935, 440],
    [900, 930, 390],
    [1015, 930, 320],
  ];
  const field = (x, y) => {
    let best = 0;
    for (const [i, [sx, base, h]] of SRC.entries())
      for (const [ox, wf, hf, lean] of [
        [0, 1, 1, -20],
        [-38, 0.6, 0.62, -30],
        [42, 0.55, 0.7, 10],
      ]) {
        const gh = h * hf;
        const t = (base - y) / gh;
        if (t < -0.15 || t > 1) continue;
        const tt = Math.max(t, 0);
        const wob = 34 * (fbm(x * 0.014, y * 0.022 + i, 5, 3) - 0.5) * (0.3 + tt);
        const c = sx + ox + lean * Math.pow(tt, 1.6) + wob;
        const hw = ((110 * wf) / 2) * Math.pow(1 - tt, 0.7) * (t < 0 ? 1 + t * 5 : 1);
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
  // Smoke: a thick brown-grey wall rising off the whole treeline, drifting up and right.
  const SMOKE = hex("#3b3430");
  const smoke = new Float32Array(W * H * 4);
  for (let y = 120; y < 900; y++)
    for (let x = 0; x < W; x++) {
      const rise = 880 - y;
      const lean = x - rise * 0.55; // where along the treeline this smoke came from
      if (lean < 150) continue;
      const n = fbm(x * 0.004, y * 0.006, 150, 5);
      const body = smooth(150, 320, lean) * (1 - smooth(260 + 320 * n, 700, rise));
      // Keep the type clear: thin out over the top left.
      const clear = smooth(380, 620, x + (y - 420) * 0.6);
      const a = clamp(body * clear * (0.35 + 0.9 * n));
      if (a > 0.02) paint(smoke, x, y, SMOKE, 0.9 * a);
    }
  drawLayer(await blurLayer(smoke, 10), "normal", SMOKE);
  // The sky and the trees glow orange; the meadow catches the light.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const along = smooth(120, 300, x);
      const dy = (y - 860) / 300;
      if (Math.abs(dy) < 1) put(x, y, P.orange, 0.34 * along * Math.pow(1 - Math.abs(dy), 1.8));
      const gy = (y - 1010) / 120;
      if (Math.abs(gy) < 1) screen(x, y, P.yellow, 0.4 * along * Math.pow(1 - Math.abs(gy), 1.4));
    }
  // The flames.
  const halo = new Float32Array(W * H * 4);
  const flame = new Float32Array(W * H * 4);
  for (let y = 380; y < 990; y++)
    for (let x = 140; x < W; x++) {
      const v = field(x, y);
      if (v > 0.02) paint(halo, x, y, P.orange, 0.55 * smooth(0.02, 0.3, v));
      if (v < 0.1) continue;
      const h = clamp((900 - y) / 450);
      const lick = v * (0.62 + 0.7 * fbm(x * 0.07, y * 0.009 + 9, 71, 3)) * (1 - 0.25 * h);
      const a = smooth(0.1, 0.42, lick) * (1 - 0.35 * h);
      if (a < 0.98 && a < bayer(x >> 1, y >> 1)) continue;
      paint(flame, x, y, colour(lick), 1);
    }
  drawLayer(await blurLayer(halo, 26), "normal", P.orange);
  drawLayer(await blurLayer(flame, 0.8), "normal");
  // Pixel passes: mosaic tops, a white stepped crown, sparks drifting with the smoke.
  const cell = 10;
  const levels = [P.red, P.orange, P.cream, P.white];
  for (let y = 380; y < 880; y += cell)
    for (let x = 140; x < W; x += cell) {
      const v = field(x + 6, y + 6);
      const h = (900 - y) / 450;
      const n = fbm(x * 0.03, y * 0.03, 61, 2);
      if (v > 0.12 && v < 0.3 && h > 0.15 && h < 0.6 && n > 0.55) rect(x, y, cell, P.white);
      else if (v > 0.16 && n < 0.05 + h * 0.85) rect(x, y, cell, levels[clamp(Math.floor(v * 4.2), 0, 3)]);
    }
  const c2 = 12;
  for (let k = 0; k < 90; k++) {
    const t = hash(k, 1, 160);
    const x = Math.round((300 + hash(k, 2, 160) * 760 + t * 120) / c2) * c2;
    const y = Math.round((860 - t * 520) / c2) * c2;
    if (x < 420 && y < 560) continue;
    rect(x, y, c2, hash(k, 3, 160) < 0.75 ? P.yellow : P.white, 0.9 - t * 0.5);
  }
  // The trees stand in front of the fire: their crowns become black
  // silhouettes, rimmed orange on top where the flames light them, so the
  // flames rise out of the forest instead of floating over it.
  const isTree = (x, y) => {
    const c = origAt(x, y);
    return c[1] > c[2] + 0.015 && lum(c) < 0.46;
  };
  for (let y = 830; y < 1004; y += 3)
    for (let x = 150; x < W; x += 3) {
      if (!isTree(x, y)) continue;
      const fade = 1 - smooth(970, 1004, y);
      const rim = !isTree(x, Math.max(y - 6, 0)) || !isTree(x, Math.max(y - 12, 0));
      const heat = field(x, y - 30);
      const c = rim ? (heat > 0.2 ? P.yellow : P.orange) : hash(x, y, 154) < 0.12 + heat * 0.4 ? P.deep : P.ink;
      rect(x, y, 3, c, 0.92 * fade * smooth(150, 230, x));
    }
  // Embers in the meadow.
  for (let k = 0; k < 70; k++) {
    const x = Math.round((200 + hash(k, 1, 83) * 880) / 5) * 5;
    const y = Math.round((1000 + hash(k, 2, 83) * 140) / 5) * 5;
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
