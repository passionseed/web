/**
 * The key poster's pixel look, as parts the element videos share
 * (render-elemental-<element>.mjs). Ported from render-elemental-plate.mjs,
 * which made the look for the poster (see its header for where it comes
 * from). Every function draws on a Float32Array RGB image (0..1, W x H),
 * the kind elemental-scene.mjs's plateImage() and painter() use.
 *
 * The rules (brand page: "only the pixels are loud; the photo stays natural"):
 * - The photo stays the photo: its own colours, a little film fade, grain.
 *   No grade over the whole frame. A part of the place goes sick only where
 *   the element's pixels cover it (spreadSickness).
 * - Smooth light first (glow, flame, haze), then pixelate part of it, so
 *   the pixels inherit real light and shape (fire, haze + dither).
 * - Pixels are made from what's underneath: mosaics of the photo's own
 *   brightness quantized to 3 or 4 tones per element, ordered (Bayer)
 *   dither, dot screens. Never random colours per cell.
 * - A few flat, one-colour stepped shapes on a coarse grid (flatShape:
 *   flat red, flat blue, acid green, violet), and white checker sparks.
 * - Grids: 4px for small things (e-waste), 8px for smoke, 10 to 12px for
 *   mosaics, 14px for sparks and checker.
 * - Things stand on something: a dark dot-matrix base (dotMatrix) or a
 *   contact shadow, and light what's around them (fire glow).
 * - Grain over everything at the end, pixels included (writeFrame).
 * - Loud, clean colours from the poster (PX), not drab ones. The photo
 *   around them stays natural, which is what makes them read as damage.
 */
import sharp from "sharp";

import { H, W, bayer, clamp, fbm, hash, hex, mix, smooth } from "./elemental-scene.mjs";

// ---------- the poster's colours ----------
export const PX = {
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
  ashLight: hex("#d2cdc3"),
  // Poisoned water and plants.
  g0: hex("#0e1d06"),
  g1: hex("#244710"),
  g2: hex("#4a7d1a"),
  g3: hex("#8dbd3c"),
  acid: hex("#84c424"),
  // Smog and dust.
  smogA: hex("#b39a48"),
  smogB: hex("#7a6a45"),
  mustard: hex("#cdb047"),
  smogPale: hex("#e6e1cb"),
  smokeHaze: hex("#8a857c"),
  // Aether (brand.ts): "purple, ethereal".
  violet: hex("#9d7bff"),
  lilac: hex("#e4d8ff"),
  violetDeep: hex("#3b2a78"),
  // E-waste (the poster's heap).
  pcb: hex("#33603e"),
  pcbDark: hex("#1d4a29"),
  trace: hex("#7aa266"),
  gold: hex("#d2a63a"),
  chip: hex("#141414"),
  screen: hex("#0f1418"),
  glass: hex("#9fb6c4"),
  plastic: [hex("#c9c4b8"), hex("#8f8a80"), hex("#d9d4c6"), hex("#5c5a55")],
  wires: [hex("#141414"), hex("#c23a2a"), hex("#2f5fa8"), hex("#d8b23a"), hex("#e8e6de")],
  battery: [hex("#2a2a2a"), hex("#c76a2a"), hex("#3a6fb0")],
};
/** Four-tone ramps, dark to light, for mosaics and dither. */
export const TONES = {
  toxic: [PX.g0, PX.g1, PX.g2, PX.g3],
  smoke: [hex("#34312d"), hex("#5c5852"), hex("#8f8a80"), hex("#c9c4b8")],
  dead: [hex("#2b241b"), PX.smogB, PX.smogA, PX.mustard],
  burnt: [PX.ink, hex("#3a2a20"), PX.deep, PX.ash],
  fire: [PX.red, PX.orange, PX.cream, PX.white],
  aether: [PX.violetDeep, hex("#5b45b8"), PX.violet, PX.lilac],
};

// ---------- drawing ----------
export const lumAt = (img, x, y) => {
  const i = (clamp(Math.round(y), 0, H - 1) * W + clamp(Math.round(x), 0, W - 1)) * 3;
  return 0.2126 * img[i] + 0.7152 * img[i + 1] + 0.0722 * img[i + 2];
};
export function put(img, x, y, c, a = 1) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
  const i = (y * W + x) * 3;
  for (let k = 0; k < 3; k++) img[i + k] = mix(img[i + k], c[k], a);
}
export function screen(img, x, y, c, a = 1) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
  const i = (y * W + x) * 3;
  for (let k = 0; k < 3; k++) img[i + k] = mix(img[i + k], 1 - (1 - img[i + k]) * (1 - c[k]), a);
}
/** A square of side s with its top-left at (x0, y0), in pixels. */
export function rect(img, x0, y0, s, c, a = 1) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  for (let y = y0; y < y0 + s; y++) for (let x = x0; x < x0 + s; x++) put(img, x, y, c, a);
}
/** Average brightness of the s x s square at (x0, y0). */
export function cellLum(img, x0, y0, s) {
  let l = 0;
  let n = 0;
  for (let y = y0; y < y0 + s; y += 2)
    for (let x = x0; x < x0 + s; x += 2) {
      l += lumAt(img, x, y);
      n++;
    }
  return l / Math.max(n, 1);
}
/** Pick one of `tones` (dark to light) for brightness l. */
export const toneOf = (tones, l, gain = 4.2, bias = -0.5) => tones[clamp(Math.floor(l * gain + bias), 0, tones.length - 1)];

/** Grid cells (top-left corners) of a stepped blob: an ellipse with a noisy edge. */
export function blobCells(cx, cy, rx, ry, cell, seed, edge = 0.45) {
  const cells = [];
  for (let y = Math.floor((cy - ry * 1.3) / cell) * cell; y <= cy + ry * 1.3; y += cell)
    for (let x = Math.floor((cx - rx * 1.3) / cell) * cell; x <= cx + rx * 1.3; x += cell) {
      const d = Math.hypot((x + cell / 2 - cx) / rx, (y + cell / 2 - cy) / ry);
      if (d + edge * (fbm(x * 0.03, y * 0.03, seed, 2) - 0.5) < 1) cells.push([x, y]);
    }
  return cells;
}
/** A flat, one-colour stepped shape on a coarse grid. */
export function flatShape(img, cx, cy, rx, ry, cell, c, seed, a = 1) {
  for (const [x, y] of blobCells(cx, cy, rx, ry, cell, seed)) rect(img, x, y, cell, c, a);
}
/**
 * Dark dot-matrix: two of every three pixels show the photo's own
 * brightness as grey, the rest is ink. The poster puts it under heaps and
 * the fire's burnt base, so matter keeps the photo's light.
 */
export function dotMatrix(img, x, y, a = 0.95, warm = 0) {
  const l = lumAt(img, x, y);
  put(img, x, y, x % 3 < 2 && y % 3 < 2 ? [l * 0.9 + warm * 0.1, l * 0.9, l * 0.85 - warm * 0.05] : [0.16, 0.16, 0.15], a);
}
/** One pixel of a dot screen between two colours, by the photo's brightness. */
export function dotScreen(img, x, y, hi, lo, gain = 1.25, a = 1) {
  put(img, x, y, lumAt(img, x, y) * gain > bayer(x, y) ? hi : lo, a);
}

// ---------- soft light layers ----------
/**
 * Paint soft light into a box, blur it, and lay it on the image. paintFn
 * gets paint(x, y, colour, alpha) in frame pixels. mode "normal" or
 * "screen"; `fixed` paints every pixel in one colour (keeps the blur clean).
 */
export async function glow(img, box, sigma, paintFn, { mode = "normal", fixed = null } = {}) {
  const pad = Math.ceil(sigma * 3);
  const x0 = Math.max(0, Math.floor(box[0] - pad));
  const y0 = Math.max(0, Math.floor(box[1] - pad));
  const x1 = Math.min(W, Math.ceil(box[2] + pad));
  const y1 = Math.min(H, Math.ceil(box[3] + pad));
  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) return;
  const layer = new Float32Array(w * h * 4);
  paintFn((x, y, c, a) => {
    x = Math.round(x) - x0;
    y = Math.round(y) - y0;
    if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return;
    const i = (y * w + x) * 4;
    const keep = 1 - a;
    for (let k = 0; k < 3; k++) layer[i + k] = layer[i + k] * keep + c[k] * a;
    layer[i + 3] = layer[i + 3] * keep + a;
  });
  const u8 = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h * 4; i++) u8[i] = Math.round(clamp(layer[i]) * 255);
  const { data } = await sharp(u8, { raw: { width: w, height: h, channels: 4 } })
    .blur(Math.max(0.3, sigma))
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3] / 255;
      if (a <= 0.002) continue;
      const c = fixed ?? [0, 1, 2].map((k) => clamp(data[i + k] / 255 / Math.max(a, 1e-4)));
      if (mode === "screen") screen(img, x + x0, y + y0, c, a);
      else put(img, x + x0, y + y0, c, a);
    }
}

// ---------- ordered dither of a soft field ----------
/**
 * Smoke, haze, gas: a soft field (x, y) => 0..1 drawn as an ordered dither
 * on a `cell` grid in a few tones, so it fades into the photo in a pattern,
 * not a blur. toneIndex(x, y, d) picks the tone (default: denser is darker).
 */
export function dither(img, field, { box = [0, 0, W, H], cell = 8, tones = TONES.smoke, cut = 0.75, gain = 3, spread = 1.1, toneIndex, a = 0.92 } = {}) {
  for (let y = Math.floor(box[1] / cell) * cell; y < box[3]; y += cell)
    for (let x = Math.floor(box[0] / cell) * cell; x < box[2]; x += cell) {
      const f = field(x + cell / 2, y + cell / 2);
      if (f <= 0) continue;
      const d = f * gain + (bayer(x / cell, y / cell) - 0.5) * spread;
      if (d < cut) continue;
      const k = toneIndex ? toneIndex(x, y, d - cut) : tones.length - 1 - clamp(Math.floor(d - cut), 0, tones.length - 1);
      rect(img, x, y, cell, tones[clamp(k, 0, tones.length - 1)], a);
    }
}

// ---------- the place going sick ----------
/**
 * The poster's poisoned river, for any part of any photo: where the front
 * has reached, the photo is tinted by its own brightness (tint(l, r, g, b)
 * returns a colour, or null to leave that pixel alone, like the sky), part
 * of it turns to a mosaic of `tones` from the photo's brightness, drifting
 * with the noise, and a dot-screen band runs along the front.
 *
 * front(cx, cy, s) is elemental-scene.mjs's sicknessFront on the same
 * `cell` grid. s is the level now; band is how far behind the front the
 * dot screen runs (in level units). density 0..1 is how much of the sick
 * area becomes mosaic (toneGain/toneBias shift which tones it uses). t (seconds) and drift (px/s) move the pattern.
 */
export function spreadSickness(img, { front, s, cell = 12, tint, tintAlpha = 0.82, tones, toneGain = 4.2, toneBias = -0.5, density = 0.42, band = 0.06, hi, lo, t = 0, drift = [-20, 0], seed = 31, region = () => true }) {
  if (s <= 0) return;
  const nx = Math.ceil(W / cell);
  const ny = Math.ceil(H / cell);
  for (let cy = 0; cy < ny; cy++)
    for (let cx = 0; cx < nx; cx++) {
      const x0 = cx * cell;
      const y0 = cy * cell;
      if (!region(x0 + cell / 2, y0 + cell / 2) || !front(cx, cy, s)) continue;
      const fresh = !front(cx, cy, Math.max(0, s - band));
      // The tint, pixel by pixel, keeps the photo's light.
      let touched = 0;
      for (let y = y0; y < Math.min(H, y0 + cell); y++)
        for (let x = x0; x < Math.min(W, x0 + cell); x++) {
          const i = (y * W + x) * 3;
          const l = 0.2126 * img[i] + 0.7152 * img[i + 1] + 0.0722 * img[i + 2];
          const c = tint(l, img[i], img[i + 1], img[i + 2], x, y);
          if (!c) continue;
          touched++;
          if (fresh && hi) put(img, x, y, l * 1.25 > bayer(x, y) ? hi : lo, 1);
          else put(img, x, y, c, tintAlpha);
        }
      if (fresh || !touched || touched < cell * cell * 0.5) continue;
      // Mosaic patches: a slow noise that drifts, so the sick part moves.
      const n = fbm((x0 - drift[0] * t) * 0.012, (y0 - drift[1] * t) * 0.03, seed, 3);
      if (n < 1 - density) continue;
      rect(img, x0, y0, cell, toneOf(tones, cellLum(img, x0, y0, cell), toneGain, toneBias));
    }
}

// ---------- fire ----------
/** The poster's fire, as tongues relative to its centre (scale 1 = poster size). */
const TONGUES = [
  { dx: 0, w: 250, h: 430, lean: -40 },
  { dx: -78, w: 140, h: 270, lean: -50 },
  { dx: 70, w: 150, h: 320, lean: -20 },
  { dx: 10, w: 110, h: 520, lean: -70 },
];
function flameColour(v) {
  const stops = [
    [0.12, PX.deep],
    [0.32, PX.red],
    [0.52, PX.orange],
    [0.74, PX.yellow],
    [0.9, PX.white],
  ];
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++)
    if (v <= stops[i][0]) {
      const k = (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return [0, 1, 2].map((j) => mix(stops[i - 1][1][j], stops[i][1][j], k));
    }
  return PX.white;
}
/**
 * The poster's fire at (x, base): glow on the sky and the ground, a burnt
 * dot-matrix base, the smooth flame with a dithered edge, then its upper
 * part as a mosaic with a white stepped crown, flat red and blue shapes,
 * a column of white and blue checker sparks, and embers on the ground.
 *
 * scale sizes it (1 = the poster's fire, about 520px tall), level 0..1
 * grows it from a small flame, t is time in seconds (it flickers and its
 * licks rise), seed makes each fire different. lean < 0 leans it left.
 */
export async function fire(img, { x: FX, base: FB, scale = 1, level = 1, t = 0, seed = 0, sparks = true, shapes = true, glowAmount = 1, lean = 1, wind = -80 }) {
  if (level <= 0) return;
  const S = scale;
  const tongues = TONGUES.map((g, i) => ({ cx: FX + g.dx * S, w: g.w * S, h: g.h * S, lean: g.lean * S * lean, i }));
  const field = (x, y) => {
    let best = 0;
    for (const g of tongues) {
      const flick = vflick(g.i + seed * 7, t);
      const gh = g.h * (1 + 0.16 * flick) * (0.08 + 0.92 * level);
      const tt0 = (FB - y) / gh;
      if (tt0 < -0.08 || tt0 > 1) continue;
      const tt = Math.max(tt0, 0);
      // The licks rise: the wobble pattern travels up the flame.
      const wob = 46 * S * (fbm((x / S) * 0.012, ((y / S) + 133 * t) * 0.02 + 3 + seed, 5, 3) - 0.5) * (0.3 + tt);
      const c = g.cx + g.lean * Math.pow(tt, 1.6) + wob;
      const hw = (g.w / 2) * (0.45 + 0.55 * level) * Math.pow(1 - tt, 0.7) * (tt0 < 0 ? 1 + tt0 * 6 : 1);
      const d = Math.abs(x - c) / Math.max(hw, 1);
      if (d >= 1) continue;
      best = Math.max(best, (1 - d * d) * Math.pow(1 - tt, 0.45));
    }
    return best;
  };
  const top = FB - 600 * S;
  const box = [FX - 320 * S, top, FX + 280 * S, FB + 40 * S];

  // Glow on the sky and light on the ground around the base.
  const R = 380 * S;
  for (let y = Math.max(0, Math.floor(FB - 150 * S - R)); y < Math.min(H, FB + 80 * S); y++)
    for (let x = Math.max(0, Math.floor(FX - R)); x < Math.min(W, FX + R); x++) {
      const r = Math.hypot((x - FX) / R, (y - (FB - 150 * S)) / (360 * S));
      if (r < 1) put(img, x, y, PX.orange, 0.4 * glowAmount * level * Math.pow(1 - r, 1.7));
      const gr = Math.hypot((x - FX) / (320 * S), (y - (FB + 14 * S)) / (56 * S));
      if (gr < 1) screen(img, x, y, PX.yellow, 0.55 * glowAmount * level * Math.pow(1 - gr, 1.3));
    }
  // The plume the sparks ride on.
  await glow(img, [FX - 260 * S, FB - 900 * S, FX + 200 * S, FB], 22 * S, (paint) => {
    for (let s = 0; s < 1; s += 0.004) {
      const px = FX - 40 * S + 130 * S * Math.sin(s * 2.2) + (wind * S * s);
      const py = FB - (380 + s * 520) * S * (0.2 + 0.8 * level);
      const w = (50 + 90 * s) * S;
      for (let k = 0; k < 40; k++)
        paint(px + (hash(k, s * 1000, 3 + seed) - 0.5) * w * 2, py + (hash(k, s * 1000, 4 + seed) - 0.5) * 20, PX.orange, 0.12 * smooth(0.35, 1, level) * (1 - s * 0.7));
    }
  }, { fixed: PX.orange });

  // A dark burnt base, so the fire stands on something.
  const c8 = Math.max(4, Math.round(8 * S));
  for (const [x0, y0] of blobCells(FX + 10 * S, FB + 2 * S, 120 * S, 20 * S, c8, 69 + seed, 0.9))
    for (let y = y0; y < y0 + c8 + 2; y++)
      for (let x = x0; x < x0 + c8 + 2; x++) {
        const l = lumAt(img, x, y);
        put(img, x, y, x % 3 === 0 && y % 3 === 0 ? [l, l * 0.8, l * 0.6] : PX.ink, 0.92 * smooth(0, 0.3, level));
      }

  // Halo, then the smooth flame with a dithered edge.
  await glow(img, box, 26 * S, (paint) => {
    for (let y = Math.floor(box[1]); y < box[3]; y += 2)
      for (let x = Math.floor(box[0]); x < box[2]; x += 2) {
        const v = field(x, y);
        if (v > 0.02) for (let k = 0; k < 4; k++) paint(x + (k & 1), y + (k >> 1), PX.orange, 0.55 * smooth(0.02, 0.3, v));
      }
  }, { fixed: PX.orange });
  await glow(img, box, 0.8, (paint) => {
    for (let y = Math.max(0, Math.floor(box[1])); y < Math.min(H, box[3]); y++)
      for (let x = Math.max(0, Math.floor(box[0])); x < Math.min(W, box[2]); x++) {
        const v = field(x, y);
        if (v < 0.1) continue;
        const h = clamp((FB - y) / (520 * S));
        const fil = fbm((x / S) * 0.07, ((y / S) + 107 * t) * 0.009 + 9 + seed, 71, 3);
        const lick = v * (0.62 + 0.7 * fil) * (1 - 0.25 * h);
        const a = smooth(0.1, 0.42, lick) * (1 - 0.35 * h);
        // The edge is dithered on a 2px grid: it dissolves into the air.
        if (a < 0.98 && a < bayer(x >> 1, y >> 1)) continue;
        paint(x, y, flameColour(lick), 1);
      }
  });

  // Its upper part as a mosaic, a white stepped crown along its edge.
  const cell = Math.max(6, Math.round(10 * S));
  for (let y = Math.floor(top / cell) * cell; y < FB - 50 * S; y += cell)
    for (let x = Math.floor(box[0] / cell) * cell; x < box[2]; x += cell) {
      const v = field(x + cell * 0.6, y + cell * 0.6);
      const h = (FB - y) / (520 * S);
      const n = fbm((x / S) * 0.03, ((y / S) + 87 * t) * 0.03 + seed, 61, 2);
      if (((v > 0.12 && v < 0.3 && h > 0.12 && h < 0.6) || (v > 0.5 && h > 0.14 && h < 0.34)) && n > 0.52) {
        rect(img, x, y, cell, PX.white);
        continue;
      }
      if (v > 0.16 && n < 0.05 + h * 0.85) rect(img, x, y, cell, TONES.fire[clamp(Math.floor(v * 4.2), 0, 3)]);
    }
  if (shapes && level > 0.7) flatShape(img, FX - 22 * S, FB - 230 * S, 34 * S, 62 * S, Math.max(6, Math.round(14 * S)), PX.flatRed, 62 + seed);
  if (shapes && level > 0.85) flatShape(img, FX + 46 * S, FB - 330 * S, 18 * S, 46 * S, Math.max(6, Math.round(12 * S)), PX.flatBlue, 63 + seed);

  // Sparks: white and blue checker rising in a column and drifting with the wind.
  if (sparks) {
    const c2 = Math.max(6, Math.round(14 * S));
    const SPAN = 1.02;
    for (let id = 0; id < 1; id += 0.03) {
      const s = (id + t * 0.34) % SPAN;
      const px = FX - 40 * S + 130 * S * Math.sin(s * 2.2) + wind * S * s;
      const py = FB - (380 + s * 520) * S * (0.2 + 0.8 * level);
      const gen = Math.floor(id * 100 + t * 0.34 - s);
      for (let k = 0; k < 4; k++) {
        const r = (j) => hash(k + gen * 5, Math.round(id * 999), j + seed);
        if (s > level * 1.1 - 0.1 || r(64) > 0.42 - s * 0.22) continue;
        const x = Math.round((px + (r(65) - 0.5) * (80 + 120 * s) * S) / c2) * c2;
        const y = Math.round((py + (r(66) - 0.5) * 30 * S) / c2) * c2;
        rect(img, x, y, c2, r(67) < 0.86 ? PX.white : PX.flatBlue);
        if (r(68) < 0.6) rect(img, x + c2, y + c2, c2, PX.white);
        if (r(69) < 0.3) rect(img, x - c2, y + c2, c2, PX.white);
      }
    }
  }
  // Embers on the ground, flickering.
  const e5 = Math.max(4, Math.round(5 * S));
  const frame = Math.floor(t * 12);
  for (let k = 0; k < Math.round(40 * level); k++) {
    if (hash(k, frame, 84 + seed) < 0.25) continue;
    const x = Math.round((FX - 260 * S + hash(k, 1, 83 + seed) * 520 * S) / e5) * e5;
    const y = Math.round((FB - 10 * S + hash(k, 2, 83 + seed) * 50 * S) / e5) * e5;
    rect(img, x, y, e5, hash(k, 3 + frame, 83) < 0.5 ? PX.yellow : PX.orange, 0.9);
  }
}
/** A flicker that never repeats on a beat: smooth noise over time, -0.5..0.5. */
function vflick(i, t) {
  return fbm(i * 13.7, t * 2.2, 140, 2) - 0.5;
}
