#!/usr/bin/env node
/**
 * Elemental, Air on its own: a clear mountain valley on a summer day, then
 * factories go up one by one across it and start to pour smoke. The plumes
 * rise, bend with the wind and run together into a band of smog over the
 * valley that thickens and climbs until it has swallowed the far hills and
 * the mountains. Under it the land goes sick; above it the sky stays blue.
 *
 *   node scripts/render-elemental-air.mjs --out <dir> [--fps 24] [--width 1080]
 *        [--ambience <wind wav>] [--factory <wav>] [--birds <wav>] [--crf 25]
 *   For working on it: --only 0,120,263 renders just those frames as PNGs
 *   (no video).
 *
 * Drawn in the key poster's pixel look (scripts/elemental-pixel-kit.mjs,
 * after render-elemental-plate.mjs): the photo stays natural and bright,
 * only the pixels are loud.
 * - The factories are pixel sprites on a 4px grid: ink and ash silhouettes
 *   with lit roofs and sunward edges, red and white warning bands on each
 *   stack, rows of windows lit yellow, each standing on a dark dot-matrix
 *   base with a contact shadow. Four big ones low in the middle ground (they
 *   go up at 1.7, 3.0, 3.5 and 4.3 s, readable at phone size) and three
 *   small ones far off on the valley floor between them.
 * - The smoke is the poster's (smogField and "AIR pixels" in
 *   render-elemental-plate.mjs): one soft field, the plumes and the band
 *   they feed, drawn as an 8px ordered dither in the poster's smoke greys
 *   over a soft grey glow. Darker where it's denser and nearer its source
 *   (the plumes at the stacks, the band low down where they feed it), paler
 *   as it spreads; only its thin, old upper edge yellows to mustard. The
 *   band's width swells and pinches with billows and it breaks into puffs
 *   with real gaps, so the far mountains and the sky show through (about
 *   60% cover at the end); old plume smoke tears up with the same gaps.
 *   Ridges nearer than the valley floor hide it; the sky above stays blue.
 * - On our side of the valley, below the band, the land goes sick in
 *   patches through pixels (the kit's spreadSickness): a mustard tint that
 *   keeps the photo's light, mosaic patches of the dead tones drifting
 *   with the wind, and a pale dot-screen edge where it's spreading. The
 *   grass at our feet stays as it is.
 * - Timeline (11 s): clear for 1.5 s; factories from 1.7 to 4.7 s; the band
 *   gathers from about 2.5 s, has the far hills by 6.5 s and climbs over
 *   the mountains by the end; then 2.5 s of hold with the smog drifting.
 *
 * Photo: "Overlooking Lamar Valley from Specimen Ridge looking east"
 * (NPS / Jacob W. Frank, Yellowstone National Park, 13 June 2020), public
 * domain, https://commons.wikimedia.org/wiki/File:Overlooking_Lamar_Valley_from_Specimen_Ridge_looking_east_(50016473106).jpg
 * saved at 3000x2000 as public/hackathon/poster/elemental/bg/air-lamar-valley-nps.jpg.
 * The crop leaves out the road on the right; no people or buildings in it.
 *
 * Writes <dir>/elemental-air.mp4 (with sound, for Instagram),
 * <dir>/elemental-air.gif (silent) and <dir>/air-events.json. The sound is
 * made by scripts/render-elemental-air-sound.py from the events and the
 * recordings (see that file and scripts/elemental-audio/README.md):
 * open-country wind that breaks up and gets muffled as the smog thickens,
 * a knock as each factory goes up, a roar as it lights, and a factory drone
 * that rises with them.
 *
 * Needs ffmpeg and python3 with numpy.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

import { PX, TONES, blobCells, dither, dotMatrix, glow, put, spreadSickness } from "./elemental-pixel-kit.mjs";
import { H, ROOT, W, arg, bayer, clamp, encode, fbm, freshTmp, hash, hex, lum, mix, plateImage, smooth, timeline, writeFrame } from "./elemental-scene.mjs";

const OUT = resolve(arg("--out", "output/marketing/elemental-air"));
const FPS = Number(arg("--fps", 24));
const WIDTH = Number(arg("--width", 1080));
const AMBIENCE = arg("--ambience");
const BIRDS = arg("--birds");
const FACTORY = arg("--factory");
const CRF = Number(arg("--crf", 25));
const ONLY = arg("--only") ? arg("--only").split(",").map(Number) : null;
const TMP = join(OUT, ".frames-air");
const { N, levelAt, timeOf, duration, buildStart, buildEnd, ease } = timeline({ fps: FPS });

// ---------- the photo ----------
const PHOTO = "public/hackathon/poster/elemental/bg/air-lamar-valley-nps.jpg";
// A 4:5 window a little tighter than the full height, so there's less
// foreground grass and the road on the right stays out.
const CROP = { left: 500, top: 0, width: 1440, height: 1800 };
/** The clean photo at W x H, faded a little like film (as loadPlate does). */
async function loadPhoto() {
  const { data } = await sharp(join(ROOT, PHOTO)).extract(CROP).resize(W, H).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const plate = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const c = [data[i * 3] / 255, data[i * 3 + 1] / 255, data[i * 3 + 2] / 255];
    const l = lum(c);
    c.forEach((v, k) => (plate[i * 3 + k] = Math.round(clamp(mix(l, v, 0.88) * 0.97 + 0.02) * 255)));
  }
  return plate;
}

// ---------- where things are in the photo ----------
/** A line through hand-picked points, as a function of x. */
const polyline = (pts) => (x) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++)
    if (x <= pts[i][0]) return mix(pts[i - 1][1], pts[i][1], (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
  return pts[pts.length - 1][1];
};
// Traced from the photo (poster pixels). The skyline of the mountains:
const SKYLINE = polyline([[0, 340], [10, 335], [30, 325], [50, 330], [80, 328], [100, 335], [110, 344], [145, 330], [170, 340], [210, 352], [230, 356], [250, 352], [290, 348], [330, 352], [355, 355], [380, 340], [400, 338], [440, 345], [480, 335], [510, 324], [540, 332], [560, 343], [580, 350], [620, 340], [660, 340], [700, 325], [720, 320], [760, 322], [800, 330], [840, 318], [860, 315], [900, 322], [920, 325], [940, 320], [1000, 318], [1040, 322], [1080, 323]]);
// Where our side of the valley starts: the forested ridge on the left and
// the hill top on the right hide the valley floor; in between, the floor
// just runs on toward us.
const RIDGE_MID = polyline([[0, 546], [100, 549], [200, 556], [250, 566], [300, 588], [350, 600], [500, 608], [650, 610], [800, 604], [880, 600], [920, 594], [950, 586], [1000, 576], [1080, 565]]);
// The big sunlit slope on the right, whose top is the line of trees.
const RIDGE_NEAR = polyline([[0, 905], [300, 905], [450, 890], [500, 872], [550, 852], [600, 840], [650, 826], [700, 812], [750, 800], [800, 788], [850, 762], [900, 736], [950, 713], [1000, 702], [1080, 690]]);
// The grass at our feet.
const RIDGE_FEET = polyline([[0, 1040], [100, 1048], [160, 1066], [250, 1078], [350, 1086], [420, 1100], [470, 1116], [1080, 1120]]);
/**
 * How far away the land at (x, y) is, 0 (at our feet) .. 1 (the far
 * mountains); the sky is a bit more than 1. The smog band lies on the
 * valley floor (about 0.72), so anything nearer hides it.
 */
function depthAt(x, y) {
  const s0 = SKYLINE(x);
  const s1 = RIDGE_MID(x);
  const s2 = RIDGE_NEAR(x);
  const s3 = RIDGE_FEET(x);
  if (y < s0) return 1.15;
  if (y < s1) return 1 - 0.26 * Math.pow((y - s0) / Math.max(s1 - s0, 1), 1.3);
  const ridge = 1 - smooth(230, 330, x) * (1 - smooth(820, 920, x));
  const top = mix(0.74, 0.58, ridge);
  if (y < s2) return top - (top - 0.4) * ((y - s1) / (s2 - s1));
  if (y < s3) return 0.36 - 0.2 * ((y - s2) / (s3 - s2));
  return 0.13 - 0.11 * ((y - s3) / (H - s3));
}

// ---------- the factories ----------
// Pixel sprites on a 4px grid. Each has a hall (hw x hh cells) and a stack
// (sw x sh cells) standing at its right end, on the ground at `base`.
// Listed in the order they go up; `a` is the level at which each starts.
// The big ones stand on the slopes in the middle of the valley, low in the
// frame, big enough to read as factories at phone size; the small ones are
// far off on the valley floor. Smoke: black from some, grey from others.
const G = 4;
const BIG = { riseT: 0.9, spread: 18, depth: 0.45 };
const SMALL = { riseT: 0.55, spread: 9, depth: 0.72 };
const STACKS = [
  { ...BIG, x: 452, base: 880, sw: 5, sh: 44, hw: 22, hh: 11 },
  { ...SMALL, x: 560, base: 576, sw: 1, sh: 8, hw: 4, hh: 2 },
  { ...BIG, x: 688, base: 796, sw: 5, sh: 38, hw: 19, hh: 9 },
  { ...BIG, x: 140, base: 868, sw: 6, sh: 48, hw: 24, hh: 12 },
  { ...SMALL, x: 400, base: 570, sw: 1, sh: 7, hw: 4, hh: 2 },
  { ...BIG, x: 864, base: 724, sw: 4, sh: 30, hw: 15, hh: 8 },
  { ...SMALL, x: 690, base: 596, sw: 1, sh: 8, hw: 5, hh: 2 },
].map((st, k) => {
  const x = Math.round(st.x / G) * G;
  const base = Math.round(st.base / G) * G;
  // The stack stands just inside the hall's right end; smoke leaves its top.
  const sx = x + (st.hw - st.sw - (st.sw > 1 ? 1 : 0)) * G;
  return { ...st, k, x, base, sx, h: st.sh * G, w: st.sw * G, a: 0.006 + 0.05 * k, seed: 31 * k + 7, smoke: [0.3, 0.42, 0.34][k % 3] };
});
for (const st of STACKS) {
  st.t0 = timeOf(st.a);
  st.t1 = st.t0 + st.riseT; // smoke starts
  st.rise = st.h * 1.1 + 60; // how high the plume climbs before it levels off
}
// Smoke: puffs leave each stack RATE times a second and live LIFE seconds.
const RATE = 7;
const LIFE = 6.5;
const WIND = 34; // px per second, blowing right
/** Where puff j of stack st is at `age` seconds, how big and how thick. */
function puff(st, j, age) {
  const h1 = hash(j, st.seed, 3);
  const h2 = hash(j, st.seed, 4);
  const h3 = hash(j, st.seed, 5);
  // Hot smoke shoots straight up, slows as it cools, and only then does
  // the wind bend it over and carry it off.
  const rise = st.rise * (0.8 + 0.4 * h1) * (1 - Math.exp(-age / 1));
  const drift = age - 0.3 * (1 - Math.exp(-age / 0.3));
  const x = st.sx + st.w / 2 + WIND * drift * (0.75 + 0.5 * h2) + (h3 - 0.5) * 8 * age;
  const y = st.base - st.h - rise + (h3 - 0.5) * 6 * age;
  const r = st.w * 0.6 + st.spread * age;
  // Thinner as it spreads (more sideways than up), so it streams off
  // downwind instead of bunching up where it levels off.
  return { x, y, rx: r * (1 + 0.3 * age), ry: r * (1 - 0.06 * Math.min(age, 6)), dens: (1.6 / (1 + 1.6 * age)) * Math.exp(-age / 5), age };
}

// ---------- the smog band ----------
// Like the poster's smoke (smogField in render-elemental-plate.mjs): a long
// body over the valley whose centre wanders and whose width swells and
// pinches with slow billows, broken into puffs with real gaps, so the far
// mountains and the sky show through in places. It rises and widens as
// the plumes feed it.
const bandCentre = (s) => mix(612, 430, Math.pow(smooth(0.06, 1, s), 0.9));
const bandHalf = (s) => mix(14, 175, Math.pow(smooth(0.06, 1, s), 0.8));
const bandGain = (s) => smooth(0.05, 0.6, s);
/** Its centre line and half-width at x. */
function bandShape(x, s, t) {
  const billow = fbm((x - 24 * t) * 0.005, 3.7 + t * 0.04, 95, 3);
  const wave = fbm(x * 0.003 - t * 0.05, 1.3, 201, 3);
  return [bandCentre(s) + (wave - 0.5) * 150 + (billow - 0.5) * 70, bandHalf(s) * (0.3 + 1.3 * billow)];
}
/**
 * The band's density at (x, y), given its centre yc and half-width hw
 * there: thickest along the middle, puffs and gaps that drift with the
 * wind, a little thicker downwind of the factories, and hidden behind any
 * land nearer than the valley floor.
 */
function band(x, y, s, t, d, yc, hw) {
  const g = bandGain(s);
  if (g <= 0) return 0;
  const dd = Math.abs(y - yc) / Math.max(hw, 1);
  if (dd >= 1) return 0;
  const n = fbm((x - 26 * t) * 0.008, y * 0.02, 92, 4);
  const puffs = gaps(x, y, t);
  const src = mix(0.75, 1, smooth(100, 600, x));
  return clamp((1 - dd * dd) * puffs * (0.45 + 0.8 * n) * g * src * BAND_GAIN) * smooth(0.62, 0.71, d);
}
const BAND_GAPS = [0.36, 0.54];
/** Puffs, not a solid blanket: 0 where a gap opens, drifting with the wind. */
const gaps = (x, y, t) => smooth(BAND_GAPS[0], BAND_GAPS[1], fbm((x - 34 * t) * 0.011, y * 0.025 + t * 0.06, 97, 3));
const BAND_GAIN = 1.7;

// The smoke's tones: the poster's smoke greys, light to dark, chosen as in
// its "AIR pixels" (denser and nearer the source is darker). Old smog on
// the band's upper edge yellows: a thin fringe of mustard.
const SMOKE = [...TONES.smoke].reverse();
const TONE_LIST = [...SMOKE, PX.smogA, PX.mustard];

// ---------- the land going sick ----------
/**
 * Where our side of the valley has gone sick at level s, on the kit's cell
 * grid: patches (not a field) on the slopes below the band, reaching
 * further down and growing as the smog thickens, with dithered edges.
 */
function landFront(cell) {
  return (cx, cy, s) => {
    if (s <= 0.18) return 0;
    const x = cx * cell + cell / 2;
    const y = cy * cell + cell / 2;
    const top = RIDGE_MID(x) + 10;
    if (y < top) return 0;
    const k = smooth(0.18, 1, s);
    const reach = top + 40 + 300 * k + 120 * (fbm(x * 0.004, 7.7, 45, 3) - 0.5);
    const inReach = (reach - y) / 24;
    const patch = (fbm(x * 0.0075, y * 0.012, 46, 3) - (0.66 - 0.16 * k)) / 0.05;
    const v = Math.min(inReach, patch);
    if (v >= 1) return 1;
    if (v <= 0) return 0;
    return v > bayer(cx, cy) ? 1 : 0;
  };
}
const SICK_CELL = 12;
const front = landFront(SICK_CELL);
/** Dried, poisoned land: a mustard tint that keeps the photo's light. Not the sky. */
const deadTint = (l, r, g, b, x, y) => (y < SKYLINE(x) + 3 ? null : [0.1 + 0.95 * l, 0.08 + 0.82 * l, 0.03 + 0.36 * l]);

// ---------- frames ----------
const plate = await loadPhoto();
const CELL = 8; // the smoke's grid
const FW = Math.ceil(W / CELL);
const FH = Math.ceil(H / CELL);
const depth8 = new Float32Array(FW * FH);
for (let cy = 0; cy < FH; cy++) for (let cx = 0; cx < FW; cx++) depth8[cy * FW + cx] = depthAt(cx * CELL + 4, cy * CELL + 4);

const events = [];
for (const st of STACKS) {
  events.push({ t: st.t0, x: st.x / W, type: "build", size: st.h });
  events.push({ t: st.t1, x: st.x / W, type: "smoke", size: st.h });
}

const P = new Float32Array(FW * FH); // plume density
const PA = new Float32Array(FW * FH); // plume density x age
const PT = new Float32Array(FW * FH); // plume density x the stack's smoke tone
const F = new Float32Array(FW * FH); // the whole smoke field
const SHARE = new Float32Array(FW * FH); // how much of it is plume
const YC = new Float32Array(FW); // the band's centre line and half-width, per column
const HW = new Float32Array(FW);
const frames = ONLY ?? [...Array(N).keys()];
if (!ONLY) freshTmp(TMP);

for (const f of frames) {
  const s = levelAt(f);
  const t = f / FPS;
  const img = plateImage(plate);

  // The land under the band goes sick, through pixels.
  spreadSickness(img, {
    front,
    s,
    cell: SICK_CELL,
    tint: deadTint,
    tintAlpha: 0.6,
    tones: TONES.dead,
    density: 0.45,
    band: 0.05,
    hi: PX.smogPale,
    lo: PX.smogB,
    t,
    drift: [24, 0],
    region: (x, y) => y < RIDGE_FEET(x) - 12,
  });

  // The far factories stand in the valley the band fills, so they go first.
  for (const st of STACKS) if (st.sw === 1) drawFactory(st);

  // The smoke field: the plumes, and the band they feed.
  P.fill(0);
  PA.fill(0);
  PT.fill(0);
  for (const st of STACKS) {
    if (t < st.t1) continue;
    // A fresh plume grows out of the stack instead of popping in whole.
    const fresh = clamp((t - st.t1) / 0.4);
    const j0 = Math.max(0, Math.ceil((t - st.t1 - LIFE) * RATE));
    const j1 = Math.floor((t - st.t1) * RATE);
    for (let j = j0; j <= j1; j++) {
      const age = t - (st.t1 + j / RATE);
      if (age < 0) continue;
      const p = puff(st, j, age);
      const x0 = Math.max(0, Math.floor((p.x - 2.2 * p.rx) / CELL));
      const x1 = Math.min(FW - 1, Math.ceil((p.x + 2.2 * p.rx) / CELL));
      const y0 = Math.max(0, Math.floor((p.y - 2.2 * p.ry) / CELL));
      const y1 = Math.min(FH - 1, Math.ceil((p.y + 2.2 * p.ry) / CELL));
      for (let cy = y0; cy <= y1; cy++)
        for (let cx = x0; cx <= x1; cx++) {
          const ci = cy * FW + cx;
          // Hidden behind land nearer than the stack.
          if (depth8[ci] < st.depth - 0.05) continue;
          const dx = (cx * CELL + 4 - p.x) / p.rx;
          const dy = (cy * CELL + 4 - p.y) / p.ry;
          const w = p.dens * fresh * Math.exp(-(dx * dx + dy * dy));
          if (w < 0.002) continue;
          P[ci] += w;
          PA[ci] += w * age;
          PT[ci] += w * st.smoke;
        }
    }
  }
  let any = false;
  for (let cx = 0; cx < FW; cx++) [YC[cx], HW[cx]] = bandShape(cx * CELL + 4, s, t);
  for (let cy = 0; cy < FH; cy++)
    for (let cx = 0; cx < FW; cx++) {
      const ci = cy * FW + cx;
      const x = cx * CELL + 4;
      const y = cy * CELL + 4;
      // Rags: the plume tears into puffs that drift with the wind, and as
      // it ages it breaks up with the same gaps as the band, so old smoke
      // never closes into a sheet.
      let plume = 0;
      if (P[ci] > 0.01) {
        const tex = 0.45 + 1.1 * fbm((x - WIND * t) * 0.02, (y + 8 * t) * 0.03, 52, 3);
        const age = PA[ci] / P[ci];
        plume = (1 - Math.exp(-P[ci] * tex * 1.5)) * mix(1, gaps(x, y, t), 0.75 * smooth(0.8, 2.5, age));
      }
      const bnd = band(x, y, s, t, depth8[ci], YC[cx], HW[cx]);
      F[ci] = 1 - (1 - plume) * (1 - bnd);
      SHARE[ci] = plume / Math.max(plume + bnd, 1e-6);
      if (F[ci] > 0.02) any = true;
    }
  const fieldAt = (x, y) => F[clamp(Math.floor(y / CELL), 0, FH - 1) * FW + clamp(Math.floor(x / CELL), 0, FW - 1)];
  if (any) {
    // A soft grey glow under the pixels, so they sit in the air.
    await glow(img, [0, 0, W, 900], 18, (paint) => {
      for (let cy = 0; cy < FH; cy++)
        for (let cx = 0; cx < FW; cx++) {
          const v = F[cy * FW + cx];
          if (v < 0.05) continue;
          for (let k = 0; k < 16; k++) paint(cx * CELL + (k & 3) * 2, cy * CELL + (k >> 2) * 2, PX.smokeHaze, 0.32 * v);
        }
    }, { fixed: PX.smokeHaze });
    // Then the smoke as an 8px ordered dither in the poster's greys: darker
    // where it's denser and nearer its source (the plumes at the stacks,
    // the band low down where they feed it), paler as it spreads.
    dither(img, fieldAt, {
      box: [0, 0, W, 900],
      cell: CELL,
      tones: TONE_LIST,
      cut: 0.75,
      gain: 3,
      spread: 1.1,
      a: 0.94,
      toneIndex: (x, y, dd) => {
        const ci = clamp(Math.floor(y / CELL), 0, FH - 1) * FW + clamp(Math.floor(x / CELL), 0, FW - 1);
        if (SHARE[ci] > 0.5) {
          const young = 1 - clamp(PA[ci] / Math.max(P[ci], 1e-6) / 2.5);
          const dark = PT[ci] / Math.max(P[ci], 1e-6) < 0.36 ? 0.5 : 0;
          return clamp(Math.floor(dd * 0.7 + young * 1.8 + dark), 0, 3);
        }
        const cx = clamp(Math.floor(x / CELL), 0, FW - 1);
        const low = clamp((y - (YC[cx] - HW[cx])) / Math.max(2 * HW[cx], 1));
        // Its upper edge, where it's thin and old: a mustard fringe.
        if (low < 0.22 && dd < 0.7 && bayer(x / CELL + 1, y / CELL) < 0.85 * smooth(0.3, 0.85, s)) return low < 0.1 ? 5 : 4;
        return clamp(Math.floor(dd + low * 1.6 - 0.1), 0, 3);
      },
    });
  }

  // The big factories stand in front of the band, on our side of the valley.
  for (const st of STACKS) if (st.sw > 1) drawFactory(st);

  if (ONLY) {
    await writeFrame(img, f, OUT, WIDTH);
    console.log(`frame ${f} (level ${s.toFixed(2)}) → ${join(OUT, `frame-${String(f).padStart(4, "0")}.png`)}`);
  } else {
    await writeFrame(img, f, TMP, WIDTH);
    process.stdout.write(`\rframe ${f + 1}/${N}`);
  }

  /** One 4px cell of a sprite. */
  function cell(x, y, c, a = 1) {
    for (let yy = 0; yy < G; yy++) for (let xx = 0; xx < G; xx++) put(img, x + xx, y + yy, c, a);
  }

  /**
   * One factory as a pixel sprite. It goes up row by row from the ground:
   * first the dark dot-matrix ground it stands on, then the hall, then the
   * stack; then its windows light one by one. Lit from the upper left like
   * the photo: a light roof and left edge, an ink shadow side on the right.
   */
  function drawFactory(st) {
    const p = clamp((t - st.t0) / st.riseT);
    if (p <= 0) return;
    const hx = st.x;
    const hw = st.hw * G;
    // The ground it stands on, and its shadow falling right, away from the sun.
    const fade = smooth(0, 0.25, p);
    for (const [x0, y0] of blobCells(hx + hw / 2 + G, st.base + G * 0.6, hw * 0.62 + G * 3, G * (st.sw > 1 ? 3 : 1.3), G, 90 + st.seed, 0.7))
      for (let y = y0; y < y0 + G; y++) for (let x = x0; x < x0 + G; x++) dotMatrix(img, x, y, 0.9 * fade);
    for (let y = st.base; y < st.base + G * 3; y++)
      for (let x = hx + G; x < hx + hw + G * 4; x++) put(img, x, y, PX.ink, 0.3 * fade * (1 - (y - st.base) / (G * 3)));
    // The hall.
    const rowsH = Math.ceil(st.hh * clamp(p / 0.45));
    const winRows = st.hh >= 8 ? [Math.round(st.hh * 0.35), Math.round(st.hh * 0.65)] : [Math.max(1, Math.floor(st.hh / 2))];
    for (let r = 0; r < rowsH; r++) {
      const y = st.base - (r + 1) * G;
      for (let c = 0; c < st.hw; c++) {
        const x = hx + c * G;
        const roof = r === st.hh - 1;
        let col = PX.ash;
        if (c === st.hw - 1) col = PX.ink;
        else if (roof || c === 0) col = PX.ashLight;
        else if (winRows.includes(r) && c % 2 === 1 && c < st.hw - 2 && st.sw > 1) {
          // Windows: dark, some lit once it's running.
          const on = hash(c, st.seed + r, 9) < 0.4 && t > st.t1 + 0.12 * c;
          col = on ? PX.yellow : PX.ink;
        } else if (r < 3 && (c === 2 || c === 3) && st.sw > 1) col = PX.ink; // the door
        cell(x, y, col);
        // A sawtooth roof: every third cell steps up, lit on its left.
        if (roof && c % 3 === 0 && c < st.hw - 1 && st.sw > 1) cell(x, y - G, PX.ashLight);
      }
    }
    // The stack, climbing out of the ground after the hall.
    const rowsS = Math.ceil(st.sh * clamp((p - 0.3) / 0.7));
    for (let r = 0; r < rowsS; r++) {
      const fromTop = st.sh - 1 - r;
      const y = st.base - (r + 1) * G;
      const lip = st.sw > 1 && fromTop === 0 && rowsS === st.sh;
      for (let c = lip ? -1 : 0; c < st.sw + (lip ? 1 : 0); c++) {
        let col = st.sw === 1 ? PX.ash : c <= 0 ? PX.ashLight : c >= st.sw - 1 ? PX.ink : PX.ash;
        // A soot-black lip, then warning bands: red, white, red (and more
        // on the tall ones).
        const bands = st.sh >= 30 ? 5 : st.sw > 1 ? 3 : 1;
        if (fromTop === 0) col = PX.ink;
        else if (fromTop <= bands) col = fromTop % 2 === 1 ? PX.flatRed : PX.white;
        cell(st.sx + c * G, y, col);
      }
    }
  }
}
if (ONLY) process.exit(0);
process.stdout.write("\n");

// ---------- sound and encode ----------
const eventsPath = join(OUT, "air-events.json");
writeFileSync(eventsPath, JSON.stringify({ fps: FPS, duration, buildStart, buildEnd, ease, events }, null, 1));
const wav = join(TMP, "air.wav");
execFileSync("python3", [join(ROOT, "scripts/render-elemental-air-sound.py"), eventsPath, wav, ...(AMBIENCE ? ["--ambience", AMBIENCE] : []), ...(BIRDS ? ["--birds", BIRDS] : []), ...(FACTORY ? ["--factory", FACTORY] : [])], { stdio: "inherit" });
const mp4 = join(OUT, "elemental-air.mp4");
const gif = join(OUT, "elemental-air.gif");
encode({ tmp: TMP, fps: FPS, wav, mp4, gif, crf: CRF });
console.log(`✅ ${mp4}\n✅ ${gif}`);
