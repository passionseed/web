#!/usr/bin/env node
/**
 * Pre-renders the SHIFT planet as a horizon for the SHIFT[3] Stories
 * (1080x1920), so the sheets get the dotted globe of /shift/next without
 * WebGL at screenshot time. Same CPU port of the earth and atmosphere shaders
 * as scripts/render-shift-high-planet.mjs (in the main checkout), re-framed:
 * a huge planet whose limb arcs across the foot of the story, under the IG
 * reply bar, with Bangkok on the night side (the sessions are at 19:00).
 *
 *   node components/shift/poster/shift3-stories/render-horizon.mjs
 *
 * Writes horizon.png next to this file: only the band from TOP down to the
 * foot (2x, transparent sky), placed at y = TOP by the story frame. Prints
 * the planet and Bangkok story coordinates, which geometry.ts mirrors.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const OUT = path.join(HERE, "horizon.png");

/** Story coordinates (1080x1920); the PNG is SCALE times larger. */
const W = 1080;
const H = 1920;
/** First story row the PNG covers: room above the limb for the halo. */
const TOP = 1240;
const SCALE = 2;
const PLANET = { cx: 540, cy: 2760, r: 1160 };
/** Where Bangkok should land on the story. */
const TARGET = { x: 352, y: 1688 };
const BANGKOK = { lat: 13.75, lon: 100.5 };
/** Dot rows pole to pole; more rows than the poster planet, it is 5x bigger. */
const ROWS = 210;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const SEA = hex("#060b24");
const LAND_DAY = hex("#e9eeff");
const LAND_NIGHT = hex("#3b45a8");
const CITY = hex("#ffd29a");
const DAWN = hex("#9d8cff");
const RIM = hex("#7fe3ff");
const STAR = hex("#f4f6ff");

const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const fract = (x) => x - Math.floor(x);
const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);

/** Same object space as three's SphereGeometry (see sphereDirection in ShiftGlobe). */
function sphereDirection(lat, lon) {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return [Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)];
}

/** View direction of a story point on the planet (y up, z toward the viewer). */
function viewNormal(x, y) {
  const nx = (x - PLANET.cx) / PLANET.r;
  const ny = (PLANET.cy - y) / PLANET.r;
  const z2 = 1 - nx * nx - ny * ny;
  return z2 < 0 ? null : [nx, ny, Math.sqrt(z2)];
}

/** Object->view rotation that puts Bangkok on TARGET with east to the right. */
function rotation() {
  const b = sphereDirection(BANGKOK.lat, BANGKOK.lon);
  const eastO = norm(cross([0, 1, 0], b));
  const northO = cross(b, eastO);
  const d = viewNormal(TARGET.x, TARGET.y);
  const right = [1, 0.05, 0];
  const eastV = norm(right.map((r, i) => r - dot(right, d) * d[i]));
  const northV = cross(d, eastV);
  const O = [b, eastO, northO];
  const V = [d, eastV, northV];
  return [0, 1, 2].map((row) => [0, 1, 2].map((col) => O.reduce((s, o, k) => s + V[k][row] * o[col], 0)));
}

const R = rotation();
const toObject = (n) => [0, 1, 2].map((i) => R[0][i] * n[0] + R[1][i] * n[1] + R[2][i] * n[2]);
/** Light from the right: the left of the arc (Bangkok) is in evening. */
const SUN = norm([1, 0.04, 0.12]);
const BEACON = sphereDirection(BANGKOK.lat, BANGKOK.lon);

const { data: MASK, info } = await sharp(path.join(ROOT, "public/shift/globe/land-mask.png"))
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true });
const landAt = (u, v) => {
  const x = Math.min(info.width - 1, Math.floor(u * info.width));
  const y = Math.min(info.height - 1, Math.floor((1 - v) * info.height));
  return MASK[y * info.width + x] / 255;
};

/** Earth shader: one dot per lat/lon cell, sized by the land mask. */
function earth(n) {
  const o = toObject(n);
  const theta = Math.acos(Math.max(-1, Math.min(1, o[1])));
  let phi = Math.atan2(o[2], -o[0]);
  if (phi < 0) phi += 2 * Math.PI;
  const u = phi / (2 * Math.PI);
  const v = 1 - theta / Math.PI;

  const row = Math.floor(v * ROWS);
  const rowLat = ((row + 0.5) / ROWS - 0.5) * Math.PI;
  const perRow = Math.max(1, Math.floor(ROWS * 2 * Math.cos(rowLat)));
  const col = Math.floor(u * perRow);
  const land = landAt((col + 0.5) / perRow, (row + 0.5) / ROWS);
  const seed = hash(col, row);
  const lx = fract(u * perRow) - 0.5;
  const ly = fract(v * ROWS) - 0.5;
  const dist = Math.hypot(lx, ly);
  const radius = 0.12 + (0.33 + 0.05 * seed - 0.12) * land;
  const dotMask = 1 - smooth(radius - 0.08, radius + 0.08, dist);

  const light = dot(n, SUN);
  const day = smooth(-0.12, 0.4, light);
  const city = (seed >= 0.8 ? 1 : 0) * land * (1 - day) * 0.9;

  const out = [0, 1, 2].map((i) => {
    const landColor = LAND_NIGHT[i] + (LAND_DAY[i] - LAND_NIGHT[i]) * day + CITY[i] * city * 1.4;
    const seaDot = SEA[i] * (1.6 + 1.2 * day);
    const dotColor = seaDot + (landColor - seaDot) * land;
    const dotAlpha = 0.35 + 0.35 * day + (1 - 0.35 - 0.35 * day) * land;
    const base = SEA[i] * (0.25 + 0.55 * day);
    return base + (dotColor - base) * dotMask * dotAlpha;
  });

  const dawn = Math.exp(-((light / 0.11) ** 2));
  const angle = Math.acos(Math.max(-1, Math.min(1, dot(o, BEACON))));
  // The beacon rings are sized for a planet 5x smaller, so scale them down.
  const core = 1 - smooth(0, 0.006, angle);
  const ring = (phase, reach) => {
    const r = phase * reach;
    const w = 0.0016 + 0.004 * phase;
    return (1 - smooth(0, w, Math.abs(angle - r))) * (1 - phase);
  };
  const rings = ring(0.35, 0.09) + ring(0.8, 0.09);
  const fresnel = (1 - Math.max(n[2], 0)) ** 3;
  const limb = 0.5 + 0.5 * n[2];

  return out.map(
    (c, i) =>
      c * (0.55 + 0.45 * limb) +
      DAWN[i] * dawn * (0.25 + 0.55 * land * dotMask) +
      CITY[i] * (core * 2.2 + rings * 1.3) +
      RIM[i] * fresnel * (0.25 + 0.6 * day),
  );
}

/** Atmosphere outside the limb: a tight rim and a wide halo, coloured by the sun. */
function halo(x, y) {
  const dx = (x - PLANET.cx) / PLANET.r;
  const dy = (PLANET.cy - y) / PLANET.r;
  const d = Math.hypot(dx, dy);
  const out = d - 1;
  const lit = smooth(-0.5, 0.5, (dx * SUN[0] + dy * SUN[1]) / d);
  const a = Math.min(1, Math.exp(-out / 0.012) * 0.95 + Math.exp(-out / 0.07) * 0.32) * (0.4 + 0.6 * lit);
  const color = [0, 1, 2].map((i) => DAWN[i] + (RIM[i] - DAWN[i]) * lit);
  return { color, a };
}

const PW = W * SCALE;
const PH = (H - TOP) * SCALE;
const px = Buffer.alloc(PW * PH * 4);
const SS = [0.25, 0.75];

for (let j = 0; j < PH; j++) {
  for (let i = 0; i < PW; i++) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    for (const sy of SS) {
      for (const sx of SS) {
        const x = (i + sx) / SCALE;
        const y = TOP + (j + sy) / SCALE;
        const n = viewNormal(x, y);
        if (n) {
          const c = earth(n);
          r += c[0];
          g += c[1];
          b += c[2];
          a += 1;
        } else {
          const h = halo(x, y);
          r += h.color[0] * h.a;
          g += h.color[1] * h.a;
          b += h.color[2] * h.a;
          a += h.a;
        }
      }
    }
    const k = (j * PW + i) * 4;
    const alpha = a / 4;
    const un = alpha > 0 ? 1 / (alpha * 4) : 0;
    px[k] = Math.min(255, Math.round(r * un * 255));
    px[k + 1] = Math.min(255, Math.round(g * un * 255));
    px[k + 2] = Math.min(255, Math.round(b * un * 255));
    px[k + 3] = Math.round(Math.min(1, alpha) * 255);
  }
}

// Fade the halo's top edge into the sky so the PNG has no visible border.
for (let j = 0; j < 60 * SCALE; j++) {
  const f = j / (60 * SCALE);
  for (let i = 0; i < PW; i++) {
    const k = (j * PW + i) * 4 + 3;
    px[k] = Math.round(px[k] * f);
  }
}

// A few stars between the sky's starfield and the limb.
for (let s = 0; s < 260; s++) {
  const x = hash(s, 1.3) * W;
  const y = TOP + hash(s, 7.9) * (H - TOP);
  if (viewNormal(x, y) || Math.hypot(x - PLANET.cx, y - PLANET.cy) < PLANET.r * 1.02) continue;
  const size = 0.6 + hash(s, 3.1) ** 3 * 1.6;
  const bright = 0.25 + 0.7 * hash(s, 5.7);
  for (let j = Math.floor((y - TOP - 3) * SCALE); j <= (y - TOP + 3) * SCALE; j++) {
    for (let i = Math.floor((x - 3) * SCALE); i <= (x + 3) * SCALE; i++) {
      if (i < 0 || j < 0 || i >= PW || j >= PH) continue;
      const fall = Math.max(0, 1 - Math.hypot(i / SCALE - x, TOP + j / SCALE - y) / size) * bright;
      const k = (j * PW + i) * 4;
      if (fall * 255 <= px[k + 3]) continue;
      px[k] = STAR[0] * 255;
      px[k + 1] = STAR[1] * 255;
      px[k + 2] = STAR[2] * 255;
      px[k + 3] = Math.round(fall * 255);
    }
  }
}

await sharp(px, { raw: { width: PW, height: PH, channels: 4 } }).png({ compressionLevel: 9 }).toFile(OUT);
console.log(`wrote ${path.relative(ROOT, OUT)} (${PW}x${PH})`);
console.log(`top ${TOP} planet ${JSON.stringify(PLANET)} bangkok ${JSON.stringify(TARGET)}`);
