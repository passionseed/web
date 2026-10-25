#!/usr/bin/env node
/**
 * Pre-renders the SHIFT planet for the SHIFT[3] launch posters as PNGs, so
 * they get the 3D dotted globe of /shift/next without needing WebGL at
 * screenshot time. A CPU port of the earth and atmosphere shaders in
 * components/shift/next/globeShaders.ts, with Bangkok turned to wherever each
 * layout wants its launch point.
 *
 *   node scripts/render-shift3-planet.mjs            # every layout
 *   node scripts/render-shift3-planet.mjs feed story # just these
 *
 * Geometry lives in components/shift/poster/shift3/planets.json, shared with
 * the poster components. Each PNG is cropped to the disc plus its halo
 * (transparent outside), at `scale` times the poster size, and written to
 * public/shift/poster/shift3/planet-<layout>.png.
 */
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CONFIG = JSON.parse(readFileSync(path.join(ROOT, "components/shift/poster/shift3/planets.json"), "utf8"));
const OUT_DIR = path.join(ROOT, "public/shift/poster/shift3");

const BANGKOK = { lat: 13.75, lon: 100.5 };
const ROWS = 84;

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

const { data: MASK, info } = await sharp(path.join(ROOT, "public/shift/globe/land-mask.png"))
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true });
const landAt = (u, v) => {
  const x = Math.min(info.width - 1, Math.floor(u * info.width));
  const y = Math.min(info.height - 1, Math.floor((1 - v) * info.height));
  return MASK[y * info.width + x] / 255;
};

/** The crop box, mirrored by planetBox() in components/shift/poster/shift3/planet.ts. */
function planetBox(p) {
  const [W, H] = p.canvas;
  const reach = p.r * (1 + CONFIG.pad);
  const x = Math.max(0, Math.floor(p.cx - reach));
  const y = Math.max(0, Math.floor(p.cy - reach));
  return { x, y, w: Math.min(W, Math.ceil(p.cx + reach)) - x, h: Math.min(H, Math.ceil(p.cy + reach)) - y };
}

function renderPlanet(name, p) {
  const PLANET = { cx: p.cx, cy: p.cy, r: p.r };
  const [tx, ty] = p.bangkok;
  const SUN = norm(p.sun ?? [-0.85, 0.45, 0.55]);
  const BEACON = sphereDirection(BANGKOK.lat, BANGKOK.lon);

  /** View direction of a poster point on the planet (y up, z toward the viewer). */
  const viewNormal = (x, y) => {
    const nx = (x - PLANET.cx) / PLANET.r;
    const ny = (PLANET.cy - y) / PLANET.r;
    const z2 = 1 - nx * nx - ny * ny;
    return z2 < 0 ? null : [nx, ny, Math.sqrt(z2)];
  };

  /** Object->view rotation that puts Bangkok on its target with east to the right. */
  const R = (() => {
    const b = sphereDirection(BANGKOK.lat, BANGKOK.lon);
    const eastO = norm(cross([0, 1, 0], b));
    const northO = cross(b, eastO);
    const d = viewNormal(tx, ty);
    if (!d) throw new Error(`${name}: Bangkok ${tx},${ty} is off the disc`);
    const right = [1, 0.12, 0];
    const eastV = norm(right.map((r, i) => r - dot(right, d) * d[i]));
    const northV = cross(d, eastV);
    const O = [b, eastO, northO];
    const V = [d, eastV, northV];
    return [0, 1, 2].map((row) => [0, 1, 2].map((col) => O.reduce((s, o, k) => s + V[k][row] * o[col], 0)));
  })();
  const toObject = (n) => [0, 1, 2].map((i) => R[0][i] * n[0] + R[1][i] * n[1] + R[2][i] * n[2]);

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
    const radius = 0.13 + (0.34 + 0.05 * seed - 0.13) * land;
    const dotMask = 1 - smooth(radius - 0.08, radius + 0.08, dist);

    const light = dot(n, SUN);
    const day = smooth(-0.12, 0.4, light);
    const city = (seed >= 0.84 ? 1 : 0) * land * (1 - day) * 0.8;

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
    const core = 1 - smooth(0, 0.016, angle);
    const ring = (phase, reach) => {
      const r = phase * reach;
      const w = 0.004 + 0.01 * phase;
      return (1 - smooth(0, w, Math.abs(angle - r))) * (1 - phase);
    };
    const rings = ring(0.35, 0.3) + ring(0.8, 0.3);
    const fresnel = (1 - Math.max(n[2], 0)) ** 3;
    // Limb darkening and a sun glint on the sea, so the ball reads as round.
    const limb = 0.5 + 0.5 * n[2];
    const half = norm([SUN[0], SUN[1], SUN[2] + 1]);
    const glint = Math.max(0, dot(n, half)) ** 36 * (1 - land) * 0.55;

    return out.map(
      (c, i) =>
        c * limb +
        STAR[i] * glint +
        DAWN[i] * dawn * (0.25 + 0.55 * land * dotMask) +
        CITY[i] * (core * 2.2 + rings * 1.3) +
        RIM[i] * fresnel * (0.35 + 0.65 * day)
    );
  }

  /** Atmosphere outside the limb: a tight rim and a wide halo, coloured by the sun. */
  function halo(x, y) {
    const dx = (x - PLANET.cx) / PLANET.r;
    const dy = (PLANET.cy - y) / PLANET.r;
    const d = Math.hypot(dx, dy);
    const out = d - 1;
    const lit = smooth(-0.5, 0.6, (dx * SUN[0] + dy * SUN[1]) / d);
    const a = Math.min(1, Math.exp(-out / 0.03) * 0.95 + Math.exp(-out / 0.16) * 0.4) * (0.35 + 0.65 * lit);
    const color = [0, 1, 2].map((i) => DAWN[i] + (RIM[i] - DAWN[i]) * lit);
    return { color, a };
  }

  const SCALE = CONFIG.scale;
  const box = planetBox(p);
  const PW = box.w * SCALE;
  const PH = box.h * SCALE;
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
          const x = box.x + (i + sx) / SCALE;
          const y = box.y + (j + sy) / SCALE;
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
      // Straight (not premultiplied) alpha for PNG.
      const un = alpha > 0 ? 1 / (alpha * 4) : 0;
      px[k] = Math.min(255, Math.round(r * un * 255));
      px[k + 1] = Math.min(255, Math.round(g * un * 255));
      px[k + 2] = Math.min(255, Math.round(b * un * 255));
      px[k + 3] = Math.round(Math.min(1, alpha) * 255);
    }
  }
  return { px, PW, PH, box };
}

const wanted = process.argv.slice(2);
const layouts = Object.entries(CONFIG).filter(
  ([name, value]) => typeof value === "object" && value?.canvas && (!wanted.length || wanted.includes(name))
);
if (!layouts.length) {
  console.error(`No layout matched ${wanted.join(", ")}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, p] of layouts) {
  const { px, PW, PH, box } = renderPlanet(name, p);
  const out = path.join(OUT_DIR, `planet-${name}.png`);
  await sharp(px, { raw: { width: PW, height: PH, channels: 4 } }).png({ compressionLevel: 9 }).toFile(out);
  console.log(`wrote ${path.relative(ROOT, out)} box ${JSON.stringify(box)} bangkok ${JSON.stringify(p.bangkok)}`);
}
