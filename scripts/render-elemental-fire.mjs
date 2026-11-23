#!/usr/bin/env node
/**
 * Elemental, Fire on its own, in the key poster's pixel look: a calm meadow
 * of dry golden grass below a pine forest and a mountain. A small fire
 * starts in the meadow and grows into the poster's fire, the biggest thing
 * in the frame. Then it spreads: the ground behind its front burns to a
 * charred mosaic, and more fires light along the front, until the meadow
 * is a line of pixel fires with the big one in front. Their smoke rises
 * and the wind carries it left as a band of dithered pixels. The sky stays
 * blue; only the pixels are loud.
 *
 *   node scripts/render-elemental-fire.mjs --out <dir> [--fps 24] [--width 1080]
 *        [--ambience <wav>] [--birds <wav>] [--fire <wav>] [--fire2 <wav>]
 *        [--workers 16] [--frames 40,120,263]
 *
 * --frames renders only those frames, as PNGs in <dir>/.frames-fire, for a
 * quick look (no sound or video).
 *
 * Story, 11 s at 24 fps (see timeline() in elemental-scene.mjs):
 * - 0 to 1.5 s: the clean meadow; wind in the grass.
 * - 1.5 to 8.5 s: the build. A small flame in the grass grows into the big
 *   fire, slowly at first, then faster; its smoke starts to stream left.
 *   The front spreads out from it, burning the ground (an orange dot-screen
 *   edge, then charred mosaic and dot-matrix), catching the young pine, and
 *   lighting fire after fire along the way.
 * - 8.5 to 11 s: the hold. The line of fires and the big one keep burning
 *   and sparking, the smoke keeps drifting, ash falls.
 *
 * The look comes from scripts/elemental-pixel-kit.mjs (the poster's own
 * techniques, from render-elemental-plate.mjs): fire() is the poster's fire
 * (smooth flame, mosaic upper flame, white stepped crown, flat red and blue
 * shapes, white and blue checker sparks, burnt base, embers);
 * spreadSickness() burns the ground; dither() draws the smoke.
 *
 * Photo: "Bismarck Lake Trail (20986439564).jpg", a meadow near the San
 * Francisco Peaks, by Coconino National Forest, CC0, from Wikimedia Commons:
 * https://commons.wikimedia.org/wiki/File:Bismarck_Lake_Trail_(20986439564).jpg
 * Saved, resized, as public/hackathon/poster/elemental/bg/fire-bismarck-meadow-commons.jpg.
 *
 * Sound: scripts/render-elemental-fire-sound.py, with the CC0 recordings in
 * scripts/elemental-audio (wind in the grass, a bonfire's crackle, a fire's
 * body; birds only if --birds is given). Every recording is optional.
 *
 * Writes <dir>/elemental-fire.mp4 (with sound), <dir>/elemental-fire.gif
 * (silent) and <dir>/fire-events.json (what the sound follows).
 *
 * Renders frames in parallel worker threads. Needs ffmpeg and python3 with numpy.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

import { PX, TONES, dither, dotMatrix, fire, glow, rect, spreadSickness } from "./elemental-pixel-kit.mjs";
import { H, ROOT, W, arg, bayer, clamp, encode, fbm, freshTmp, hash, loadPlate, mix, plateImage, smooth, timeline, writeFrame } from "./elemental-scene.mjs";

const OUT = resolve(arg("--out", "output/marketing/elemental-fire"));
const FPS = Number(arg("--fps", 24));
const WIDTH = Number(arg("--width", 1080));
const TMP = join(OUT, ".frames-fire");
const PHOTO = "public/hackathon/poster/elemental/bg/fire-bismarck-meadow-commons.jpg";
const CROP_X = 750; // the young pine on the left, the mountain in the middle
const TL = timeline({ fps: FPS });
const { N, CLEAN, BUILD, levelAt, duration, buildStart, buildEnd, ease } = TL;

/**
 * The fire's clock, u: below 0 before it starts, 0..1 over the build (slow,
 * then faster, like the other elements), and still creeping on in the hold.
 */
const HOLD_CREEP = 0.3;
const fireAt = (f) => (f < CLEAN ? -1 : f < CLEAN + BUILD ? levelAt(f) : 1 + ((f - CLEAN - BUILD + 1) / BUILD) * HOLD_CREEP);
/** When the fire's clock reaches u, in seconds (for the sound). */
const timeAtU = (u) => (u <= 1 ? TL.timeOf(u) : buildEnd + ((u - 1) / HOLD_CREEP) * (BUILD / FPS));

// ---------- the fires ----------
// The big fire stands in the meadow right of the young pine. Its flames
// reach about 600 px up at full size, over the mountain's foot.
const HERO = { x: 650, base: 1020, scale: 1.2, seed: 0 };
const YH = 572; // the horizon: things shrink toward it, so far fires are small
/** The big fire's size and strength at fire-clock u: a small flame first. */
const heroAt = (u) => (u < 0 ? { level: 0, scale: 0 } : { level: 0.03 + 0.97 * smooth(0, 0.4, u), scale: HERO.scale * mix(0.4, 1, smooth(0, 0.5, u)) });

// The front spreads out from the big fire's base: further and faster to the
// left (downwind) and away from us, slowly toward us (against the wind).
// frontDist is how far a place is from the fire in front units; the front
// has reached it once REACH * s is past that.
const REACH = 1.08;
function frontDist(x, y) {
  const rx = x < HERO.x ? 820 : 560;
  const ry = y < HERO.base ? 330 : 150;
  return Math.hypot((x - HERO.x) / rx, (y - HERO.base) / ry) + 0.22 * (fbm(x * 0.006, y * 0.012, 41, 3) - 0.5);
}
/** How far the front has got (0..1, and on a little in the hold). */
const frontAt = (u) => clamp((u - 0.14) / 0.86, 0, 1.2);

/**
 * The fires that light along the front: where they stand on the ground and
 * a seed each. They stand behind the big fire, so it stays the one in front,
 * and their size follows their distance (rows nearer the horizon are
 * further away), from 0.3 at the far edge of the meadow to about 0.55. One
 * stands at the young pine's foot, so the pine burns.
 */
const SPOTS = [
  [600, 688, 1],
  [800, 708, 2],
  [400, 724, 3],
  [975, 742, 4],
  [235, 805, 5],
  [1050, 845, 6],
].map(([x, base, seed]) => {
  const scale = clamp((0.85 * HERO.scale * (base - YH)) / (HERO.base - YH), 0.3, 0.7);
  // It lights when the front gets there.
  return { x, base, seed, scale, s0: frontDist(x, base) / REACH };
});
/**
 * A spot fire's strength when the front is at s: it flares up as the front
 * arrives, and once the front has moved well past it burns down low, so
 * the newest fires, along the front, are the biggest.
 */
const spotLevel = (sp, s) => smooth(0, 0.16, s - sp.s0) * (1 - 0.6 * smooth(sp.s0 + 0.32, sp.s0 + 0.6, s));

// ---------- smoke ----------
/**
 * Each fire's smoke: it leaves the flames' upper left and the wind carries
 * it left, rising a little and spreading, like the poster's. Returns the
 * plumes at fire-clock u, each { ox, oy, len, rise, w0, w1, a, reach }.
 */
function plumesAt(u) {
  const s = frontAt(u);
  const out = [];
  const add = (x, base, scale, level, reach) => {
    if (level < 0.15 || reach <= 0) return;
    out.push({
      ox: x - 40 * scale,
      oy: base - 330 * scale * (0.3 + 0.7 * level),
      len: 250 + 900 * scale,
      rise: 90 + 220 * scale,
      w0: 10 + 20 * scale,
      w1: 40 + 110 * scale,
      a: level * Math.min(1, scale * 1.3),
      reach,
    });
  };
  const h = heroAt(u);
  add(HERO.x, HERO.base, h.scale, h.level, smooth(0.06, 0.75, u));
  for (const sp of SPOTS) add(sp.x, sp.base, sp.scale, spotLevel(sp, s), smooth(0, 0.4, s - sp.s0));
  return out;
}

// ---------- classes ----------
const SKY = 0;
const GRASS = 1;
const ROCK = 2;
const TREE = 3; // the young pine and the big pine on the right
const FAR = 4; // the far treeline, the forest and the mountain: they stay as they are

const shared = (Ctor, n) => new Ctor(new SharedArrayBuffer(n * Ctor.BYTES_PER_ELEMENT));
const CELL = 12; // the burnt ground's grid

// ======================================================================
// Main thread: read the photo, sort its pixels, work out the story's
// numbers for the sound, hand frames to workers, then sound and encode.
// ======================================================================
if (isMainThread) {
  freshTmp(TMP);
  const raw = await loadPlate({ photo: PHOTO, cropX: CROP_X, tmp: TMP });
  const plate = shared(Uint8Array, W * H * 3);
  const cls = shared(Uint8Array, W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const r = raw[i * 3] / 255;
      const g = raw[i * 3 + 1] / 255;
      const b = raw[i * 3 + 2] / 255;
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      let c;
      // Sky is bright blue or white cloud; the mountain is blue too, but dark.
      if (y < 640 && ((b > 0.6 && b > r + 0.25) || (l > 0.58 && sat < 0.25 && y < 560))) c = SKY;
      // Golden grass is warmer than it is green; sunlit pine needles aren't.
      else if (y > 585 && r > g - 0.015 && r > b + 0.05 && l > 0.13) c = GRASS;
      else if (y > 600 && sat < 0.09 && l > 0.12) c = ROCK;
      else if (y > 820 || (y > 640 && x > 430)) c = GRASS; // shadows and shrubs in the grass
      else {
        // Pines are green; the far mountain is blue with distance. The young
        // pine is a cone from y 130 to its foot at y 800; the big pine fills
        // the right edge and reaches in at the top.
        const green = g >= b - 0.02;
        const youngPine = y > 125 && (Math.abs(x - 165) < 40 + (y - 125) * 0.4 || x < 60);
        const bigPine = (x > 1000 && y < 470) || (x > 900 && y < 330);
        c = green && (youngPine || bigPine) ? TREE : FAR;
      }
      cls[i] = c;
      // The photo's noon sky is a loud blue: soften it toward the poster's.
      const k = c === SKY ? 0.72 : 1;
      const lift = c === SKY ? 0.04 : 0;
      [r, g, b].forEach((v, j) => (plate[i * 3 + j] = Math.round(clamp(mix(l, v, k) + lift) * 255)));
    }

  // How far each burnt-ground cell is from the fire, in front units. A
  // tree cell counts from its foot (higher up a little later), so the
  // young pine burns from the ground up when the front reaches it.
  const NX = Math.ceil(W / CELL);
  const NY = Math.ceil(H / CELL);
  const cellD = shared(Float32Array, NX * NY);
  for (let cy = 0; cy < NY; cy++)
    for (let cx = 0; cx < NX; cx++) {
      const x = Math.min(W - 1, cx * CELL + CELL / 2);
      const y = Math.min(H - 1, cy * CELL + CELL / 2);
      const c = cls[y * W + x];
      const foot = c === TREE ? (x < 500 ? 800 : 700) : y;
      cellD[cy * NX + cx] = frontDist(x, foot) + (c === TREE ? (foot - y) / 2500 : 0);
    }

  // ---------- what burns, frame by frame (for the sound) ----------
  const intensity = [];
  const smokeMade = [];
  const centroid = [];
  for (let f = 0; f < N; f++) {
    const u = fireAt(f);
    const s = frontAt(u);
    const h = heroAt(u);
    let tot = h.level * h.scale ** 1.5;
    let sx = tot * HERO.x;
    for (const sp of SPOTS) {
      const v = spotLevel(sp, s) * sp.scale ** 1.5;
      tot += v;
      sx += v * sp.x;
    }
    intensity.push(tot);
    centroid.push(tot > 0 ? sx / tot / W : HERO.x / W);
    smokeMade.push(plumesAt(u).reduce((a, p) => a + p.a * p.reach * p.len, 0));
  }
  const maxI = Math.max(...intensity);
  const maxM = Math.max(...smokeMade);
  // Sound cues: the first flame, and each fire as it lights (a whoosh; the
  // bigger ones, nearer us, louder).
  const events = [{ t: timeAtU(0), x: HERO.x / W, type: "spark" }];
  for (const sp of SPOTS) {
    const u = 0.14 + 0.86 * (sp.s0 + 0.04);
    if (u < 1 + HOLD_CREEP) events.push({ t: timeAtU(u), x: sp.x / W, type: sp.scale >= 0.5 ? "torch" : "treeline" });
  }

  // ---------- render ----------
  const only = arg("--frames") ? arg("--frames").split(",").map(Number) : null;
  const frames = only ?? [...Array(N).keys()];
  const K = Math.min(Number(arg("--workers", 16)), frames.length);
  let done = 0;
  await Promise.all(
    [...Array(K).keys()].map(
      (k) =>
        new Promise((ok, fail) => {
          const w = new Worker(fileURLToPath(import.meta.url), {
            argv: process.argv.slice(2),
            workerData: { frames: frames.filter((_, j) => j % K === k), plate, cls, cellD },
          });
          w.on("message", () => process.stdout.write(`\rframe ${++done}/${frames.length}`));
          w.on("error", fail);
          w.on("exit", (code) => (code ? fail(new Error(`worker ${k} exited ${code}`)) : ok()));
        }),
    ),
  );
  process.stdout.write("\n");
  if (only) {
    // Quick look: keep the PNGs, no sound or video.
    console.log(`frames in ${TMP}`);
    process.exit(0);
  }

  // ---------- sound and encode ----------
  const eventsPath = join(OUT, "fire-events.json");
  writeFileSync(
    eventsPath,
    JSON.stringify(
      {
        fps: FPS,
        duration,
        buildStart,
        buildEnd,
        ease,
        intensity: intensity.map((v) => +(v / maxI).toFixed(4)),
        smoke: smokeMade.map((v) => +(v / maxM).toFixed(4)),
        centroid: centroid.map((v) => +v.toFixed(3)),
        events,
      },
      null,
      1,
    ),
  );
  const wav = join(TMP, "fire.wav");
  const pass = ["--ambience", "--birds", "--fire", "--fire2"].flatMap((k) => (arg(k) ? [k, arg(k)] : []));
  execFileSync("python3", [join(ROOT, "scripts/render-elemental-fire-sound.py"), eventsPath, wav, ...pass], { stdio: "inherit" });
  const mp4 = join(OUT, "elemental-fire.mp4");
  const gif = join(OUT, "elemental-fire.gif");
  encode({ tmp: TMP, fps: FPS, wav, mp4, gif, crf: 25 });
  console.log(`✅ ${mp4}\n✅ ${gif}`);
} else {
  // ====================================================================
  // Worker: draw frames.
  // ====================================================================
  const { frames, plate, cls, cellD } = workerData;
  const NX = Math.ceil(W / CELL);
  /** The front on the burnt ground's grid, with a dithered edge. */
  const front = (cx, cy, s) => {
    if (s <= 0) return 0;
    const v = (s * REACH - cellD[cy * NX + cx]) * 7;
    return v >= 1 ? 1 : v <= 0 ? 0 : v > bayer(cx, cy) ? 1 : 0;
  };
  for (const f of frames) {
    await writeFrame(await drawFrame(f), f, TMP, WIDTH);
    parentPort.postMessage(f);
  }

  async function drawFrame(f) {
    // The photo as it is: no grade over the frame.
    const img = plateImage(plate);
    const u = fireAt(f);
    if (u < 0) return img;
    const t = f / FPS;
    const s = frontAt(u);

    // ---- the burnt ground behind the front ----
    // The grass (and the pine) char by their own brightness, so the
    // photo's light carries through; part of it turns to a mosaic of burnt
    // tones; an orange dot screen runs along the front, where it's burning.
    // The sky and the far forest and mountain are left alone.
    spreadSickness(img, {
      front,
      s,
      cell: CELL,
      tint: (l, r, g, b, x, y) => {
        const c = cls[y * W + x];
        if (c === SKY || c === FAR) return null;
        return c === TREE ? [0.05 + 0.2 * l, 0.04 + 0.15 * l, 0.035 + 0.12 * l] : [0.07 + 0.32 * l, 0.05 + 0.23 * l, 0.04 + 0.17 * l];
      },
      tintAlpha: 0.88,
      tones: TONES.burnt,
      density: 0.3,
      band: 0.05,
      hi: PX.orange,
      lo: PX.ink,
      t,
      drift: [-6, 0],
      seed: 33,
    });
    // Patches of dark dot-matrix, the poster's burnt base, on the ground.
    for (let cy = 0; cy < Math.ceil(H / CELL); cy++)
      for (let cx = 0; cx < NX; cx++) {
        const x0 = cx * CELL;
        const y0 = cy * CELL;
        if (cls[Math.min(H - 1, y0 + 6) * W + Math.min(W - 1, x0 + 6)] !== GRASS || !front(cx, cy, s - 0.08)) continue;
        if (fbm(x0 * 0.02, y0 * 0.045, 51, 3) < 0.6) continue;
        for (let y = y0; y < Math.min(H, y0 + CELL); y++) for (let x = x0; x < Math.min(W, x0 + CELL); x++) dotMatrix(img, x, y, 0.9, 0.3);
      }

    // ---- the fires and their smoke, far to near ----
    const hero = heroAt(u);
    const fires = [{ x: HERO.x, base: HERO.base, scale: hero.scale, level: hero.level, seed: HERO.seed, hero: true }];
    for (const sp of SPOTS) {
      const level = spotLevel(sp, s);
      if (level > 0.01) fires.push({ x: sp.x, base: sp.base, scale: sp.scale, level, seed: sp.seed });
    }
    fires.sort((a, b) => a.base - b.base);
    const plumes = plumesAt(u);
    // The smoke sits in front of the far fires and behind the near ones.
    const SMOKE_DEPTH = 790;
    const drawFire = (q) =>
      fire(img, {
        x: q.x,
        base: q.base,
        scale: q.scale,
        level: q.level,
        t,
        seed: q.seed,
        // The flat shapes are the big fire's alone, and only the bigger
        // fires spark: on the small ones they'd be noise (and cost time).
        sparks: q.scale >= 0.5,
        shapes: !!q.hero,
        glowAmount: q.hero ? 1 : 0.4,
        wind: -80,
      });
    for (const q of fires) if (q.base < SMOKE_DEPTH) await drawFire(q);
    if (plumes.length) await drawSmoke(img, plumes, t);
    for (const q of fires) if (q.base >= SMOKE_DEPTH) await drawFire(q);

    ash(img, s, t);
    return img;
  }

  /**
   * The smoke, the poster's way: a soft field from all the plumes, first as
   * a faint haze so the pixels sit in the air, then as an ordered dither on
   * an 8px grid in smoke greys, dark near the fires and paler as it thins.
   */
  async function drawSmoke(img, plumes, t) {
    const field = (x, y) => {
      // The pattern drifts left with the wind and lifts a little.
      const X = x + 55 * t;
      const Y = y + 10 * t;
      const n = fbm(X * 0.008, Y * 0.02, 92, 4);
      const billow = fbm(X * 0.005, Y * 0.004, 95, 3);
      // Puffs, not a solid beam: thin patches open up along it.
      const puffs = smooth(0.3, 0.52, fbm(X * 0.011, Y * 0.025, 97, 3));
      let best = 0;
      let near = 0;
      for (const p of plumes) {
        if (x > p.ox + 80) continue;
        const tt = clamp((p.ox - x) / p.len);
        const yc = p.oy - p.rise * Math.pow(tt, 0.8);
        const w = (p.w0 + p.w1 * tt) * (0.55 + 0.9 * billow);
        const d = Math.abs(y - yc - (billow - 0.5) * 90 * (0.2 + tt)) / w;
        if (d >= 1) continue;
        // How far the wind has carried it so far; it starts inside the flames.
        const reach = 1 - smooth(p.reach * 1.15 - 0.15, p.reach * 1.15, tt);
        const start = smooth(p.ox + 80, p.ox - 20, x);
        const v = (1 - d * d) * reach * start * (1 - 0.4 * tt) * p.a;
        if (v > best) {
          best = v;
          near = 1 - tt;
        }
      }
      return { v: clamp(best * puffs * (0.45 + 0.8 * n)), near };
    };
    const box = [0, 120, W, 1010];
    await glow(
      img,
      box,
      18,
      (paint) => {
        for (let y = box[1]; y < box[3]; y += 4)
          for (let x = box[0]; x < box[2]; x += 4) {
            const { v } = field(x, y);
            if (v > 0.05) for (let k = 0; k < 16; k++) paint(x + (k & 3), y + (k >> 2), PX.smokeHaze, 0.3 * v);
          }
      },
      { fixed: PX.smokeHaze },
    );
    const nearAt = new Map();
    dither(img, (x, y) => {
      const r = field(x, y);
      nearAt.set(y * W + x, r.near);
      return r.v;
    }, {
      box,
      cell: 8,
      tones: TONES.smoke,
      // TONES.smoke runs dark to light: thick smoke, and smoke near its
      // fire, is darker.
      toneIndex: (x, y, dd) => 3 - clamp(Math.floor(dd + (nearAt.get((y + 4) * W + x + 4) ?? 0) * 1.4), 0, 3),
    });
  }

  /** Ash: grey flecks on a 4px grid, drifting left and falling. */
  function ash(img, s, t) {
    const n = Math.round(70 * smooth(0.15, 0.7, s));
    for (let k = 0; k < n; k++) {
      const fall = 25 + 45 * hash(k, 1, 701);
      const y = ((hash(k, 2, 701) * 900 + t * fall) % 900) + 300;
      const x = ((((hash(k, 3, 701) * W * 1.3 - t * (40 + 30 * hash(k, 4, 701)) + Math.sin(t * 1.5 + k) * 10) % (W * 1.3)) + W * 1.3) % (W * 1.3)) - W * 0.15;
      const c = hash(k, 5, 701) < 0.6 ? PX.ashLight : PX.ash;
      rect(img, Math.round(x / 4) * 4, Math.round(y / 4) * 4, 4, c, 0.9);
    }
  }
}
