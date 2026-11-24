#!/usr/bin/env node
/**
 * Elemental, Aether on its own: "ภัยที่มองไม่เห็น", the harm you can't see,
 * meaning the energy that apps and AI use. A calm rice field under power
 * lines at sunset, then a data center is built on it block by block: long,
 * windowless server halls, generators, a substation and a fence land in the
 * middle distance under the pylon. When the new line is connected the
 * lines start carrying violet pulses into it, its server lights wake up,
 * a violet glow and a shimmer of heat rise off it, and the rice dries out
 * from the building outward. At the end only the humming compound is left.
 *
 *   node scripts/render-elemental-aether.mjs --out <dir> [--fps 24] [--width 1080]
 *        [--ambience <wav>] [--frames 0,120,263]
 *
 * --frames renders only those frames as PNGs into <dir> (for checking a
 * look quickly), with no sound and no video.
 *
 * Photo: a rice field with a footpath and high-voltage pylons, by rawpixel
 * (rawpixel.com, image 3340500), listed as CC0.
 *
 * Writes <dir>/elemental-aether.mp4 (with sound, for Instagram),
 * <dir>/elemental-aether.gif (silent) and <dir>/aether-events.json. The sound
 * is made by scripts/render-elemental-aether-sound.py from the events and a
 * field recording (--ambience <wav>: "Sounds of various animals in the rice
 * fields." by River_flowers on Freesound, CC0, scripts/elemental-audio): the
 * field breaks up as the compound grows, every block lands with a thud or a
 * clank, the lines crackle, and a hum, server fans and a drone take over.
 *
 * The look is the key poster's (elemental-pixel-kit.mjs has the rules):
 * - The photo stays natural: its own sky and colours, no grade over the
 *   frame. Only the pixels are loud.
 * - The data center is bold pixel art on a 4px grid: clean light greys with
 *   ink edges, its shaded sides as the poster's dot-matrix (made from the
 *   photo's own brightness), rows of server lights as flickering violet and
 *   lilac cells, fans as a turning checker, standing on a dark dot-matrix
 *   pad with a contact shadow.
 * - Aether is violet (brand.ts: "purple, ethereal"), so what it does is
 *   drawn in violet and lilac: a glow around the compound, checker pulses
 *   along the real power lines (traced from the photo), and the heat over
 *   the roofs as a sparse ordered dither.
 * - The rice dries out from the building outward as the poster's mosaic
 *   (spreadSickness with the dead tones), with a dot-screen front.
 *
 * Where the blocks go still comes from the photo: the camera is matched to
 * it (eye level, focal length, the footpath's vanishing point, worked out
 * from the pylon and the path), so every block is a box standing on the
 * field, in the right size and perspective. Each 4px cell casts a ray into
 * the boxes to find which face it sees; the face, not a light model, picks
 * the flat colour, and the low evening sun from the left (behind the
 * camera) decides which faces are in shade.
 *
 * Needs ffmpeg and python3 with numpy.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

import { H, ROOT, W, arg, bayer, clamp, encode, fbm, freshTmp, hash, hex, loadPlate, mix, plateImage, smooth, timeline, writeFrame } from "./elemental-scene.mjs";
import { PX, TONES, dither, dotMatrix, flatShape, glow, put, rect, spreadSickness } from "./elemental-pixel-kit.mjs";

const OUT = resolve(arg("--out", "output/marketing/elemental-aether"));
const FPS = Number(arg("--fps", 24));
const WIDTH = Number(arg("--width", 1080));
const AMBIENCE = arg("--ambience");
const ONLY = arg("--frames") ? new Set(arg("--frames").split(",").map(Number)) : null;
const C = 4; // pixel grid, the same as Earth's
const GW = W / C;
const GH = Math.ceil(H / C);
const TMP = join(OUT, ".frames-aether");
const { N, levelAt, timeOf, duration, buildStart, buildEnd, ease } = timeline({ fps: FPS });

// ---------- the photo and its camera ----------
const PHOTO = "public/hackathon/poster/elemental/bg/powerlines-rawpixel-3340500.jpg";
const CROP_X = 450; // keeps the pylon just right of centre and the path on the left
const S = H / 1500; // source pixels to frame pixels (the crop is the full photo height)
const toU = (x) => (x - CROP_X) * S;
// Worked out from the photo: the pylon's feet stand at y 885 (source) and
// the tower is about 680 px tall; for a camera 1.6 m up that puts eye level
// at y 862 and the pylon about 107 m away (a 47 m tower). The footpath runs
// straight away from us towards x 818 on the horizon.
const YH = 862 * S; // eye level in the frame
const F = 1555 * S; // focal length in frame pixels
const CXP = toU(1000); // the photo's centre
const HC = 1.6; // camera height, metres
// The compound is laid out on the field's own grid, which runs along the
// footpath: b goes away from us along the path, a across it (metres).
const PATH_K = (toU(818) - CXP) / F;
const EB = [PATH_K / Math.hypot(PATH_K, 1), 1 / Math.hypot(PATH_K, 1)]; // (x, z) of b
const EA = [EB[1], -EB[0]]; // (x, z) of a
/** A point on the field grid (a across, y up, b along) to the frame: [u, v, depth]. */
function project(a, y, b) {
  const x = a * EA[0] + b * EB[0];
  const z = a * EA[1] + b * EB[1];
  return [CXP + (F * x) / z, YH - (F * (y - HC)) / z, z];
}
/** The ray through frame point (u, v), on the field grid. Starts at (0, HC, 0). */
function ray(u, v) {
  const dx = (u - CXP) / F;
  const dy = -(v - YH) / F;
  return [dx * EA[0] + EA[1], dy, dx * EB[0] + EB[1]];
}
const depthOf = (a, b) => a * EA[1] + b * EB[1];

// The evening sun: low (about 19 degrees), from the left and a little behind
// us, so faces turned left or towards us are lit, the others are in shade,
// and shadows fall away to the right, like the path's shadow in the photo.
const SUNW = (() => {
  const v = [-0.8, 0.32, -0.5];
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
})();
const SUN = [SUNW[0] * EA[0] + SUNW[2] * EA[1], SUNW[1], SUNW[0] * EB[0] + SUNW[2] * EB[1]]; // (a, y, b)

// ---------- the compound ----------
// Every block is a box on the field grid: a0..a1 across, y0..y1 up, b0..b1
// along, with what it's made of and when it lands (as a build level 0..1).
const blocks = [];
const add = (kind, a0, a1, y0, y1, b0, b1, at, extra = {}) => blocks.push({ kind, a0, a1, y0, y1, b0, b1, at, ...extra });

// Two long server halls side by side under the pylon, their long sides
// running along the field towards the horizon. Each goes up in full-length
// sections from left to right: the very first block is already a big piece
// of building you can read on a phone, and the hall widens across the field.
const HALL_H = 9;
const halls = [
  // cuts: where each section ends across the field; the first is the widest.
  { a0: 4, a1: 22, b0: 52, b1: 100, cuts: [4, 12, 17, 22], at: [0.03, 0.1, 0.17] },
  { a0: 27, a1: 45, b0: 55, b1: 104, cuts: [27, 33, 39, 45], at: [0.36, 0.42, 0.48] },
];
halls.forEach((h, hi) =>
  h.at.forEach((at, i) => add("hall", h.cuts[i], h.cuts[i + 1], 0, HALL_H, h.b0, h.b1, at, { hall: hi, seg: i, front: i === 0, ha0: h.a0, ha1: h.a1 })),
);
// Late on, more halls rise behind the trees on the left: far away, so
// small and deep in the haze, with the trees in front of them.
[
  { a0: -30, a1: -13, b: [195, 168, 140], at: [0.8, 0.86] },
  { a0: -7, a1: 11, b: [215, 185, 152], at: [0.88, 0.93] },
].forEach((h, hi) =>
  h.at.forEach((at, i) => add("hall", h.a0, h.a1, 0, HALL_H + 1, h.b[i + 1], h.b[i], at, { hall: 2 + hi, seg: i, far: true, ha0: h.a0, ha1: h.a1 })),
);
// Cooling units on the roofs, near the front edge, so they show over the
// parapet against the sky; and exhaust stacks.
[
  [5, 8.5, 0.27],
  [9.5, 13, 0.3],
  [14, 17.5, 0.33],
  [18.5, 21, 0.38],
].forEach(([a0, a1, at]) => add("roofUnit", a0, a1, HALL_H, HALL_H + 2.4, 54.5, 59, at));
add("stack", 7.6, 8.4, HALL_H, HALL_H + 4.2, 64, 64.8, 0.56);
add("stack", 15.6, 16.4, HALL_H, HALL_H + 4.2, 64, 64.8, 0.6);
[
  [28, 31.5, 0.62],
  [32.5, 36, 0.66],
  [37, 40.5, 0.7],
].forEach(([a0, a1, at]) => add("roofUnit", a0, a1, HALL_H, HALL_H + 2.4, 57.5, 62, at));
// A row of backup generators (containers) in front of the first hall.
[
  [5, 11.4, 0.55],
  [12.4, 18.8, 0.59],
].forEach(([a0, a1, at]) => add("genset", a0, a1, 0, 2.9, 47, 49.6, at));
add("stack", 6, 6.4, 2.9, 4.4, 48, 48.4, 0.6);
add("stack", 13.4, 13.8, 2.9, 4.4, 48, 48.4, 0.63);
// The substation on the right: transformers and the gantry the new line
// from the pylon comes down to.
add("transformer", 19.8, 23.2, 0, 3.3, 41.5, 44.5, 0.25);
add("transformer", 24.6, 28, 0, 3.3, 42, 45, 0.28);
const GANTRY = { a0: 21, a1: 29, b: 47.5, top: 10.4 };
add("steel", GANTRY.a0 - 0.25, GANTRY.a0 + 0.25, 0, GANTRY.top, GANTRY.b - 0.25, GANTRY.b + 0.25, 0.31);
add("steel", GANTRY.a1 - 0.25, GANTRY.a1 + 0.25, 0, GANTRY.top, GANTRY.b - 0.25, GANTRY.b + 0.25, 0.31);
add("steel", GANTRY.a0 - 0.3, GANTRY.a1 + 0.3, GANTRY.top - 0.6, GANTRY.top, GANTRY.b - 0.2, GANTRY.b + 0.2, 0.33);
const CONNECT = 0.35; // the new line is strung and the power starts flowing
// Floodlight poles.
const POLES = [
  { a: -2.6, b: 39.5, at: 0.72, h: 8 },
  { a: 24.5, b: 52, at: 0.76, h: 11 },
];
for (const p of POLES) {
  add("steel", p.a - 0.14, p.a + 0.14, 0, p.h, p.b - 0.14, p.b + 0.14, p.at);
  add("lamp", p.a - 0.5, p.a + 0.5, p.h - 0.4, p.h + 0.1, p.b - 0.3, p.b + 0.3, p.at, { lamp: true });
}
// The fence across the field in front, post by post from left to right,
// with a gate where the footpath used to go on.
const FENCE_B = 37;
const FENCE_H = 2.3;
const FENCE_A = [-26, 34];
const fencePosts = [];
for (let a = FENCE_A[0], k = 0; a <= FENCE_A[1]; a += 3, k++) {
  const at = 0.66 + 0.2 * ((a - FENCE_A[0]) / (FENCE_A[1] - FENCE_A[0]));
  fencePosts.push({ a, at });
  add("post", a - 0.07, a + 0.07, 0, FENCE_H + 0.3, FENCE_B - 0.07, FENCE_B + 0.07, at, { small: true });
}
// Timing: when each block lands, how long it falls and from how high.
for (const bk of blocks) {
  bk.landT = timeOf(bk.at);
  const big = bk.kind === "hall";
  bk.fallT = big ? 0.45 : bk.small ? 0.22 : 0.32;
  bk.drop = big ? 9 : bk.small ? 2.5 : 5;
  bk.seed = Math.floor(hash(Math.round(bk.a0 * 10), Math.round(bk.b0 * 10), 3) * 1e6);
  const c = project((bk.a0 + bk.a1) / 2, 0, bk.b0);
  bk.x = c[0] / W;
  bk.z = c[2];
}
const connectT = timeOf(CONNECT);
const fanStart = timeOf(0.2);

// ---------- ray against boxes ----------
/** Nearest hit of the ray (from (0, HC, 0) along d) with box bk raised by dy:
 *  [t, axis, sign] or null. axis 0 = a, 1 = y, 2 = b; sign is the face normal. */
function hitBox(bk, d, dy = 0, o = [0, HC, 0]) {
  let tmin = 1e-4;
  let tmax = 1e9;
  let axis = -1;
  let sign = 0;
  const lo = [bk.a0, bk.y0 + dy, bk.b0];
  const hi = [bk.a1, bk.y1 + dy, bk.b1];
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]) < 1e-12) {
      if (o[k] < lo[k] || o[k] > hi[k]) return null;
      continue;
    }
    let t1 = (lo[k] - o[k]) / d[k];
    let t2 = (hi[k] - o[k]) / d[k];
    let s = -1;
    if (t1 > t2) {
      [t1, t2] = [t2, t1];
      s = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      axis = k;
      sign = s;
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  return axis < 0 ? null : [tmin, axis, sign];
}
/** Is point p (a, y, b) in the shadow of any landed block? */
function inShadow(p, list) {
  for (const bk of list) if (hitBox(bk, SUN, 0, p)) return true;
  return false;
}

// ---------- the power lines ----------
// Found in the photo itself: a dark thin line against the sky is a wire.
// Each one is followed from a seed point and fitted with a parabola (a
// hanging wire is very close to one), so the pulses run exactly on it.
async function traceWires() {
  const { data, info } = await sharp(join(ROOT, PHOTO)).greyscale().raw().toBuffer({ resolveWithObject: true });
  const SW = info.width;
  const SH = info.height;
  const g = (x, y) => data[clamp(y, 0, SH - 1) * SW + clamp(x, 0, SW - 1)];
  const dark = (x, y) => {
    let s = 0;
    for (const d of [5, 6, 7, 8, 9]) s += g(x, y - d) + g(x, y + d);
    return s / 10 - g(x, y);
  };
  const fit = (pts, deg) => {
    const xm = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const n = deg + 1;
    const A = Array.from({ length: n }, () => new Array(n + 1).fill(0));
    for (const [x, y] of pts) {
      const u = (x - xm) / 1000;
      const pw = [1, u, u * u];
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) A[i][j] += pw[i] * pw[j];
        A[i][n] += pw[i] * y;
      }
    }
    for (let i = 0; i < n; i++)
      for (let r = 0; r < n; r++)
        if (r !== i) {
          const f = A[r][i] / A[i][i];
          for (let c = i; c <= n; c++) A[r][c] -= f * A[i][c];
        }
    const c = A.map((row, i) => row[n] / row[i]);
    return (x) => {
      const u = (x - xm) / 1000;
      return c[0] + c[1] * u + (deg > 1 ? c[2] * u * u : 0);
    };
  };
  const trace = (x0, y0, dir, xEnd) => {
    const pts = [[x0, y0]];
    let miss = 0;
    for (let x = x0 + dir; dir > 0 ? x < xEnd : x > xEnd; x += dir) {
      const recent = pts.slice(-80);
      const yp = recent.length > 10 ? fit(recent, 1)(x) : pts[pts.length - 1][1];
      let best = -1;
      let bv = -1e9;
      for (let y = Math.round(yp) - 2; y <= Math.round(yp) + 2; y++) {
        const v = dark(x, y);
        if (v > bv) {
          bv = v;
          best = y;
        }
      }
      if (bv > 6) {
        pts.push([x, best]);
        miss = 0;
      } else if (++miss > 200) break;
    }
    return pts;
  };
  const wires = [];
  // Seeds: where each wire crosses x 1300 (right of the pylon) and x 880
  // (left of it), in source pixels. The tip is where it meets the pylon's arm.
  const RIGHT = [
    [227, 1150],
    [281, 1110],
    [358, 1215],
    [437, 1128],
    [493, 1222],
    [595, 1142],
    [627, 1232],
  ];
  for (const [y, tip] of RIGHT) {
    const pts = [...trace(1300, y, -1, 1150).reverse(), ...trace(1300, y, 1, 2000)];
    wires.push({ f: fit(pts, 2), from: 2000, to: tip, far: 0 });
  }
  const LEFT = [
    [421, 945],
    [544, 945],
    [661, 945],
  ];
  for (const [y, tip] of LEFT) {
    const pts = [...trace(880, y, -1, 0).reverse(), ...trace(880, y, 1, 940)];
    wires.push({ f: fit(pts, 2), from: 0, to: tip, far: 1 });
  }
  // As frame-pixel polylines from the far end to the pylon, one point per pixel.
  return wires.map((w) => {
    const pts = [];
    const dir = w.to > w.from ? 1 : -1;
    for (let x = w.from; dir > 0 ? x <= w.to : x >= w.to; x += dir / S) {
      const u = toU(x);
      if (u < -10 || u > W + 10) continue;
      pts.push([u, w.f(x) * S]);
    }
    return { pts, far: w.far };
  });
}

// ---------- the field's far edge ----------
/** For each frame column, the row where the rice ends and the trees begin.
 *  Rice is much greener than it is blue (green minus blue about 0.3); the
 *  trees (about 0.1) and the sky (about 0) aren't, so look down from the sky
 *  for the first few rice pixels in a row. */
function fieldEdge(plate) {
  const edge = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    let y = Math.round(YH - 80);
    let run = 0;
    for (; y < H * 0.8; y++) {
      const i = (y * W + x) * 3;
      const rice = (plate[i + 1] - plate[i + 2]) / 255 > 0.19;
      run = rice ? run + 1 : 0;
      if (run >= 4) break;
    }
    edge[x] = y - 3;
  }
  // Smooth it a little: single tall stalks shouldn't count.
  const out = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    let s = 0;
    let n = 0;
    for (let k = -6; k <= 6; k++) {
      const xx = clamp(x + k, 0, W - 1);
      s += edge[xx];
      n++;
    }
    out[x] = s / n;
  }
  return out;
}

// ---------- frames ----------
mkdirSync(OUT, { recursive: true });
freshTmp(TMP);
const plate = await loadPlate({ photo: PHOTO, cropX: CROP_X, tmp: TMP });
const CLEAN = plateImage(plate);
const EDGE = fieldEdge(plate);
// What in the photo stands in front of far blocks: anything above the field
// that isn't sky (trees, roofs, the pylon, the wires), about as far away as
// the field's far edge in that column.
const OCC = new Uint8Array(W * H);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    if (y >= EDGE[x]) continue;
    const i = (y * W + x) * 3;
    const r = plate[i] / 255;
    const g = plate[i + 1] / 255;
    const b = plate[i + 2] / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (!(b >= g - 0.03 && l > 0.42)) OCC[y * W + x] = 1;
  }
const WIRES = await traceWires();

// The rice dries out from the compound outward. Not elemental-scene's
// sicknessFront: its dithered edge makes a checker of big cells; this front
// has a ragged hard edge, and the kit's fine dot screen runs along it.
const ORIGIN = project(14, 0, 54);
const SICK_CELL = 12;
// It reaches about 60% of the field by the end and is still spreading at
// the hold: the near rice, the path and the bottom-left corner stay green,
// so dead sits next to alive. (Centred a little right of the compound and
// shorter to the left, so the path is the last to go.)
const SICK_O = [ORIGIN[0] + 60, ORIGIN[1]];
function front(cx, cy, s) {
  if (s <= 0) return 0;
  const x = cx * SICK_CELL + SICK_CELL / 2;
  const y = cy * SICK_CELL + SICK_CELL / 2;
  const d = Math.hypot((x - SICK_O[0]) / (x < SICK_O[0] ? 610 : 900), (y - SICK_O[1]) / 455);
  return s * 1.08 - d - 0.1 + 0.32 * (fbm(x * 0.006, y * 0.014, 44, 3) - 0.5) > 0 ? 1 : 0;
}
// Only the field goes sick; the sky, trees and pylon stay the photo.
const inField = (x, y) => y >= EDGE[clamp(Math.floor(x), 0, W - 1)] + 2;
// Dried rice keeps the photo's light: straw where it was bright, brown where dark.
const dried = (l, r, g, b, x, y) => (inField(x, y) ? [0.2 + l * 0.95, 0.16 + l * 0.8, 0.05 + l * 0.28] : null);
const DEAD = [TONES.dead[1], TONES.dead[2], TONES.dead[3], TONES.dead[3]];

// ---------- what each block looks like ----------
const VIOLET = PX.violet;
const LILAC = PX.lilac;
const LIT = hex("#ebe7de"); // the long sides, turned to the sun: the cleanest grey
const FRONT = PX.ashLight; // the end walls facing us
const SEAM = PX.plastic[0];
const MID = PX.plastic[1];
const DARK = PX.plastic[3];
const STRENGTH = [1, 0.55, 0.8, 0.4]; // slide 2's Aether pixels: uneven strengths
/** Which way a face looks: 0 at us, 1 left (into the sun), 2 up, 3 into shade. */
function faceOf(axis, sign) {
  if (axis === 2 && sign < 0) return 0;
  if (axis === 0 && sign < 0) return 1;
  if (axis === 1 && sign > 0) return 2;
  return 3;
}
/**
 * What a cell of block bk shows at (a, y, b) on face `face`: a flat poster
 * colour, "dot" (the dot-matrix shade), "led" (a server light's slot) or
 * "lamp". fp is a cell's size in metres there, for one-cell-wide lines.
 */
function surface(bk, face, a, y, b, cx, cy, t, fp) {
  if (face === 3) return "dot";
  if (face === 2) return MID;
  const yy = y - bk.y0;
  const h = bk.y1 - bk.y0;
  const half = fp / 2;
  const along = face === 0 ? a - (bk.ha0 ?? bk.a0) : b - bk.b0;
  const base = face === 0 ? FRONT : LIT;
  switch (bk.kind) {
    case "hall": {
      const hw = (bk.ha1 ?? bk.a1) - (bk.ha0 ?? bk.a0);
      if (yy < 0.8) return PX.ash;
      if (yy > h - Math.max(0.35, fp)) return PX.white;
      if (yy > 5.6 && yy < 7.8) {
        if (face === 0) {
          // Exhaust fans: a checker that flips every other frame, so it turns.
          const k = Math.round((along - 2) / 1.75);
          if (k >= 0 && 2 + k * 1.75 < hw - 1.4 && Math.abs(along - (2 + k * 1.75)) < 0.62 && Math.abs(yy - 6.7) < 0.62)
            return (cx + cy + Math.floor(t * 12)) % 2 ? PX.ink : MID;
          return PX.ash;
        }
        // Louvres along the long side, in sections.
        if ((Math.floor(b / 6) + bk.hall) % 2 === 0) return cy % 2 ? PX.ink : PX.ash;
      }
      // Rows of server lights in dark slots, the length of the wall.
      // (Above the generators' 2.9 m, so you can see them.)
      const end = face === 0 ? hw - 3.5 : bk.b1 - bk.b0 - 1;
      for (const ry of [3.5, 4.5]) if (Math.abs(yy - ry) < Math.max(fp, 0.22) && along > 0.8 && along < end) return "led";
      if (face === 0 && along > hw - 3 && along < hw - 1.6 && yy < 2.3) return PX.ink;
      if (face === 1 && bk.front && b > bk.b0 + 3 && b < bk.b0 + 7.5 && yy < 4.6) return cy % 2 ? MID : DARK;
      // A seam every 3 m, so you can read the size.
      const m = ((along % 3) + 3) % 3;
      return m < half || m > 3 - half ? SEAM : base;
    }
    case "roofUnit":
      return yy > 0.5 && yy < h - 0.4 ? (cy % 2 ? DARK : MID) : face === 0 ? SEAM : LIT;
    case "genset":
      if (face === 0 && along < 2.6 && yy > 0.5 && yy < 2.4) return cy % 2 ? PX.ink : MID;
      return face === 0 ? PX.plastic[2] : LIT;
    case "transformer":
      // Radiator fins.
      return yy > 0.4 && yy < h - 0.5 && cx % 2 ? PX.ink : face === 0 ? PX.ash : MID;
    case "lamp":
      return "lamp";
    case "stack":
      return face === 0 ? MID : SEAM;
    default:
      return face === 0 ? PX.ash : MID; // steel and fence posts
  }
}

// ---------- events for the sound ----------
const events = [];
blocks.forEach((bk) => events.push({ t: bk.landT, x: bk.x, type: bk.kind, far: !!bk.far }));
events.push({ t: connectT, x: project(GANTRY.a0, GANTRY.top, GANTRY.b)[0] / W, type: "connect" });

// Pulses along the wires: more and more of them once the line is connected.
const pulses = [];
{
  let k = 0;
  for (let t = connectT - 0.6; t < duration; k++) {
    const lv = clamp((t - connectT + 0.6) / (duration - connectT));
    t += 0.3 / (1 + 14 * lv) + 0.1 * hash(k, 1, 77);
    const wi = Math.floor(hash(k, 2, 77) * WIRES.length);
    const w = WIRES[wi];
    const len = w.pts.length;
    const speed = 900 + 500 * hash(k, 3, 77); // pixels per second
    const arrive = t + len / speed;
    pulses.push({ wi, t0: t, speed, arrive, k });
    // Only some arrivals crackle, or the sound turns to noise.
    if (arrive < duration && hash(k, 4, 77) < 0.22) events.push({ t: arrive, x: w.pts[len - 1][0] / W, type: "zap" });
  }
}
// The new line from the pylon's lower right arm down to the gantry.
const ARM = [toU(1232), 630 * S];
const GANTRY_TOP = project((GANTRY.a0 + GANTRY.a1) / 2, GANTRY.top - 0.3, GANTRY.b);
function dropLine(p, off) {
  // A hanging wire: straight between its ends, sagging most in the middle.
  const x = mix(ARM[0], GANTRY_TOP[0], p);
  const y = mix(ARM[1] + off, GANTRY_TOP[1] + off * 0.6, p) + 26 * 4 * p * (1 - p);
  return [x, y];
}
const lightsOnT = timeOf(0.7);
events.push({ t: lightsOnT, x: 0.5, type: "lights" });

/** Checker cells (G px) along a stretch of polyline pts, from index i0 to i1. */
function checkerRun(img, pts, i0, i1, colourOf, G = 12) {
  let last = "";
  for (let i = Math.max(0, Math.floor(i0)); i < Math.min(pts.length, i1); i += 2) {
    const [u, v] = pts[i];
    const X = Math.floor(u / G);
    const Y = Math.floor(v / G);
    const key = `${X},${Y}`;
    if (key === last) continue;
    last = key;
    const c = colourOf((i - i0) / Math.max(1, i1 - i0), X, Y);
    if (!c) continue;
    // A checker: every other cell steps up a row, like the poster's sparks.
    rect(img, X * G, (Y - ((X + Y) & 1)) * G, G, c);
  }
}

// ---------- the violet plume ----------
// Once it draws power, violet energy pours up out of the roof vents: two
// columns that rise from the cooling units, sway, drift left with the wind
// and widen as they thin, like the poster's smoke and sparks. One model
// drives the aura (glow), the heat (dither), the sparks and the shapes.
const VENTS = [project(8, HALL_H + 2.4, 56), project(16, HALL_H + 2.4, 56)];
const WIND = -150; // px of drift at the top of the column
const plumeOf = (power) => ({ rise: 500 * (0.25 + 0.75 * power) });
/** Column i's centre at height h (0 at the vent, 1 at the top). */
const plumeX = (i, h) => VENTS[i][0] + 40 * Math.sin(h * 2.2 + i * 1.7) + WIND * h;
const plumeW = (h) => 34 + 130 * h;
/** How thick the plume is at (x, y): 0..1. */
function plume(x, y, t, power) {
  if (power <= 0) return 0;
  const { rise } = plumeOf(power);
  let best = 0;
  for (let i = 0; i < VENTS.length; i++) {
    const h = (VENTS[i][1] - y) / rise;
    if (h < -0.05 || h > 1) continue;
    const d = Math.abs(x - plumeX(i, Math.max(h, 0))) / plumeW(Math.max(h, 0));
    if (d >= 1) continue;
    const v = (1 - d * d) * Math.pow(1 - Math.max(h, 0), 0.6) * (0.45 + 0.55 * fbm(x * 0.012, (y + 110 * t) * 0.018, 9 + i, 2));
    best = Math.max(best, v * (h < 0 ? 1 + h * 20 : 1));
  }
  return best * power;
}

const frames = ONLY ? [...ONLY].filter((f) => f < N) : [...Array(N).keys()];
for (const f of frames) {
  const t = f / FPS;
  const s = levelAt(f);
  const img = Float32Array.from(CLEAN);
  /** A cell of the 4px grid filled with one colour. */
  const cellFill = (cx, cy, c, a = 1) => rect(img, cx * C, cy * C, C, c, a);
  const power = smooth(0, 1, (t - connectT) / 2.5); // how hard the compound draws
  const powered = t > connectT;
  const lightsOn = t > lightsOnT;

  // --- the rice dries out from the compound outward ---
  // The dead tones, one step up: the rice is darker than the poster's
  // river, so the straight ramp would turn most of it near-black.
  spreadSickness(img, { front, s, cell: SICK_CELL, tint: dried, tones: DEAD, density: 0.34, hi: PX.mustard, lo: TONES.dead[0], t, drift: [-6, 0], region: inField });

  // Blocks that are here or on their way down, and how high they still are.
  const live = [];
  blocks.forEach((bk, bi) => {
    if (t < bk.landT - bk.fallT) return;
    const p = clamp((bk.landT - t) / bk.fallT);
    const dy = bk.drop * p * p;
    let u0 = 1e9;
    let u1 = -1e9;
    let v0 = 1e9;
    let v1 = -1e9;
    for (const a of [bk.a0, bk.a1])
      for (const y of [bk.y0 + dy, bk.y1 + dy])
        for (const b of [bk.b0, bk.b1]) {
          const [u, v] = project(a, y, b);
          u0 = Math.min(u0, u);
          u1 = Math.max(u1, u);
          v0 = Math.min(v0, v);
          v1 = Math.max(v1, v);
        }
    // q: how solid it is yet. It comes in as scattered pixels and is solid
    // when it lands, like it's being put together out of pixels.
    live.push({ bk, bi, dy, q: 1 - p, landed: dy === 0, box: [u0 - 2, u1 + 2, v0 - 2, v1 + 2] });
  });
  const landed = live.filter((l) => l.landed).map((l) => l.bk);

  // --- the site: cleared ground as a dark dot-matrix pad, shadows at the feet ---
  for (let cy = Math.ceil(YH / C); cy < GH; cy++)
    for (let cx = 0; cx < GW; cx++) {
      const u = cx * C + C / 2;
      const v = cy * C + C / 2;
      if (v < EDGE[Math.floor(u)] + 1) continue;
      const d = ray(u, v);
      const tg = HC / -d[1];
      const a = d[0] * tg;
      const b = d[2] * tg;
      if (b < 30 || b > 125 || a < -40 || a > 75) continue;
      const clearAt = 0.015 + 0.2 * Math.hypot((a - 15) / 34, (b - 78) / 36) + 0.06 * (fbm(a * 0.25, b * 0.25, 5, 2) - 0.5);
      const inSite = a > -30 && a < 62 && b > FENCE_B - 1.5 && b < 118;
      const pad = inSite && s > clearAt && clamp((s - clearAt) / 0.05) > bayer(cx, cy) * 0.999;
      let shade = 0;
      if (landed.length) {
        if (inShadow([a, 0.02, b], landed)) shade = 0.4;
        let near = 9;
        for (const bk of landed) {
          if (bk.y0 > 0.5) continue;
          const da = Math.max(bk.a0 - a, 0, a - bk.a1);
          const db = Math.max(bk.b0 - b, 0, b - bk.b1);
          near = Math.min(near, Math.hypot(da, db));
        }
        if (near < 3) shade = Math.max(shade, 0.55 * (1 - near / 3));
      }
      if (!pad && !shade) continue;
      for (let y = cy * C; y < Math.min(H, cy * C + C); y++)
        for (let x = cx * C; x < cx * C + C; x++) {
          if (pad) dotMatrix(img, x, y, 0.92);
          if (shade) put(img, x, y, [0.05, 0.05, 0.04], shade);
        }
    }

  // --- which face of which block each 4px cell sees ---
  const cellBk = new Int16Array(GW * GH).fill(-1);
  const cellFace = new Uint8Array(GW * GH);
  const cellLanded = new Uint8Array(GW * GH);
  const cellOut = new Array(GW * GH);
  if (live.length) {
    let U0 = 1e9;
    let U1 = -1e9;
    let V0 = 1e9;
    let V1 = -1e9;
    for (const l of live) {
      U0 = Math.min(U0, l.box[0]);
      U1 = Math.max(U1, l.box[1]);
      V0 = Math.min(V0, l.box[2]);
      V1 = Math.max(V1, l.box[3]);
    }
    for (let cy = Math.max(0, Math.floor(V0 / C)); cy <= Math.min(GH - 1, Math.floor(V1 / C)); cy++)
      for (let cx = Math.max(0, Math.floor(U0 / C)); cx <= Math.min(GW - 1, Math.floor(U1 / C)); cx++) {
        const u = cx * C + C / 2;
        const v = cy * C + C / 2;
        const d = ray(u, v);
        let best = null;
        for (const l of live) {
          if (u < l.box[0] || u > l.box[1] || v < l.box[2] || v > l.box[3]) continue;
          if (!l.landed && (bayer(cx, cy) + hash(cx, cy, l.bk.seed)) / 2 > Math.pow(l.q, 0.6)) continue;
          const h = hitBox(l.bk, d, l.dy);
          if (h && (!best || h[0] < best.h[0])) best = { h, l };
        }
        if (!best) continue;
        if (best.l.bk.far && OCC[Math.min(H - 1, Math.floor(v)) * W + Math.floor(u)]) continue; // behind the trees
        const [th, axis, sign] = best.h;
        const { bk, dy } = best.l;
        const a = d[0] * th;
        const y = HC + d[1] * th;
        const b = d[2] * th;
        let face = faceOf(axis, sign);
        // A sunny face in another block's shadow is in shade too.
        if ((face === 0 || face === 1) && best.l.landed) {
          const p = [a + (axis === 0 ? sign * 0.01 : 0), y, b + (axis === 2 ? sign * 0.01 : 0)];
          if (inShadow(p, landed.filter((o) => o !== bk))) face = 3;
        }
        const ci = cy * GW + cx;
        cellBk[ci] = best.l.bi;
        cellFace[ci] = face;
        cellLanded[ci] = best.l.landed ? 1 : 0;
        cellOut[ci] = surface(bk, face, a, y - dy, b, cx, cy, t, (C * depthOf(a, b)) / F);
      }
  }

  // --- the violet glow around it, once it draws power ---
  if (power > 0) {
    let bx = [1e9, 1e9, -1e9, -1e9];
    const cells = [];
    for (let ci = 0; ci < GW * GH; ci++) {
      if (cellBk[ci] < 0 || !cellLanded[ci] || blocks[cellBk[ci]].far) continue;
      const cx = ci % GW;
      const cy = Math.floor(ci / GW);
      cells.push([cx, cy]);
      bx = [Math.min(bx[0], cx * C), Math.min(bx[1], cy * C), Math.max(bx[2], cx * C + C), Math.max(bx[3], cy * C + C)];
    }
    const a = power * (0.88 + 0.12 * Math.sin(t * 2.6));
    const rise = plumeOf(power).rise;
    const top = Math.min(...VENTS.map((v) => v[1])) - rise;
    // Normal blend, not screen: violet only shows on a bright sky as a tint.
    // Every pixel painted: the blur averages, so gaps would thin it out.
    if (cells.length)
      await glow(img, [Math.min(bx[0], VENTS[0][0] + WIND - 200), top, bx[2], bx[3]], 50, (paint) => {
        for (const [cx, cy] of cells) for (let k = 0; k < C * C; k++) paint(cx * C + (k % C), cy * C + Math.floor(k / C), VIOLET, a);
        // A band of light over the whole roofline, where the heat comes off.
        for (let y = bx[1] - 100; y < bx[1] + 20; y++)
          for (let x = bx[0] + 30; x < bx[2] - 30; x++) paint(x, y, VIOLET, a * 0.7 * clamp((y - (bx[1] - 100)) / 100));
        // And the plume itself, rising.
        for (let y = Math.floor(top); y < bx[1] + 10; y++)
          for (let x = Math.floor(VENTS[0][0] + WIND - 220); x < VENTS[1][0] + 200; x++) {
            const v = plume(x, y, t, power);
            if (v > 0.02) paint(x, y, VIOLET, Math.min(1, 1.6 * v));
          }
      }, { fixed: VIOLET });
    // Hot lilac cores right over the vents.
    await glow(img, [VENTS[0][0] - 60, VENTS[0][1] - 60, VENTS[1][0] + 60, VENTS[1][1] + 10], 16, (paint) => {
      for (const [u, v] of VENTS)
        for (let y = v - 40; y < v; y++) for (let x = u - 36; x < u + 36; x++) if (Math.hypot((x - u) / 36, (y - v + 14) / 26) < 1) paint(x, y, LILAC, 0.6 * power);
    }, { mode: "screen", fixed: LILAC });
  }
  // A soft violet line along every wire, and under each pulse.
  const energy = smooth(0, 1, (t - connectT + 0.4) / (duration - connectT - 1.5));
  // (Painted 3px thick: a 1px line blurred this much would vanish.)
  const line = (paint, u, v, a) => {
    for (let k = -1; k <= 1; k++) paint(u, v + k, VIOLET, a);
  };
  if (t > connectT - 0.6)
    await glow(img, [0, 0, W, YH + 40], 4, (paint) => {
      WIRES.forEach((w) => {
        for (let i = 0; i < w.pts.length; i++) line(paint, w.pts[i][0], w.pts[i][1], 0.85 * energy * (w.far ? 0.7 : 1));
      });
      for (const p of pulses) {
        if (t < p.t0 || t > p.arrive) continue;
        const w = WIRES[p.wi];
        const head = (t - p.t0) * p.speed;
        for (let i = Math.max(0, Math.floor(head - 150)); i < Math.min(w.pts.length, head); i++) line(paint, w.pts[i][0], w.pts[i][1], 1 - (head - i) / 150);
      }
    }, { fixed: VIOLET });

  // --- the blocks, cell by cell, with ink edges ---
  const STEP = Math.floor(t * 5);
  for (let ci = 0; ci < GW * GH; ci++) {
    const bi = cellBk[ci];
    if (bi < 0) continue;
    const cx = ci % GW;
    const cy = Math.floor(ci / GW);
    if (cellLanded[ci]) {
      const id = bi * 8 + cellFace[ci];
      const nb = [cx > 0 ? ci - 1 : -1, cx < GW - 1 ? ci + 1 : -1, cy > 0 ? ci - GW : -1, cy < GH - 1 ? ci + GW : -1];
      if (nb.some((n) => n < 0 || cellBk[n] < 0 || cellBk[n] * 8 + cellFace[n] !== id)) {
        cellFill(cx, cy, PX.ink);
        continue;
      }
    }
    const out = cellOut[ci];
    if (out === "dot") {
      for (let y = cy * C; y < Math.min(H, cy * C + C); y++) for (let x = cx * C; x < cx * C + C; x++) dotMatrix(img, x, y, 0.95);
    } else if (out === "led") {
      cellFill(cx, cy, PX.ink);
      // Every other cell is a light; each flickers at its own pace.
      if (powered && cx % 2 === 0) {
        const on = hash(cx, cy + 13 * Math.floor(STEP + hash(cx, cy, 3) * 5), 41) > 0.22;
        const k = STRENGTH[Math.floor(hash(cx, cy, 42) * 4)];
        if (on) cellFill(cx, cy, hash(cx, cy, 43) < 0.35 ? LILAC : VIOLET, k * smooth(0, 0.6, power + 0.2));
      }
    } else if (out === "lamp") {
      cellFill(cx, cy, lightsOn ? PX.white : PX.ash);
    } else cellFill(cx, cy, out);
  }

  // --- the fence: posts (blocks above), rails and a sparse ink mesh ---
  {
    const up = fencePosts.filter((p) => t >= timeOf(p.at));
    if (up.length > 1) {
      const aMax = up[up.length - 1].a;
      for (let cy = Math.floor((YH - 120) / C); cy < Math.ceil((YH + 90) / C); cy++)
        for (let cx = 0; cx < GW; cx++) {
          const d = ray(cx * C + C / 2, cy * C + C / 2);
          const th = FENCE_B / d[2];
          const a = d[0] * th;
          const y = HC + d[1] * th;
          if (a < FENCE_A[0] || a > aMax || y < 0 || y > FENCE_H) continue;
          if (a > -2.2 && a < 1.6) continue; // the gate, where the path was
          const fp = (C * depthOf(a, FENCE_B)) / F;
          if (y > FENCE_H - fp || Math.abs(y - 1.15) < fp / 2) cellFill(cx, cy, PX.ink);
          else if ((cx + cy) % 3 === 0) cellFill(cx, cy, PX.ink, 0.4);
        }
    }
  }

  // --- heat: the plume as an ordered dither, violet low down, lilac as it
  // rises and thins, like the poster's smoke; then flat violet shapes in it
  // and a column of checker sparks riding it, like the poster's fire ---
  if (power > 0) {
    const roof = new Float32Array(W).fill(-1);
    let rx0 = W;
    let rx1 = 0;
    for (let cx = 0; cx < GW; cx++)
      for (let cy = 0; cy < GH; cy++) {
        const bi = cellBk[cy * GW + cx];
        if (bi < 0 || !cellLanded[cy * GW + cx]) continue;
        const k = blocks[bi].kind;
        if (blocks[bi].far || (k !== "hall" && k !== "roofUnit" && k !== "stack")) continue;
        for (let x = cx * C; x < cx * C + C; x++) roof[x] = cy * C;
        rx0 = Math.min(rx0, cx * C);
        rx1 = Math.max(rx1, cx * C + C);
        break;
      }
    const { rise } = plumeOf(power);
    const vTop = Math.min(...VENTS.map((v) => v[1]));
    const field = (x, y) => {
      // The heat off the whole roofline, low; and the two columns.
      const r = roof[clamp(Math.floor(x), 0, W - 1)];
      const band = r < 0 ? 0 : clamp(1 - (r - y) / 130) * (r - y > 0 ? 1 : 0) * 0.55 * power * (0.4 + 0.6 * fbm(x * 0.016, (y + 80 * t) * 0.022, 8, 2));
      return Math.max(band, plume(x, y, t, power));
    };
    dither(img, field, {
      box: [Math.min(rx0, VENTS[0][0] + WIND - 220), vTop - rise, Math.max(rx1, VENTS[1][0] + 200), vTop + 40],
      cell: 8,
      tones: TONES.aether,
      cut: 0.75,
      gain: 3,
      spread: 1.1,
      // Violet where it's thick and low, lilac as it rises and thins.
      toneIndex: (x, y, d) => {
        const h = (vTop - y) / rise;
        return h < 0.3 ? (d > 1.1 ? 1 : 2) : h < 0.65 ? (d > 0.9 ? 2 : 3) : 3;
      },
      a: 0.95,
    });
    // Flat violet stepped shapes in the heat, like the poster's flat red.
    if (power > 0.55) flatShape(img, plumeX(0, 0.3) + 8, VENTS[0][1] - 0.3 * rise + 6 * Math.sin(t * 1.3), 26, 46, 14, VIOLET, 91);
    if (power > 0.8) flatShape(img, plumeX(1, 0.5) - 6, VENTS[1][1] - 0.5 * rise + 5 * Math.sin(t * 1.1 + 1), 16, 34, 12, VIOLET, 92);
    // Sparks: lilac, violet and white checker rising in each column (the
    // kit's fire() spark pattern) and drifting with the wind.
    const c2 = 12;
    for (let i = 0; i < VENTS.length; i++)
      for (let id = 0; id < 1; id += 0.025) {
        const sp = (id + t * 0.32 + i * 0.37) % 1.02;
        const px = plumeX(i, sp);
        const py = VENTS[i][1] - sp * rise;
        const gen = Math.floor(id * 100 + t * 0.32 + i * 0.37 - sp);
        for (let k = 0; k < 4; k++) {
          const r = (j) => hash(k + gen * 5, Math.round(id * 999) + i * 7, j);
          if (sp > power * 1.1 - 0.1 || r(64) > 0.5 - sp * 0.25) continue;
          const x = Math.round((px + (r(65) - 0.5) * (60 + 150 * sp)) / c2) * c2;
          const y = Math.round((py + (r(66) - 0.5) * 30) / c2) * c2;
          rect(img, x, y, c2, r(67) < 0.45 ? LILAC : r(67) < 0.8 ? VIOLET : PX.white);
          if (r(68) < 0.6) rect(img, x + c2, y + c2, c2, r(70) < 0.5 ? PX.white : LILAC);
          if (r(69) < 0.3) rect(img, x - c2, y + c2, c2, VIOLET);
        }
      }
  }

  // --- the power lines light up ---
  if (t > connectT - 0.6) {
    // Scattered violet and lilac pixels along every wire, at uneven
    // strengths, like slide 2's Aether: the charge you can't see.
    WIRES.forEach((w, wi) => {
      for (let i = 0; i < w.pts.length; i += 22) {
        if (hash(i, Math.floor(t * 8) + wi * 31, 51) > 0.15 + 0.5 * energy) continue;
        const [u, v] = w.pts[i];
        const k = STRENGTH[Math.floor(hash(i, wi, 52) * 4)] * (w.far ? 0.75 : 1);
        rect(img, Math.floor(u / 4) * 4, Math.floor(v / 4) * 4, 4, hash(i, wi, 53) < 0.35 ? LILAC : VIOLET, k);
      }
    });
    // Pulses: a checker run, lilac at the head, violet behind, thinning out.
    for (const p of pulses) {
      if (t < p.t0 || t > p.arrive + 0.05) continue;
      const w = WIRES[p.wi];
      const head = (t - p.t0) * p.speed;
      checkerRun(img, w.pts, head - 150, head, (q, X, Y) => (q < 0.35 && 1 - q / 0.35 > bayer(X, Y) ? null : q > 0.94 ? PX.white : q > 0.72 ? LILAC : VIOLET));
      // A burst of white and lilac checker where it reaches the pylon.
      if (t > p.arrive - 0.06 && hash(p.k, 9, 77) < 0.5) {
        const [u, v] = w.pts[w.pts.length - 1];
        for (let k = 0; k < 5; k++) {
          const X = Math.round((u + (hash(p.k, k, 78) - 0.5) * 36) / 8) * 8;
          const Y = Math.round((v + (hash(p.k, k, 79) - 0.5) * 36) / 8) * 8;
          rect(img, X, Y, 8, k % 2 ? LILAC : PX.white);
          if (hash(p.k, k, 80) < 0.6) rect(img, X + 8, Y + 8, 8, PX.white);
        }
      }
    }
  }
  // The new line, strung from the pylon to the gantry once it stands.
  if (t > connectT - 0.35) {
    const reach = clamp((t - (connectT - 0.35)) / 0.35);
    for (const off of [0, 5])
      for (let i = 0; i <= 400 * reach; i++) {
        const [x, y] = dropLine(i / 400, off);
        put(img, x, y, PX.ink, 0.8);
        put(img, x, y + 1, PX.ink, 0.5);
      }
    if (t > connectT) {
      // Pulses running down it into the compound, on the 4px grid.
      for (let k = 0; k < 40; k++) {
        const t0 = connectT + k * (0.55 - 0.3 * clamp(k / 20));
        const q = (t - t0) / 0.35;
        if (q < 0 || q > 1.2) continue;
        for (let j = 0; j < 8; j++) {
          const pp = q - j * 0.025;
          if (pp < 0 || pp > 1) continue;
          const [x, y] = dropLine(pp, 2);
          rect(img, Math.floor(x / 4) * 4, Math.floor(y / 4) * 4 - ((Math.floor(x / 4) & 1) * 4), 4, j < 2 ? LILAC : VIOLET);
        }
      }
    }
  }

  // --- warning lights on the roof corners, blinking red ---
  if (powered)
    for (const [a, b] of [
      [4, 52],
      [22, 52],
      [27, 55],
    ]) {
      const [u, v] = project(a, HALL_H + 0.2, b);
      if (Math.sin(t * 3.4 + a) > 0.2) rect(img, Math.floor(u / C) * C, Math.floor(v / C) * C - C, C, PX.flatRed);
    }
  // Floodlights: a white lamp with a small cream cross of light.
  if (lightsOn)
    for (const p of POLES) {
      const [u, v] = project(p.a, p.h - 0.25, p.b - 0.3);
      const X = Math.floor(u / C) * C;
      const Y = Math.floor(v / C) * C;
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, 1],
        [0, 2],
      ])
        rect(img, X + dx * C, Y + dy * C, C, PX.cream, 0.6);
    }

  // --- dust where big blocks land: a pale ordered dither rolling out ---
  for (const bk of blocks) {
    const age = t - bk.landT;
    if (age < 0 || age > 0.8 || bk.small || bk.far) continue;
    const big = bk.kind === "hall" ? 1 : 0.55;
    const [uL, vB] = project(bk.a0, 0, bk.b0);
    const [uR] = project(bk.a1, 0, bk.b0);
    const grow = 1 - Math.pow(1 - age / 0.8, 2);
    const rx = (uR - uL) / 2 + 70 * big * grow;
    const ry = 18 + 50 * big * grow;
    const uc = (uL + uR) / 2;
    const vc = vB - ry * 0.35;
    dither(
      img,
      (x, y) => clamp(1 - Math.hypot((x - uc) / rx, (y - vc) / ry)) * (1 - age / 0.8) * (0.5 + 0.5 * fbm(x * 0.03, y * 0.05 - age * 2, bk.seed % 97, 2)),
      { box: [uc - rx, vc - ry, uc + rx, vB + 8], cell: 8, tones: TONES.smoke, cut: 0.7, gain: 2.6, toneIndex: (x, y, d) => (d > 0.6 ? 2 : 3) },
    );
  }

  if (ONLY) {
    const out = Buffer.alloc(W * H * 3);
    for (let i = 0; i < out.length; i++) out[i] = Math.round(clamp(img[i]) * 255);
    await sharp(out, { raw: { width: W, height: H, channels: 3 } })
      .png()
      .toFile(join(OUT, `still-${String(f).padStart(4, "0")}.png`));
    console.log(`frame ${f} level ${s.toFixed(2)}`);
    continue;
  }
  await writeFrame(img, f, TMP, WIDTH);
  process.stdout.write(`\rframe ${f + 1}/${N}`);
}
if (ONLY) process.exit(0);
process.stdout.write("\n");

// ---------- sound and encode ----------
events.sort((p, q) => p.t - q.t);
const eventsPath = join(OUT, "aether-events.json");
writeFileSync(eventsPath, JSON.stringify({ fps: FPS, duration, buildStart, buildEnd, ease, connect: connectT, fans: fanStart, lights: lightsOnT, events }, null, 1));
const wav = join(TMP, "aether.wav");
execFileSync("python3", [join(ROOT, "scripts/render-elemental-aether-sound.py"), eventsPath, wav, ...(AMBIENCE ? ["--ambience", AMBIENCE] : [])], { stdio: "inherit" });
const mp4 = join(OUT, "elemental-aether.mp4");
const gif = join(OUT, "elemental-aether.gif");
// crf 25: the film grain makes every frame busy; 25 keeps the grain and
// stays well under Instagram's comfortable size. 26 smears it.
encode({ tmp: TMP, fps: FPS, wav, mp4, gif, crf: 25 });
console.log(`✅ ${mp4}\n✅ ${gif}`);
