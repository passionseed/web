#!/usr/bin/env node
/**
 * The plate of the Elemental announcement poster (the longer dates, the
 * Demo Day in the CSII building at Chula): a valley under a cloudy sky, with
 * a pink pixel sun coming up behind the ridge. Pink is Chula's colour on
 * these posters, so the sun is where the hackathon ends.
 *
 *   node scripts/render-elemental-news-plate.mjs [--out public/hackathon/poster/elemental/plate-news-valley.png]
 *
 * Drawn in the key poster's pixel look (scripts/elemental-pixel-kit.mjs):
 * the photo stays natural and bright, only the pixels are loud.
 * - The sun is one flat stepped disc on a 12px grid in three pinks, lit
 *   from the top left. The ridge hides its lower part.
 * - Smooth light first: a soft pink glow on the clouds around it.
 * - Two pixel clouds on an 8px grid, lumpy on top and flat underneath, in
 *   four stepped greys: one across the sun's foot (pinker where the sun is
 *   behind it), a small one beside it.
 * - The ridge under it catches the light as a pink dot screen.
 * - White checker sparks rise from it to the right on a 14px grid, thinning
 *   out, clear of the title and the facts.
 */
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import sharp from "sharp";

import { H, ROOT, W, arg, bayer, clamp, fbm, hash, hex, loadPlate, mix, plateImage } from "./elemental-scene.mjs";
import { dotScreen, glow, rect } from "./elemental-pixel-kit.mjs";

const OUT = resolve(ROOT, arg("--out", "public/hackathon/poster/elemental/plate-news-valley.png"));

const PINK = hex("#de5c8e");
const PINK_LIGHT = hex("#f6a3c1");
const PINK_PALE = hex("#fbd3e1");
const PINK_DEEP = hex("#b63c6d");
const WHITE = hex("#f7f4ec");
const YELLOW = hex("#ffd067");

// The sun: centre and radius, in frame pixels. Right of centre, below the title.
const SX = 668;
const SY = 676;
const R = 150;
const CELL = 12;

const plate = await loadPlate({ photo: "public/hackathon/poster/elemental/bg/valley-sergei-gussev-stocksnap.jpg", cropX: 576 });
const img = plateImage(plate);
const clean = plateImage(plate);

// ---------- where the sky ends ----------
// For each column, the first row (from the top) where the land starts: darker, or green.
const ridge = new Int32Array(W);
const isLand = (x, y) => {
  const i = (y * W + x) * 3;
  const r = clean[i];
  const g = clean[i + 1];
  const b = clean[i + 2];
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return l < 0.46 || g - b > 0.07;
};
for (let x = 0; x < W; x++) {
  let run = 0;
  ridge[x] = H;
  for (let y = 200; y < H; y++) {
    run = isLand(x, y) ? run + 1 : 0;
    if (run >= 10) {
      ridge[x] = y - 9;
      break;
    }
  }
}
// Smooth it a little, so one dark cloud pixel can't cut a notch.
const ridgeY = (x) => {
  let s = 0;
  let n = 0;
  for (let k = -6; k <= 6; k += 3) {
    s += ridge[clamp(Math.round(x) + k, 0, W - 1)];
    n++;
  }
  return s / n;
};
const sky = (x, y) => y < ridgeY(x) - 1;

// ---------- 1. soft light on the clouds ----------
await glow(
  img,
  [SX - R * 2.2, SY - R * 2.2, SX + R * 2.2, SY + R * 0.6],
  64,
  (paint) => {
    for (let y = SY - R * 2; y < SY + R * 0.4; y += 2)
      for (let x = SX - R * 2; x < SX + R * 2; x += 2) {
        if (!sky(x, y)) continue;
        const d = Math.hypot(x - SX, y - SY) / (R * 2);
        if (d < 1) paint(x, y, PINK_LIGHT, 0.3 * (1 - d) ** 1.6);
      }
  },
  { mode: "normal", fixed: PINK_LIGHT },
);

// ---------- 2. the sun ----------
for (let y = Math.floor((SY - R) / CELL) * CELL; y <= SY + R; y += CELL)
  for (let x = Math.floor((SX - R) / CELL) * CELL; x <= SX + R; x += CELL) {
    const cx = x + CELL / 2;
    const cy = y + CELL / 2;
    const d = Math.hypot(cx - SX, cy - SY) / R;
    if (d > 1 || !sky(cx, cy + CELL / 2)) continue;
    // Lit from the top left, in three flat tones with a dithered edge between them.
    const light = ((SX - cx) * 0.55 + (SY - cy) * 0.83) / R; // -1 (away) .. 1 (towards the light)
    const v = light + (bayer(x / CELL, y / CELL) - 0.5) * 0.3;
    rect(img, x, y, CELL, v > 0.45 ? PINK_LIGHT : v > -0.35 ? PINK : PINK_DEEP);
  }

// ---------- 3. pixel clouds: one across its foot, a small one behind it ----------
function mix3(a, b, t) {
  return [0, 1, 2].map((k) => mix(a[k], b[k], t));
}
const GREYS = [WHITE, hex("#dcd7cc"), hex("#b9b4a9"), hex("#8f8a80")]; // top of a puff to its underside
/** A cloud with a lumpy top and a flat bottom, on the 8px grid, in four stepped tones. */
function pixelCloud(cx, baseY, half, tall, seed) {
  const C = 8;
  for (let x = Math.floor((cx - half) / C) * C; x < cx + half; x += C) {
    const across = (x + C / 2 - cx) / half;
    if (Math.abs(across) >= 1) continue;
    const env = Math.sqrt(1 - across * across);
    // Puffs: a few rounded bumps of different sizes, stepped to the grid.
    const bump = 0.55 * Math.abs(Math.sin(x * 0.021 + seed)) + 0.45 * Math.abs(Math.sin(x * 0.047 + seed * 2.3));
    const top = Math.round((baseY - env * tall * (0.45 + 0.75 * bump)) / C) * C;
    const bottom = Math.round((baseY + env * 10 + (fbm(x * 0.03, seed, 5, 2) - 0.5) * 10) / C) * C;
    for (let y = top; y < bottom; y += C) {
      if (!sky(x + C / 2, y + C)) continue;
      const depth = (y - top) / Math.max(bottom - top, C) + (bayer(x / C, y / C) - 0.5) * 0.22;
      const tone = GREYS[clamp(Math.floor(depth * 3.4 - 0.25), 0, 3)];
      // Pink where the sun is behind it, so the two read as one light.
      const overSun = clamp(1.1 - Math.hypot(x + C / 2 - SX, y + C / 2 - SY) / R);
      rect(img, x, y, C, mix3(tone, PINK_PALE, overSun * 0.5), 0.97);
    }
  }
}
pixelCloud(SX - 250, SY - 96, 104, 44, 2.1);
pixelCloud(SX - 64, SY + 78, 286, 62, 0.7);

// ---------- 4. the ridge catches the light ----------
for (let x = SX - R - 40; x < Math.min(W, SX + R + 40); x++) {
  const top = Math.round(ridgeY(x));
  const reach = 34 * clamp(1 - Math.abs(x - SX) / (R + 40));
  for (let y = top; y < top + reach; y++) {
    const a = 0.6 * (1 - (y - top) / Math.max(reach, 1));
    dotScreen(img, x, y, PINK_LIGHT, PINK_DEEP, 1.5, a * 0.7);
  }
}

// ---------- 5. checker sparks rising to the right ----------
const S = 14;
for (let y = Math.floor(400 / S) * S; y < SY - R * 0.2; y += S)
  for (let x = Math.floor((SX - 60) / S) * S; x < W - S; x += S) {
    if (!sky(x + S / 2, y + S)) continue;
    if (Math.hypot(x + S / 2 - SX, y + S / 2 - SY) < R + 12) continue;
    if (x < 730 && y < 478) continue; // the facts row
    const up = clamp((SY - R * 0.2 - y) / 300); // 0 at the sun, 1 at the top
    const cx = SX + 120 + up * 190; // the plume leans right as it rises
    const drift = (x - cx) / (90 + up * 110);
    const p = (1 - up) ** 1.3 * Math.exp(-drift * drift * 1.3) * 0.55;
    if (((x / S + y / S) & 1) !== 0 || hash(x, y, 17) > p) continue;
    const k = hash(x, y, 23);
    rect(img, x, y, S, k < 0.5 ? WHITE : k < 0.8 ? PINK_LIGHT : k < 0.93 ? PINK : YELLOW, 0.96);
  }

// ---------- out ----------
const out = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H * 3; i++) out[i] = Math.round(clamp(img[i]) * 255);
mkdirSync(dirname(OUT), { recursive: true });
await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 9 }).toFile(OUT);
console.log("wrote", OUT);
