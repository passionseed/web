#!/usr/bin/env node
/**
 * Elemental, Earth on its own: the clean place, then e-waste dumped piece
 * by piece until the heap towers over it, in the key poster's pixel look
 * (scripts/elemental-pixel-kit.mjs). The heap is the poster's: circuit
 * boards, cracked phones, cables, keyboards, monitors and batteries on a
 * 4px grid, over a dark dot-matrix of the photo. The ground around it dies
 * as a mustard mosaic spreading out from the heap, dark runoff seeps from
 * its foot, and flies arrive at the end. The sky and mist stay natural.
 *
 *   node scripts/render-elemental-earth.mjs --out <dir> [--scene river|terraces]
 *        [--fps 24] [--width 1080] [--ambience <wav>]
 *
 * Scenes: "river" is the key visual's river valley (blue sky); "terraces"
 * is rice terraces under mist (rawpixel 3288128, CC0), where the heap grows
 * up the terraces.
 *
 * Writes <dir>/elemental-earth-<scene>.mp4 (with sound, for Instagram) and
 * .gif (silent). The sound is made by scripts/render-elemental-earth-sound.py
 * from <dir>/earth-events-<scene>.json and a recording of the calm place
 * (--ambience <wav>): it gets more and more broken as the heap grows, every
 * piece lands with a thud or a clatter, and at the end only flies and a low
 * hum are left.
 *
 * Needs ffmpeg and python3 with numpy.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { PX, TONES, dotMatrix, put, rect, spreadSickness } from "./elemental-pixel-kit.mjs";
import { H, ROOT, W, arg, bayer, clamp, encode, fbm, freshTmp, hash, hex, loadPlate, plateImage, sicknessFront, timeline, vnoise, writeFrame } from "./elemental-scene.mjs";

const OUT = resolve(arg("--out", "output/marketing/elemental-earth"));
const FPS = Number(arg("--fps", 24));
const WIDTH = Number(arg("--width", 1080));
// The calm place's own sound (--birds still works, for older commands).
const AMBIENCE = arg("--ambience", arg("--birds"));
const SCENE_NAME = arg("--scene", "river");
const C = 4; // the e-waste detail grid, as on the poster
const TMP = join(OUT, `.frames-earth-${SCENE_NAME}`);
const { N, levelAt, timeOf, duration, buildStart, buildEnd, ease } = timeline({ fps: FPS });

/** Dead ground: the photo's own brightness as dried, dusty brown. */
const dead = (l) => [0.12 + 0.62 * l, 0.09 + 0.48 * l, 0.05 + 0.24 * l];
/**
 * Each scene: its photo, where the heap stands, and which parts of the
 * photo die (tint returns null for what stays natural: sky, mist, water).
 */
const SCENES = {
  river: {
    pile: { cx: 330, base: 985, hw: 380, h: 420 },
    spread: 1.7,
    stainY: [960, 1080],
    tint(l, r, g, b, x, y) {
      const skyline = x < 590 ? 398 + (x / 590) * 368 : 640 + Math.max(0, (x - 760) * -0.1);
      if (y < skyline + 10) return null;
      if (y > 840 && l > 0.4 && Math.max(r, g, b) - Math.min(r, g, b) < 0.2) return null;
      return dead(l);
    },
  },
  terraces: {
    photo: "public/hackathon/poster/elemental/bg/terraces-rawpixel-3288128.jpg",
    cropX: 450, // the huts on the right stay out of frame
    pile: { cx: 540, base: 1300, hw: 430, h: 540 },
    spread: 1.55, // the far end of the terraces stays green: alive next to dead
    // Only the near terraces die, not the far mountain in the mist.
    region: (x, y) => y > ridge(x) - 6,
    stainY: [1180, 1350],
    tint(l, r, g, b) {
      // The mist and sky stay as they are; the terraces die.
      if (l > 0.5 && Math.max(r, g, b) - Math.min(r, g, b) < 0.12) return null;
      return dead(l);
    },
  },
};
const SCENE = SCENES[SCENE_NAME];
/** The near terraces' skyline in the terraces crop (measured on the photo). */
function ridge(x) {
  const P = [[0, 1000], [90, 965], [180, 934], [270, 871], [360, 818], [450, 771], [540, 742], [630, 709], [720, 677], [810, 662], [900, 627], [990, 596], [1080, 566]];
  for (let i = 1; i < P.length; i++)
    if (x <= P[i][0]) return P[i - 1][1] + ((x - P[i - 1][0]) / (P[i][0] - P[i - 1][0])) * (P[i][1] - P[i - 1][1]);
  return P[P.length - 1][1];
}
const PILE = SCENE.pile;

// ---------- the heap ----------
// A dump, not a cone: a big domed mound with two smaller ones slumped
// against it, like the poster's two heaps, each with a lumpy top.
const bumps = (x) => 0.8 + 0.3 * vnoise(x * 0.012, 0, 7) + 0.12 * vnoise(x * 0.04, 3, 8);
const MOUNDS = [
  { dx: 0, w: 1, h: 1 },
  { dx: -0.6, w: 0.5, h: 0.55 },
  { dx: 0.62, w: 0.45, h: 0.62 },
];
const halfWidth = (s) => PILE.hw * (0.25 + 0.75 * s);
/** The heap's top edge at x when it's at level s (Infinity where it isn't). */
function pileTop(x, s) {
  if (s <= 0) return Infinity;
  let best = 0;
  for (const m of MOUNDS) {
    // The side mounds start once the main one is a third grown.
    const ms = m.dx === 0 ? s : clamp((s - 0.3) / 0.7);
    if (ms <= 0) continue;
    const u = (x - PILE.cx - m.dx * PILE.hw) / (halfWidth(ms) * m.w);
    if (Math.abs(u) >= 1) continue;
    best = Math.max(best, PILE.h * m.h * ms * Math.pow(1 - u * u, 0.6));
  }
  return best > 0 ? PILE.base - best * bumps(x) : Infinity;
}
/** Inside the heap at level s, with a stepped, noisy edge like the poster's. */
function inPile(x, y, s) {
  const edge = 12 * (fbm(x * 0.03, y * 0.03, 41, 2) - 0.5);
  return y >= pileTop(x, s) + edge && y <= PILE.base + 14 * vnoise(x * 0.05, 1, 9);
}
/** The smallest level at which the heap covers (x, y), or 2 if never. */
function arrival(x, y) {
  if (!inPile(x, y, 1)) return 2;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 14; i++) {
    const m = (lo + hi) / 2;
    if (inPile(x, y, m)) hi = m;
    else lo = m;
  }
  return hi;
}

// The poster's e-waste, mostly casings, monitors and cables; boards are the
// accent. Each type is a little sprite on the 4px grid.
const WEIGHTS = { pcb: 2, phone: 3, cable: 4, keys: 3, monitor: 3, battery: 3 };
const pick = (r) => {
  const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  let t = r * total;
  for (const k of Object.keys(WEIGHTS)) if ((t -= WEIGHTS[k]) < 0) return k;
  return "monitor";
};
const FALL = 0.04; // in level units: how long a piece takes to drop in
const SP = 34; // spacing of pieces: the dark dot-matrix shows between them
const items = [];
for (let gy = PILE.base - PILE.h * 1.5; gy < PILE.base + 10; gy += SP * 0.75)
  for (let gx = PILE.cx - 1.2 * PILE.hw; gx < PILE.cx + 1.2 * PILE.hw; gx += SP) {
    const x = gx + (hash(gx, gy, 1) - 0.5) * SP;
    const y = gy + (hash(gx, gy, 2) - 0.5) * SP * 0.6;
    const a0 = arrival(x, y);
    if (a0 > 1.01) continue;
    // Arrive a little early, so even the last piece has landed by the end.
    items.push({ x, y, a: a0 * (1 - FALL), type: pick(hash(gx, gy, 3)), k: items.length });
  }
items.sort((a, b) => a.y - b.y); // back to front

const r = (k, i) => hash(k, i, 111);
/** Draw one piece, through dot(x, y, colour), on the 4px grid. */
function drawPiece(it, dot) {
  const { k, x, y, type } = it;
  if (type === "pcb") {
    // Circuit board, slightly tilted, with traces, pads and a chip.
    const w = 10 + Math.floor(r(k, 4) * 8);
    const hh = 5 + Math.floor(r(k, 5) * 5);
    const tilt = (r(k, 6) - 0.5) * 0.5;
    for (let j = 0; j < hh; j++)
      for (let i = 0; i < w; i++) {
        let c = (i + j) % 7 === 0 ? PX.pcbDark : PX.pcb;
        if (j === Math.floor(hh / 2) || i % 5 === 2) c = PX.trace;
        if ((i * 3 + j * 5) % 11 === 0) c = PX.gold;
        if (i > w / 2 - 2 && i < w / 2 + 2 && j > 0 && j < hh - 1) c = PX.chip;
        dot(x + (i - w / 2) * C, y + (j - hh / 2) * C + (i - w / 2) * tilt * C, c);
      }
  } else if (type === "phone") {
    // A phone with a cracked screen.
    for (let j = 0; j < 10; j++)
      for (let i = 0; i < 6; i++) {
        const edge = i === 0 || j === 0 || i === 5 || j === 9;
        const crack = Math.abs(i - (j * 0.6 + 1)) < 0.6 || Math.abs(i - (10 - j) * 0.5) < 0.5;
        dot(x + i * C, y + j * C * 0.7, edge ? PX.plastic[3] : crack ? PX.glass : PX.screen);
      }
  } else if (type === "cable") {
    // A loop of cable.
    const c = PX.wires[Math.floor(r(k, 7) * PX.wires.length)];
    const rad = 10 + r(k, 8) * 16;
    for (let t = 0; t < Math.PI * 1.7; t += 0.1) dot(x + Math.cos(t + k) * rad, y + Math.sin(t + k) * rad * 0.45, c);
  } else if (type === "keys") {
    // Keyboard keys and casing.
    const c = PX.plastic[Math.floor(r(k, 9) * 3)];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 8; i++) dot(x + i * C * 1.5, y + j * C * 1.5, (i + j) % 2 ? c : PX.plastic[1]);
  } else if (type === "monitor") {
    // A monitor or casing: a plastic box, a dark screen with a glare.
    const w = 10 + Math.floor(r(k, 11) * 7);
    const hh = 7 + Math.floor(r(k, 12) * 5);
    const shell = PX.plastic[Math.floor(r(k, 13) * 4)];
    const screen = r(k, 14) < 0.65;
    for (let j = 0; j < hh; j++)
      for (let i = 0; i < w; i++) {
        const inner = screen && i > 0 && j > 0 && i < w - 1 && j < hh - 1;
        const glare = inner && i === j + 1;
        dot(x + i * C - (w * C) / 2, y + j * C - (hh * C) / 2, glare ? PX.glass : inner ? PX.screen : (i + j) % 6 === 0 ? PX.plastic[1] : shell);
      }
  } else {
    // A battery.
    const c = PX.battery[Math.floor(r(k, 10) * PX.battery.length)];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) dot(x + i * C, y + j * C, i === 5 ? PX.gold : j === 0 ? PX.plastic[2] : c);
  }
}

// ---------- frames ----------
freshTmp(TMP);
const plate = await loadPlate({ photo: SCENE.photo, cropX: SCENE.cropX, river: !SCENE.photo, tmp: TMP });
// The ground dies outward from the heap.
const front = sicknessFront({ ox: PILE.cx, oy: PILE.base, spread: SCENE.spread });
const RUNOFF = [hex("#4a3c2c"), hex("#1c1712")];
const events = [];
// Every piece makes a sound as it lands (the sound script reads these types).
const SOUND = { pcb: "pcb", phone: "phone", cable: "cable", keys: "cable", monitor: "monitor", battery: "can" };
for (const it of items) events.push({ t: timeOf(it.a + FALL), x: it.x / W, type: SOUND[it.type], size: it.type === "monitor" ? 30 : 14 });

for (let f = 0; f < N; f++) {
  const s = levelAt(f);
  const t = f / FPS;
  const img = plateImage(plate);

  // The ground dying: the poster's poisoned-river treatment in dead mustard,
  // with a dot-screen band along the front.
  spreadSickness(img, { front, s, tint: SCENE.tint, tintAlpha: 0.7, tones: TONES.dead, toneGain: 5, toneBias: -0.55, density: 0.4, hi: PX.mustard, lo: hex("#2b241b"), t, drift: [-8, 0], seed: 47, region: SCENE.region });

  if (s > 0) {
    // How wide the heap is now, side mounds included.
    const hw = halfWidth(Math.max(s, 0.02)) * (s > 0.3 ? 1 + 0.15 * clamp((s - 0.3) / 0.7) : 1);
    // Shadow on the ground under the heap.
    for (let y = PILE.base - 40; y < Math.min(H, PILE.base + 46); y++)
      for (let x = Math.max(0, Math.floor(PILE.cx - hw * 1.15)); x < Math.min(W, PILE.cx + hw * 1.15); x++) {
        const d = Math.hypot((x - PILE.cx) / (hw * 1.15), (y - PILE.base - 6) / 40);
        if (d < 1) put(img, x, y, [0.05, 0.05, 0.04], 0.4 * (1 - d));
      }
    // Runoff: dark seep spreading from the foot, as a dot screen.
    for (let y = SCENE.stainY[0]; y < SCENE.stainY[1]; y += C)
      for (let x = 0; x < W; x += C) {
        const d = Math.hypot((x - PILE.cx) / (PILE.hw * 1.3), (y - PILE.base) / 80);
        const v = s * 1.4 - d + 0.35 * (vnoise(x * 0.02, y * 0.05, 31) - 0.5);
        if (v > bayer(x / C, y / C) * 0.7) rect(img, x, y, C, v > 0.35 ? RUNOFF[1] : RUNOFF[0], 0.85);
      }
    // Underlay: the photo as a dark dot-matrix, so the heap keeps its light.
    const topY = Math.max(0, Math.floor(PILE.base - PILE.h * 1.3));
    for (let x = Math.max(0, Math.floor(PILE.cx - hw * 1.2)); x < Math.min(W, PILE.cx + hw * 1.2); x++)
      for (let y = topY; y < Math.min(H, PILE.base + 14); y++) if (inPile(x, y, s)) dotMatrix(img, x, y);
  }

  // The pieces: landed ones in the heap, darker lower down, then the ones
  // still falling in.
  const falling = [];
  for (const it of items) {
    if (it.a > s) continue;
    const p = (s - it.a) / FALL;
    if (p < 1) {
      falling.push([it, p]);
      continue;
    }
    const top = pileTop(it.x, s);
    drawPiece(it, (x, y, c) => {
      // Pieces poke a little out of the heap's edge, so the skyline is jagged.
      if (y < pileTop(x, s) - 10 || y > PILE.base + 12) return;
      const v = clamp((y - top) / Math.max(PILE.base - top, 1));
      const u = clamp((x - PILE.cx) / halfWidth(s), -1, 1);
      const k = (1 - 0.45 * v) * (1 - 0.12 * u);
      rect(img, Math.round(x / C) * C, Math.round(y / C) * C, C, c.map((ch) => clamp(ch * k)));
    });
  }
  for (const [it, p] of falling) {
    const dy = -Math.round(((1 - p) * (1 - p) * 200) / C) * C;
    drawPiece(it, (x, y, c) => rect(img, Math.round(x / C) * C, Math.round((y + dy) / C) * C, C, c));
  }

  // Loose wires trailing off the heap, and spilled pieces at its foot.
  for (let k = 0; k < Math.round(12 * s); k++) {
    let x = PILE.cx + (r(k, 20) - 0.5) * halfWidth(s) * 1.9;
    let y = PILE.base - 6;
    const c = PX.wires[k % PX.wires.length];
    for (let i = 0; i < 22; i++) {
      x += (r(k, 30 + i) - 0.5) * 10;
      y += r(k, 60 + i) * 3;
      rect(img, Math.round(x / C) * C, Math.round(y / C) * C, C, c, 0.95);
    }
  }
  for (let k = 0; k < Math.round(16 * s); k++) {
    const x = PILE.cx + (r(k, 80) - 0.5) * halfWidth(s) * 2.4;
    const y = PILE.base + 4 + r(k, 81) * 30;
    drawPiece({ k: 900 + k, x, y, type: ["battery", "phone", "keys"][k % 3] }, (xx, yy, c) => rect(img, Math.round(xx / C) * C, Math.round(yy / C) * C, C, c.map((ch) => ch * 0.8)));
  }

  // White glints flicker on the screens once it's big: the dump catches the light.
  if (s > 0.5)
    for (let k = 0; k < 18; k++) {
      const it = items[Math.floor(r(k, 90) * items.length)];
      if (it.type !== "monitor" || it.a > s || hash(k, Math.floor(t * 6), 91) < 0.6) continue;
      rect(img, Math.round(it.x / 8) * 8, Math.round((it.y - 12) / 8) * 8, 8, PX.white);
    }

  // Flies over the top once it's big.
  if (s > 0.75) {
    const n = Math.round((14 * (s - 0.75)) / 0.25);
    for (let k = 0; k < n; k++) {
      const x = PILE.cx + Math.sin(t * (2.1 + k * 0.37) + k) * (60 + 20 * k) + Math.sin(t * 7.3 + k * 2) * 12;
      const y = PILE.base - PILE.h * 0.98 - 30 + Math.cos(t * (1.7 + k * 0.29) + k * 1.3) * 45 + Math.sin(t * 9 + k) * 8;
      rect(img, Math.round(x / C) * C, Math.round(y / C) * C, C, PX.ink);
    }
  }

  await writeFrame(img, f, TMP, WIDTH);
  process.stdout.write(`\rframe ${f + 1}/${N}`);
}
process.stdout.write("\n");

// ---------- sound and encode ----------
const eventsPath = join(OUT, `earth-events-${SCENE_NAME}.json`);
writeFileSync(eventsPath, JSON.stringify({ fps: FPS, duration, buildStart, buildEnd, ease, events }, null, 1));
const wav = join(TMP, "earth.wav");
execFileSync("python3", [join(ROOT, "scripts/render-elemental-earth-sound.py"), eventsPath, wav, ...(AMBIENCE ? ["--ambience", AMBIENCE] : [])], { stdio: "inherit" });
const mp4 = join(OUT, `elemental-earth-${SCENE_NAME}.mp4`);
const gif = join(OUT, `elemental-earth-${SCENE_NAME}.gif`);
encode({ tmp: TMP, fps: FPS, wav, mp4, gif });
console.log(`✅ ${mp4}\n✅ ${gif}`);
