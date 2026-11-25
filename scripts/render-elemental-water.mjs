#!/usr/bin/env node
/**
 * Elemental, Water on its own, in the key poster's pixel look: the clean
 * river valley, then a toxic outflow poisons the river. A concrete outfall
 * pushes out of the bank, pixel by pixel, drips, then pours a bright acid
 * jet into the water. The poison spreads downstream along the river's real
 * channels the way the poster's river spill looks: the water tinted toxic
 * green by its own brightness, a mosaic of four greens drifting with the
 * current, and a dot-screen band along the advancing front. Drums are
 * dumped on the gravel bar and leak, a second outfall opens, then a third
 * on the far channel. Late in the build flat acid slicks float on the
 * surface and bubbles pop. At the end the river is poisoned green and keeps
 * flowing.
 *
 *   node scripts/render-elemental-water.mjs --out <dir>
 *        [--fps 24] [--width 1080] [--ambience <stream.wav>] [--birds <wav>]
 *        [--crf 25] [--stills 0,120,263]
 *
 * --stills renders only those frames, as PNGs in <dir>, for a quick look
 * while tuning (no sound, no video).
 *
 * Photo: the key visual's river valley with the blue sky (the clean plate
 * from scripts/render-elemental-plate.mjs) of
 * public/hackathon/poster/elemental/bg/river-joana-abreu-unsplash.jpg by
 * Joana Abreu on Unsplash (Unsplash licence).
 *
 * Writes <dir>/elemental-water.mp4 (with sound, for Instagram),
 * <dir>/elemental-water.gif (silent) and <dir>/water-events.json. The sound
 * is made by scripts/render-elemental-water-sound.py from the events and a
 * stream recording (--ambience): "Small River 1 - Slow - Distant" by
 * Pfannkuchn on Freesound (CC0), found through Openverse. --birds (off by
 * default) adds a birdsong recording quietly under it.
 *
 * The look (see elemental-pixel-kit.mjs and the poster's own renderer,
 * render-elemental-plate.mjs, for the rules):
 * - The photo stays natural: blue sky, green hills, no grade over the frame.
 *   Only the water, and a little of its wet bank, goes sick, and only where
 *   the poison has reached it.
 * - The poison is the poster's river spill, made from the photo: toxic tint
 *   by brightness, a 12px mosaic of the four toxic greens, a 1px dot-screen
 *   band along the front, flat acid stepped shapes, 6px bubbles.
 * - It travels along the water: a distance is measured through the water
 *   from each source, cheap downstream (left to right), dear upstream and
 *   across, so the poison follows the channels around the gravel bars.
 * - The outfalls and drums are 4px pixel sprites in poster colours, standing
 *   on a dark dot-matrix base; the jets are bright acid cells, and the green
 *   water lights its banks with a soft glow.
 *
 * Needs ffmpeg and python3 with numpy.
 */
import { execFileSync } from "node:child_process";
import { renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { PX, TONES, blobCells, dotMatrix, glow, lumAt, rect, spreadSickness } from "./elemental-pixel-kit.mjs";
import { H, ROOT, W, arg, clamp, encode, fbm, freshTmp, hash, loadPlate, mix, plateImage, smooth, timeline, vnoise, writeFrame } from "./elemental-scene.mjs";

const OUT = resolve(arg("--out", "output/marketing/elemental-water"));
const FPS = Number(arg("--fps", 24));
const WIDTH = Number(arg("--width", 1080));
const AMBIENCE = arg("--ambience");
const BIRDS = arg("--birds");
const C = 4; // grid for sprites and for measuring the water
const M = 12; // the mosaic grid, as on the poster
const TMP = join(OUT, ".frames-water");
const { N, levelAt, timeOf, duration, buildStart, buildEnd, ease } = timeline({ fps: FPS });
// --stills 0,120,263 renders just those frames as PNGs into --out, for a quick look.
const STILLS = arg("--stills")?.split(",").map(Number);

// ---------- the ground plane ----------
// The valley floor is flat. It meets the foot of the hills at about y 730
// (the horizon of the plane) and the bottom of the river is about y 1250.
// depthK(y) is how big a metre looks at row y, 1 at the near bank. The
// poison's travel is measured on this plane, so it's slower far away.
const HORIZON = 730;
const depthK = (y) => clamp((y - HORIZON) / (1250 - HORIZON), 0.12, 1.1);
const UPSTREAM = 3.5; // poison creeps upstream this many times slower
const ACROSS = 2.8; // and spreads across the current slower than along it, so it hugs its bank
const DRIFT = 45; // how fast the mosaic flows downstream, px a second

// ---------- the photo and the water in it ----------
freshTmp(TMP);
const plate = await loadPlate({ river: true, tmp: TMP });
const GW = W / C;
const GH = Math.ceil(H / C);
/** How much a photo pixel is river: bright, grey-blue, in the lower half. */
function waterPx(x, y) {
  if (y < 832 || y > 1264) return 0;
  const i = (y * W + x) * 3;
  const r = plate[i] / 255;
  const g = plate[i + 1] / 255;
  const b = plate[i + 2] / 255;
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  return b > r ? smooth(0.36, 0.5, l) * (1 - smooth(0.2, 0.3, sat)) : 0;
}
// Per 4px cell: how much of it is water.
const wet = new Float32Array(GW * GH);
for (let cy = Math.floor(820 / C); cy < Math.ceil(1270 / C); cy++)
  for (let cx = 0; cx < GW; cx++) {
    let m = 0;
    for (let y = cy * C; y < cy * C + C; y++) for (let x = cx * C; x < cx * C + C; x++) m += waterPx(x, y);
    wet[cy * GW + cx] = m / (C * C);
  }
const isWet = (i) => wet[i] > 0.5;
const wetAt = (x, y) => x >= 0 && x < W && y >= 0 && y < H && isWet(Math.floor(y / C) * GW + Math.floor(x / C));
// The wet bank: 4px cells within two cells of the water.
const nearWater = new Uint8Array(GW * GH);
for (let i = 0; i < wet.length; i++) {
  if (!isWet(i)) continue;
  const cx = i % GW;
  const cy = Math.floor(i / GW);
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x >= 0 && x < GW && y >= 0 && y < GH) nearWater[y * GW + x] = 1;
    }
}
// The water cells.
const cells = [];
for (let i = 0; i < wet.length; i++) if (isWet(i)) cells.push({ i, cx: i % GW, cy: Math.floor(i / GW) });
// Connected bodies of water: a source pours into a real channel, never
// into a speck of glare on the gravel.
const body = new Int32Array(GW * GH).fill(-1);
const bodySize = [];
for (const c of cells) {
  if (body[c.i] >= 0) continue;
  const id = bodySize.length;
  const stack = [c.i];
  body[c.i] = id;
  let n = 0;
  while (stack.length) {
    const i = stack.pop();
    n++;
    for (const d of [-1, 1, -GW, GW, -GW - 1, -GW + 1, GW - 1, GW + 1]) {
      const j = i + d;
      if (j >= 0 && j < wet.length && isWet(j) && body[j] < 0 && Math.abs((j % GW) - (i % GW)) <= 1) {
        body[j] = id;
        stack.push(j);
      }
    }
  }
  bodySize.push(n);
}

/**
 * Distance from (sx, sy) to every water cell, measured through the water on
 * the ground plane: cheap downstream, dear upstream and across. Infinity
 * where the water doesn't connect.
 */
function waterDistance(sx, sy) {
  const dist = new Float64Array(GW * GH).fill(Infinity);
  // Start at the nearest cell of a real body of water.
  let seed = -1;
  let bd = Infinity;
  for (const c of cells) {
    if (bodySize[body[c.i]] < 40) continue;
    const d = Math.hypot(c.cx * C + C / 2 - sx, (c.cy * C + C / 2 - sy) * 3);
    if (d < bd) {
      bd = d;
      seed = c.i;
    }
  }
  // Dijkstra with a binary heap.
  const hi = [];
  const hd = [];
  const push = (i, d) => {
    let n = hi.length;
    hi.push(i);
    hd.push(d);
    while (n > 0) {
      const p = (n - 1) >> 1;
      if (hd[p] <= hd[n]) break;
      [hi[p], hi[n]] = [hi[n], hi[p]];
      [hd[p], hd[n]] = [hd[n], hd[p]];
      n = p;
    }
  };
  const pop = () => {
    const top = [hi[0], hd[0]];
    const li = hi.pop();
    const ld = hd.pop();
    if (hi.length) {
      hi[0] = li;
      hd[0] = ld;
      let n = 0;
      for (;;) {
        const a = 2 * n + 1;
        const b = a + 1;
        let m = n;
        if (a < hi.length && hd[a] < hd[m]) m = a;
        if (b < hi.length && hd[b] < hd[m]) m = b;
        if (m === n) break;
        [hi[m], hi[n]] = [hi[n], hi[m]];
        [hd[m], hd[n]] = [hd[n], hd[m]];
        n = m;
      }
    }
    return top;
  };
  dist[seed] = 0;
  push(seed, 0);
  while (hi.length) {
    const [i, d] = pop();
    if (d > dist[i]) continue;
    const cx = i % GW;
    const cy = Math.floor(i / GW);
    const k = depthK(cy * C + C / 2);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) continue;
        const n = ny * GW + nx;
        if (!isWet(n)) continue;
        const du = ((dx * C) / k) * (dx < 0 ? UPSTREAM : 1);
        const dz = ((Math.abs(dy) * C) / k) * ACROSS;
        const nd = d + Math.hypot(du, dz);
        if (nd < dist[n]) {
          dist[n] = nd;
          push(n, nd);
        }
      }
  }
  return dist;
}

// ---------- what poisons it ----------
// Outfalls: a concrete headwall set into the bank with a pipe in it. They're
// drawn a little larger than life so they read on a phone; the pipe sits
// high in the wall so the jet has a drop to fall. `appear` is the level at
// which it pushes out of the bank, `pour` when it starts pouring (drips
// before that).
const OUTFALLS = [
  // A pours where the middle channel opens into the main one, so the
  // poison spreads out in open water and runs down both channels.
  { id: "A", x: 112, base: 1024, scale: 1.3, appear: 0, pour: 0.06, seed: 3 },
  { id: "B", x: 862, base: 953, scale: 1, appear: 0.33, pour: 0.37, seed: 5 },
  { id: "C", x: 340, base: 850, scale: 0.62, appear: 0.5, pour: 0.54, seed: 7 },
];
for (const o of OUTFALLS) {
  o.w = 104 * o.scale;
  o.h = 62 * o.scale;
  o.top = 10 * o.scale;
  o.r = 19 * o.scale;
  o.mx = o.x;
  o.my = o.base - o.h * 0.62;
  // Where the jet hits the water: just in front of the wall's foot.
  o.hitY = o.base + 8 * o.scale;
}
// Drums dumped on the gravel bar between the middle and the main channel,
// in poster colours. The `leak` ones leak into the main channel below them:
// lying ones from the bung in their end, standing ones from a split at the foot.
const DRUMS = [
  { x: 440, base: 1084, lying: false, colour: PX.battery[1], at: 0.2, leak: false },
  { x: 492, base: 1091, lying: true, colour: PX.battery[2], at: 0.27, leak: true, flip: false },
  { x: 556, base: 1083, lying: false, colour: PX.flatRed, at: 0.34, leak: true },
  { x: 378, base: 1091, lying: true, colour: PX.flatRed, at: 0.42, leak: true, flip: true },
  { x: 626, base: 1088, lying: true, colour: PX.battery[1], at: 0.49, leak: true, flip: false },
  { x: 410, base: 1079, lying: false, colour: PX.battery[2], at: 0.58, leak: false },
];
for (const d of DRUMS) {
  // A little larger than life too, so they read as drums on a phone.
  const k = depthK(d.base);
  d.r = 14 * k * 2;
  d.len = 40 * k * 2;
  d.land = d.at + 0.035; // falls for a moment, then lands
  // The bung: where it leaks from.
  if (d.lying) {
    d.bx = d.flip ? d.x + d.len / 2 - C : d.x - d.len / 2 + C;
    d.by = d.base - d.r * 0.6;
  } else {
    d.bx = d.x + d.r * 0.3;
    d.by = d.base - 2;
  }
  // The leak runs down the bar to the water below it.
  let y = d.base;
  while (y < d.base + 60 && !wetAt(d.bx, y)) y += C;
  d.wetY = y;
}
// Flat acid slicks that float up late in the build and drift downstream.
const SLICKS = [
  { x: 300, y: 1168, rx: 70, ry: 26, at: 0.72, seed: 33 },
  { x: 690, y: 1150, rx: 44, ry: 18, at: 0.86, seed: 34 },
];

// Every source of poison, with how far it has travelled along the water by
// level s (frontOf, in ground units, up to L).
const SOURCES = [
  ...OUTFALLS.map((o) => ({ kind: "outfall", o, x: o.mx, y: o.hitY + 4, start: o.pour, L: o.id === "C" ? 2400 : 3200 })),
  ...DRUMS.filter((d) => d.leak).map((d) => ({ kind: "drum", d, x: d.bx, y: d.wetY + 6, start: d.land + 0.03, L: 1500 })),
];
// It creeps out at first, so the clean river is seen for a while longer,
// then keeps on spreading.
const frontOf = (src, s) => src.L * Math.pow(clamp((s - src.start) / (1 - src.start)), 1.05);
/** How hard an outfall is pouring at level s and time t (0..1). */
const pourOf = (o, s, t) => (s < o.pour ? 0 : smooth(o.pour, o.pour + 0.1, s) * (0.82 + 0.18 * vnoise(t * 2.3, o.seed, 61)));

// The poison's reach on the mosaic grid: for each source, the distance to
// each 12px cell (the nearest water in it). Cells of bank next to the water
// follow just behind it, so the wet bank greens too.
const MX = Math.ceil(W / M);
const MY = Math.ceil(H / M);
for (const src of SOURCES) {
  const dist = waterDistance(src.x, src.y);
  const g = new Float32Array(MX * MY).fill(Infinity);
  for (const c of cells) {
    const j = Math.floor((c.cy * C) / M) * MX + Math.floor((c.cx * C) / M);
    if (dist[c.i] < g[j]) g[j] = dist[c.i];
  }
  src.g = Float32Array.from(g);
  for (let my = 1; my < MY - 1; my++)
    for (let mx = 1; mx < MX - 1; mx++) {
      const j = my * MX + mx;
      if (g[j] < Infinity) continue;
      let best = Infinity;
      for (const d of [-1, 1, -MX, MX]) best = Math.min(best, g[j + d]);
      src.g[j] = best + 80;
    }
}
// The front is torn by a still pattern, so it advances in lobes.
const tear = new Float32Array(MX * MY);
for (let j = 0; j < tear.length; j++) tear[j] = (fbm((j % MX) * 0.22, Math.floor(j / MX) * 0.5, 77, 2) - 0.5) * 2;
/** Has the poison reached mosaic cell (mx, my) by level s? */
const reached = (mx, my, s) => {
  if (mx < 0 || my < 0 || mx >= MX || my >= MY) return 0;
  const j = my * MX + mx;
  for (const src of SOURCES) {
    const g = src.g[j];
    if (g < Infinity && frontOf(src, s) > g + (80 + 0.3 * g) * tear[j]) return 1;
  }
  return 0;
};
// Only the cells at or next to the water are worth looking at.
const region12 = new Uint8Array(MX * MY);
for (let i = 0; i < nearWater.length; i++)
  if (nearWater[i]) region12[Math.floor((Math.floor(i / GW) * C) / M) * MX + Math.floor(((i % GW) * C) / M)] = 1;
/**
 * The poster's toxic tint, by the photo's brightness: the water turns toxic
 * green keeping its ripples; the wet bank darkens to a poisoned olive; the
 * rest is left alone.
 */
const tint = (l, r, g, b, x, y) => {
  if (waterPx(x, y) > 0.5) return [0.07 + 0.27 * l, 0.17 + 0.47 * l, 0.03 + 0.13 * l];
  if (nearWater[Math.floor(y / C) * GW + Math.floor(x / C)]) return [mix(r, r * 0.5, 0.6), mix(g, g * 0.75 + 0.05, 0.6), mix(b, b * 0.35, 0.6)];
  return null;
};

// ---------- frames ----------
const events = [];
const pours = [];
const emitted = new Set();
const once = (key, e) => {
  if (emitted.has(key)) return;
  emitted.add(key);
  events.push(e);
};

for (let f = 0; f < N; f++) {
  if (STILLS && !STILLS.includes(f)) continue;
  const s = levelAt(f);
  const t = f / FPS;
  const img = plateImage(plate);
  const cell = (cx, cy, c, a = 1) => rect(img, cx * C, cy * C, C, c, a);

  // ----- the poisoned water: tint, flowing mosaic, dot-screen front -----
  spreadSickness(img, { front: reached, s, cell: M, tint, tones: TONES.toxic, density: 0.4, band: 0.035, hi: PX.g3, lo: PX.g0, t, drift: [DRIFT, 0], seed: 31, region: (x, y) => region12[Math.floor(y / M) * MX + Math.floor(x / M)] === 1 });
  // The green water lights its banks: a soft green glow, screened.
  if (s > 0)
    await glow(img, [0, 800, W, 1280], 14, (paint) => {
      for (const c of cells) {
        if ((c.cx + c.cy) % 2 || !reached(Math.floor((c.cx * C) / M), Math.floor((c.cy * C) / M), s)) continue;
        paint(c.cx * C, c.cy * C, PX.g2, 0.32);
      }
    }, { mode: "screen", fixed: PX.g2 });

  // ----- flat acid slicks, late -----
  for (const k of SLICKS) {
    if (s < k.at) continue;
    const grow = smooth(k.at, k.at + 0.1, s);
    const x = k.x + 16 * (t - timeOf(k.at));
    for (const [x0, y0] of blobCells(x, k.y, k.rx * grow, k.ry * grow, M, k.seed))
      if (wetAt(x0 + M / 2, y0 + M / 2) && reached(Math.floor(x0 / M), Math.floor(y0 / M), s)) rect(img, x0, y0, M, PX.acid);
  }

  // ----- bubbles: 6px green cells, a white one above -----
  for (let k = 0; k < 34; k++) {
    const life = 0.35 + 0.45 * hash(k, 2, 91);
    const period = life + 0.25 + 0.7 * hash(k, 3, 91);
    const ph = (t + hash(k, 1, 91) * period) / period;
    const n = Math.floor(ph);
    const age = (ph - n) * period;
    if (age > life || hash(k, n, 93) > s * 1.1 - 0.12) continue;
    const c = cells[Math.floor(hash(k, n, 92) * cells.length)];
    const x = Math.round((c.cx * C + DRIFT * age) / 6) * 6;
    const y = Math.round((c.cy * C) / 6) * 6;
    if (!wetAt(x, y) || !reached(Math.floor(x / M), Math.floor(y / M), s)) continue;
    rect(img, x, y, 6, PX.g3);
    if (hash(k, n, 94) < 0.5) rect(img, x + 6, y - 6, 6, PX.white);
    if (age > life - 1 / FPS && hash(k, n, 95) < 0.5) once(`pop-${k}-${n}`, { t, type: "pop", x: x / W, size: 1 });
  }

  // ----- the outfalls -----
  const frame = { t, A: 0, B: 0, C: 0, drums: 0 };
  const jets = [];
  for (const o of OUTFALLS) {
    if (s < o.appear) continue;
    const grow = smooth(o.appear, o.appear + 0.012, s);
    once(`appear-${o.id}`, { t, type: "appear", x: o.x / W, size: o.scale });
    drawOutfall(o, grow);
    const p = pourOf(o, s, t);
    frame[o.id] = p;
    if (p > 0) {
      once(`pour-${o.id}`, { t, type: "pour", id: o.id, x: o.x / W, size: o.scale });
      jets.push([o, p]);
    } else if (grow >= 1) drawDrips(o, t);
  }
  // The jets glow acid on what's around them, then the jets themselves.
  if (jets.length)
    await glow(img, [0, 780, W, 1100], 10, (paint) => {
      for (const [o, p] of jets)
        for (let y = o.my; y < o.hitY + 10 * o.scale; y += 2)
          for (let x = o.mx - o.r * 1.6; x < o.mx + o.r * 1.6; x += 2) paint(x, y, PX.acid, 0.5 * p);
    }, { mode: "screen", fixed: PX.acid });
  for (const [o, p] of jets) drawJet(o, p, t, f);

  // ----- the drums -----
  // Bases and leaks on the ground first, then the drums from the back of
  // the bar to the front (falling ones last, they're in the air).
  const drums = [];
  for (const d of DRUMS) {
    if (s < d.at) continue;
    const p = clamp((s - d.at) / (d.land - d.at));
    if (p >= 1) {
      once(`drum-${d.x}`, { t, type: "drum", x: d.x / W, size: d.r });
      drawBase(d);
      if (d.leak && s > d.land + 0.02) {
        frame.drums++;
        drawLeak(d, t);
      }
    }
    drums.push({ d, p, dy: -Math.round(((1 - p) * (1 - p) * 220) / C) * C });
  }
  drums.sort((a, b) => (a.p < 1 ? 1e4 : a.d.base) - (b.p < 1 ? 1e4 : b.d.base));
  for (const { d, p, dy } of drums) {
    drawDrum(d, dy);
    if (p >= 1 && s - d.land < 0.03) drawDust(d, (s - d.land) / 0.03);
  }
  pours.push(frame);

  await writeFrame(img, f, TMP, WIDTH);
  process.stdout.write(`\rframe ${f + 1}/${N}`);

  // ---------- the sprites ----------
  /**
   * A concrete headwall in the bank: a block of greys taken from the
   * photo's brightness under it, a light top edge and wing walls, a dark
   * ink pipe mouth with a light rim, standing on a dot-matrix base.
   */
  function drawOutfall(o, grow) {
    const x0 = o.x - o.w / 2;
    const x1 = o.x + o.w / 2;
    const yt = o.base - o.h;
    const ww = 22 * o.scale;
    const ring = Math.max(C, 6 * o.scale);
    // The base: the photo under it as a dark dot matrix, wider than the wall.
    for (let y = Math.round(o.base - 6 * o.scale); y < o.base + 6 * o.scale; y++)
      for (let x = Math.round(x0 - ww - 6); x < x1 + ww + 6; x++)
        if (hash(Math.floor(x / C), Math.floor(y / C), o.seed + 1) < grow) dotMatrix(img, x, y, 0.9);
    const wingTop = (x) => yt + (o.h * 0.5 * Math.min(Math.abs(x - (x < o.x ? x0 : x1)), ww)) / ww;
    for (let cy = Math.floor((yt - o.top) / C); cy <= Math.floor((o.base - 2) / C); cy++)
      for (let cx = Math.floor((x0 - ww) / C); cx <= Math.floor((x1 + ww) / C); cx++) {
        // It pushes out of the bank pixel by pixel.
        if (hash(cx, cy, o.seed) > grow) continue;
        const x = cx * C + C / 2;
        const y = cy * C + C / 2;
        const dx = x - o.mx;
        const dy = y - o.my;
        const dm = Math.hypot(dx, dy);
        // The concrete's grey: one of four, from the photo's light there.
        const grey = (shift) => TONES.smoke[clamp(Math.floor((0.3 + 0.9 * lumAt(img, x, y)) * 4.2 - 0.5) + shift, 1, 3)];
        let c;
        if (dm < o.r) {
          // Inside the pipe: ink, with the poison's level glowing at the bottom.
          c = dy > o.r * 0.55 ? PX.g2 : PX.ink;
        } else if (dm < o.r + ring) {
          // The rim: light where it faces the sky (up and left), dark below.
          c = dx + dy < -o.r * 0.9 ? PX.white : dx + dy < 0 ? PX.ashLight : PX.ash;
        } else if (y >= yt && x >= x0 && x <= x1) {
          // The face: stains run down under the pipe; darker at the foot.
          const stain = Math.abs(Math.abs(dx) - o.r * 0.8) < C * 1.2 && dy > 0 && hash(cx, 3, o.seed) < 0.8;
          c = y > o.base - C * 2 || stain ? grey(-1) : grey(0);
        } else if (y < yt && y >= yt - o.top && x >= x0 + C && x <= x1 - C) {
          c = PX.ashLight; // the top edge catches the sky
        } else if ((x < x0 || x > x1) && y >= wingTop(x)) {
          c = x < x0 ? grey(0) : grey(-1); // wing walls: the left in the light, the right in shade
        } else continue;
        cell(cx, cy, c);
      }
  }

  /**
   * The jet: bright acid cells pouring from the pipe, a white and pale
   * green column down its lit side, chunks rushing down; and where it
   * lands, a stepped splash of white, pale green and acid with spray
   * thrown up. That's where the plume starts.
   */
  function drawJet(o, p, t, f) {
    const top = o.my + o.r * 0.3;
    const hw0 = o.r * (0.5 + 0.3 * Math.sqrt(p));
    for (let cy = Math.floor(top / C); cy <= Math.floor(o.hitY / C); cy++) {
      const y = cy * C;
      const fall = clamp((y - top) / (o.hitY - top));
      const hw = hw0 * (1 + 0.25 * fall);
      const rush = Math.floor((y - t * 300 * o.scale) / C);
      for (let cx = Math.floor((o.mx - hw) / C); cx <= Math.floor((o.mx + hw) / C); cx++) {
        const side = (cx * C + C / 2 - o.mx) / hw;
        // A stepped, ragged edge that rushes down with it.
        if (Math.abs(side) > 1 - 0.35 * fall * hash(cx, rush, o.seed)) continue;
        const chunk = vnoise(cx * 0.8, rush * 0.35, o.seed + 9);
        const c = side < -0.5 ? (chunk > 0.45 ? PX.white : PX.g3) : side < -0.15 || chunk > 0.72 ? PX.g3 : side > 0.6 ? PX.g2 : PX.acid;
        cell(cx, cy, c);
      }
    }
    // The splash: a low stepped mound of froth.
    const rx = o.r * (1.4 + 0.8 * p);
    const ry = (5 + 4 * p) * o.scale;
    for (let cy = Math.floor((o.hitY - ry) / C); cy <= Math.floor((o.hitY + ry) / C); cy++)
      for (let cx = Math.floor((o.mx - rx) / C); cx <= Math.floor((o.mx + rx) / C); cx++) {
        const d = Math.hypot((cx * C + C / 2 - o.mx) / rx, (cy * C + C / 2 - o.hitY) / ry);
        if (d > 1) continue;
        const h = hash(cx, cy, f * 7 + o.seed);
        if (h > 0.95 - 0.45 * d) continue;
        cell(cx, cy, h < 0.3 ? PX.white : h < 0.62 ? PX.g3 : PX.acid);
      }
    // Spray: cells on little arcs, over and over.
    for (let k = 0; k < Math.round(14 * p); k++) {
      const ph = t * (1.6 + hash(k, 1, o.seed)) + hash(k, 2, o.seed);
      const a = ph % 1;
      const n = Math.floor(ph);
      const x = o.mx + (hash(k, n, o.seed + 3) - 0.5) * 2.4 * rx * a;
      const y = o.hitY - 4 * a * (1 - a) * (12 + 24 * hash(k, n, o.seed + 4)) * o.scale;
      cell(Math.floor(x / C), Math.floor(y / C), hash(k, n, o.seed + 5) < 0.6 ? PX.white : PX.g3);
    }
  }

  /** Before it pours: acid drops falling from the lip. */
  function drawDrips(o, t) {
    for (let k = 0; k < 6; k++) {
      const period = 0.33 + 0.1 * hash(k, 9, o.seed);
      const ph = (t + hash(k, 8, o.seed) * period) / period;
      const a = ph % 1;
      const n = Math.floor(ph);
      const x = o.mx + (hash(n, k, o.seed) - 0.5) * o.r * 0.6;
      const y = o.my + o.r * 0.6 + a * a * (o.hitY - o.my - o.r * 0.6);
      cell(Math.floor(x / C), Math.floor(y / C), PX.acid);
      if (a > 1 - 1 / (FPS * period)) once(`drip-${o.id}-${k}-${n}`, { t, type: "drip", x: x / W, size: o.scale });
    }
  }

  /** The ground under a drum: a dark dot matrix, stepped at its edge. */
  function drawBase(d) {
    const rx = (d.lying ? d.len : d.r * 2) * 0.72;
    for (let cy = Math.floor((d.base - 6) / C); cy <= Math.floor((d.base + 8) / C); cy++)
      for (let cx = Math.floor((d.x - rx) / C); cx <= Math.floor((d.x + rx + 6) / C); cx++) {
        if (Math.hypot((cx * C + 2 - d.x - 3) / rx, (cy * C + 2 - d.base - 1) / 8) > 1) continue;
        for (let y = cy * C; y < cy * C + C; y++) for (let x = cx * C; x < cx * C + C; x++) dotMatrix(img, x, y, 0.92);
      }
  }

  /**
   * An oil drum as a 4px sprite in one poster colour: a lighter lid or end
   * cap, dark hoops, a white highlight column (row, lying) on the lit side,
   * a darker column (row) on the shaded side and an ink outline at the foot.
   */
  function drawDrum(d, dy) {
    const c0 = d.colour;
    const lift = (c, k) => c.map((v) => mix(v, 1, k));
    const dim = (c, k) => c.map((v) => v * k);
    const left = Math.round((d.x - (d.lying ? d.len / 2 : d.r)) / C);
    if (!d.lying) {
      const w = Math.max(5, Math.round((d.r * 2) / C));
      const h = Math.max(7, Math.round((d.len * 0.95) / C));
      const top = Math.round((d.base + dy) / C) - h;
      const hoops = [Math.round(h * 0.38), Math.round(h * 0.7)];
      for (let r = 0; r < h; r++)
        for (let q = 0; q < w; q++) {
          if (r === 0 && (q === 0 || q === w - 1)) continue;
          let c = c0;
          if (r === 0) c = lift(c0, 0.35);
          else if (r === 1) c = q === Math.round(w * 0.65) ? PX.ink : lift(c0, 0.15);
          else if (hoops.includes(r)) c = dim(c0, 0.62);
          else if (q === 1) c = PX.white;
          else if (q === w - 1) c = dim(c0, 0.6);
          if (r === h - 1) c = PX.ink;
          cell(left + q, top + r, c);
        }
    } else {
      const h = Math.max(5, Math.round((d.r * 2) / C));
      const w = Math.max(7, Math.round(d.len / C));
      const top = Math.round((d.base + dy) / C) - h;
      const capQ = d.flip ? w - 1 : 0;
      const hoops = [Math.round(w * 0.36), Math.round(w * 0.66)];
      for (let r = 0; r < h; r++)
        for (let q = 0; q < w; q++) {
          if ((r === 0 || r === h - 1) && (q === 0 || q === w - 1)) continue;
          let c = c0;
          if (Math.abs(q - capQ) <= 1) c = Math.abs(q - capQ) === 0 && r === h - 2 ? PX.ink : lift(c0, Math.abs(q - capQ) === 0 ? 0.32 : 0.18);
          else if (hoops.includes(q)) c = dim(c0, 0.62);
          else if (r === 1) c = PX.white;
          else if (r === h - 2) c = dim(c0, 0.6);
          if (r === h - 1 && Math.abs(q - capQ) > 1) c = PX.ink;
          cell(left + q, top + r, c);
        }
    }
  }

  /** A leaking drum's runnel: acid cells down the bar into the water. */
  function drawLeak(d, t) {
    for (let y = d.by; y < d.wetY + C; y += C) {
      const cx = Math.floor(d.bx / C);
      const cy = Math.floor(y / C);
      // Something glinting runs down it.
      const glint = ((((y - t * 50) % 16) + 16) % 16) < 4;
      cell(cx, cy, glint ? PX.white : PX.acid);
      if (y > d.base - 2) cell(cx + 1, cy, PX.g2);
    }
    if (hash(Math.floor(t * 3), Math.round(d.x), 5) < 0.4) once(`drip-${d.x}-${Math.floor(t * 3)}`, { t, type: "drip", x: d.x / W, size: 0.6 });
  }

  /** Grit kicked up when a drum lands. */
  function drawDust(d, p) {
    for (let k = 0; k < 10; k++) {
      const x = d.x + (hash(k, 1, Math.round(d.x)) - 0.5) * 70 * p;
      const y = d.base - 2 + (-30 - 40 * hash(k, 2, Math.round(d.x))) * p + 120 * p * p;
      if (y > d.base + 4 || p > 0.85) continue;
      cell(Math.floor(x / C), Math.floor(y / C), hash(k, 3, 7) < 0.5 ? PX.ashLight : PX.ash);
    }
  }
}
process.stdout.write("\n");
if (STILLS) {
  for (const f of STILLS) renameSync(join(TMP, `frame-${String(f).padStart(4, "0")}.png`), join(OUT, `still-${String(f).padStart(4, "0")}.png`));
  rmSync(TMP, { recursive: true, force: true });
  process.exit(0);
}

// ---------- sound and encode ----------
const eventsPath = join(OUT, "water-events.json");
writeFileSync(eventsPath, JSON.stringify({ fps: FPS, duration, buildStart, buildEnd, ease, events, pours }, null, 1));
const wav = join(TMP, "water.wav");
execFileSync("python3", [join(ROOT, "scripts/render-elemental-water-sound.py"), eventsPath, wav, ...(AMBIENCE ? ["--ambience", AMBIENCE] : []), ...(BIRDS ? ["--birds", BIRDS] : [])], { stdio: "inherit" });
const mp4 = join(OUT, "elemental-water.mp4");
const gif = join(OUT, "elemental-water.gif");
encode({ tmp: TMP, fps: FPS, wav, mp4, gif, crf: Number(arg("--crf", 25)) });
console.log(`✅ ${mp4}\n✅ ${gif}`);
