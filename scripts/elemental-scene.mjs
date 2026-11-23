/**
 * Shared parts of the Elemental element videos (render-elemental-<element>.mjs):
 * a calm, healthy photo that one element corrupts from normal to sick, with
 * sound. Each element script builds its own corruption on top of these.
 *
 * The look is the key poster's (scripts/render-elemental-plate.mjs): its
 * pixel techniques are in elemental-pixel-kit.mjs, with the rules. In short:
 * - The photo stays a real, natural photo: no grade over the whole frame.
 *   Only the pixels are loud (brand page), and they are made from the
 *   photo underneath (mosaics, dither, dot screens) so they sit in it.
 * - The place goes sick as the element spreads, not just the spot it
 *   touches: a dithered pixel front spreads out from the source
 *   (sicknessFront) and the pixel kit's spreadSickness turns what it
 *   reaches into the element's mosaic.
 * - It builds gradually: clean for a moment, then a long build, then a hold.
 * - Film grain over everything at the end, pixels included.
 *
 * (makeSick, baseFrame, ambient and shade are from the earlier, realistic
 * look, kept for older renders.)
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const W = 1080;
export const H = 1350;

// ---------- command line ----------
export const arg = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
export const flag = (name) => process.argv.includes(name);

// ---------- small maths ----------
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export function hash(x, y, seed) {
  let h = Math.imul(x * 374761393 + y * 668265263 + seed * 1442695041, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function vnoise(x, y, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = (x - xi) * (x - xi) * (3 - 2 * (x - xi));
  const v = (y - yi) * (y - yi) * (3 - 2 * (y - yi));
  return mix(mix(hash(xi, yi, seed), hash(xi + 1, yi, seed), u), mix(hash(xi, yi + 1, seed), hash(xi + 1, yi + 1, seed), u), v);
}
export function fbm(x, y, seed, oct = 4) {
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
export const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
export const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
export const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

// ---------- timeline ----------
/**
 * Clean for `clean` seconds, the element builds for `build`, then it holds.
 * levelAt(f) is how far the element has got at frame f (0..1); it starts
 * slow and speeds up (ease > 1). timeOf(a) is when it reaches level a, in
 * seconds, for timing sounds to the picture.
 */
export function timeline({ fps = 24, clean = 1.5, build = 7, hold = 2.5, ease = 1.5 } = {}) {
  const CLEAN = Math.round(fps * clean);
  const BUILD = Math.round(fps * build);
  const HOLD = Math.round(fps * hold);
  const N = CLEAN + BUILD + HOLD;
  return {
    fps,
    N,
    CLEAN,
    BUILD,
    HOLD,
    levelAt: (f) => (f < CLEAN ? 0 : f >= CLEAN + BUILD ? 1 : Math.pow((f - CLEAN + 1) / BUILD, ease)),
    timeOf: (a) => (CLEAN + Math.pow(clamp(a), 1 / ease) * BUILD - 1) / fps,
    duration: N / fps,
    buildStart: CLEAN / fps,
    buildEnd: (CLEAN + BUILD) / fps,
    ease,
  };
}

// ---------- the photo ----------
/**
 * The clean photo as an RGB byte buffer at W x H: cropped to the poster
 * (cropX/cropY in source pixels, centred if left out) and faded a little,
 * like film. scene "river" uses the key visual's own plate (blue sky).
 */
export async function loadPlate({ photo, cropX, cropY, river = false, tmp }) {
  if (river) {
    mkdirSync(tmp, { recursive: true });
    const platePath = join(tmp, "plate-clean.png");
    execFileSync("node", [join(ROOT, "scripts/render-elemental-plate.mjs"), "--sky", "blue", "--corrupt", "0", "--no-grain", "--out", platePath], { stdio: "ignore" });
    return (await sharp(platePath).removeAlpha().raw().toBuffer({ resolveWithObject: true })).data;
  }
  const src = join(ROOT, photo);
  const meta = await sharp(src).metadata();
  // Cover: the largest W:H window that fits.
  let cw = Math.round((meta.height * W) / H);
  let ch = meta.height;
  if (cw > meta.width) {
    cw = meta.width;
    ch = Math.round((meta.width * H) / W);
  }
  const { data } = await sharp(src)
    .extract({ left: cropX ?? Math.round((meta.width - cw) / 2), top: cropY ?? Math.round((meta.height - ch) / 2), width: cw, height: ch })
    .resize(W, H)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const plate = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const r = data[i * 3] / 255;
    const g = data[i * 3 + 1] / 255;
    const b = data[i * 3 + 2] / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    [r, g, b].forEach((v, k) => (plate[i * 3 + k] = Math.round(clamp(mix(l, v, 0.88) * 0.97 + 0.02) * 255)));
  }
  return plate;
}

/** The clean photo as a Float32Array RGB image (0..1) to paint on. */
export function plateImage(plate) {
  const img = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H * 3; i++) img[i] = plate[i] / 255;
  return img;
}

// ---------- the place going sick ----------
/** Ready-made sick colours, from a pixel's own values. */
export const sickColours = {
  /** Sky, cloud or mist: a flat, dirty yellow-grey haze. */
  haze(r, g, b, l) {
    const k = 0.55 + 0.45 * l;
    return [0.74 * k, 0.68 * k, 0.53 * k].map((v, j) => mix(v, [r, g, b][j], 0.12));
  },
  /** Grass, rice, hills: dried out to straw and dead brown. */
  dried: (l) => [l * 1.3 + 0.03, l * 1.08 + 0.02, l * 0.55].map((v) => clamp(v * 0.92)),
  /** Ground and stone: darker, colour drained. */
  drained: (l) => [l * 0.82 + 0.02, l * 0.76 + 0.02, l * 0.66 + 0.02],
  /** Water: murky brown-grey. */
  murky: (l) => [0.46, 0.42, 0.33].map((v) => v * (0.55 + 0.7 * l)),
};

/**
 * For every pixel, what it looks like once the place is sick.
 * sickOf(r, g, b, l, sat, x, y) returns an [r, g, b] colour (0..1).
 */
export function makeSick(plate, sickOf) {
  const sick = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      const r = plate[i] / 255;
      const g = plate[i + 1] / 255;
      const b = plate[i + 2] / 255;
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      const c = sickOf(r, g, b, l, sat, x, y);
      for (let k = 0; k < 3; k++) sick[i + k] = clamp(c[k] * 0.9);
    }
  return sick;
}

/**
 * The sickness spreading out from a source (ox, oy) as a dithered pixel
 * front on a `cell` grid. Returns (cx, cy, s) => 0 or 1 for grid cell
 * (cx, cy) at level s. `spread` is how far it reaches by s = 1, in units of
 * (rx, ry); raise it until the far corner is reached just before the end.
 */
export function sicknessFront({ ox, oy, rx = 900, ry = 700, spread = 2, cell = 12, seed = 44 }) {
  return (cx, cy, s) => {
    if (s <= 0) return 0;
    const x = cx * cell;
    const y = cy * cell;
    const d = Math.hypot((x - ox) / rx, (y - oy) / ry);
    const v = (s * spread - d + 0.3 * (vnoise(x * 0.01, y * 0.01, seed) - 0.5)) * 3;
    if (v >= 1) return 1;
    if (v <= 0) return 0;
    return v > bayer(cx, cy) ? 1 : 0;
  };
}

/**
 * The frame's background at level s: the clean photo where the front hasn't
 * reached, the sick one where it has, and a little dimmer everywhere as it
 * goes. Returns a Float32Array RGB image (0..1) to paint on.
 */
export function baseFrame(plate, sick, front, s, { cell = 12, amount = 0.92, dim = 0.18 } = {}) {
  const img = new Float32Array(W * H * 3);
  for (let cy = 0; cy < Math.ceil(H / cell); cy++)
    for (let cx = 0; cx < Math.ceil(W / cell); cx++) {
      const m = Math.max(front(cx, cy, s) * amount, s * dim);
      for (let y = cy * cell; y < Math.min(H, cy * cell + cell); y++)
        for (let x = cx * cell; x < Math.min(W, cx * cell + cell); x++) {
          const i = (y * W + x) * 3;
          for (let k = 0; k < 3; k++) img[i + k] = mix(plate[i + k] / 255, sick[i + k], m);
        }
    }
  return img;
}

// ---------- painting ----------
/** Drawing helpers on a Float32Array RGB image. */
export function painter(img) {
  const put = (x, y, c, a = 1) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
    const i = (y * W + x) * 3;
    for (let k = 0; k < 3; k++) img[i + k] = mix(img[i + k], c[k], a);
  };
  const screen = (x, y, c, a = 1) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
    const i = (y * W + x) * 3;
    for (let k = 0; k < 3; k++) img[i + k] = mix(img[i + k], 1 - (1 - img[i + k]) * (1 - c[k]), a);
  };
  const get = (x, y) => {
    const i = (clamp(Math.round(y), 0, H - 1) * W + clamp(Math.round(x), 0, W - 1)) * 3;
    return [img[i], img[i + 1], img[i + 2]];
  };
  /** A grid cell of size `size` at grid position (cx, cy). */
  const cellRect = (cx, cy, size, c, a = 1, dy = 0) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) put(cx * size + x, cy * size + y + dy, c, a);
  };
  /** Darken an ellipse softly: a contact shadow. */
  const shadow = (cx, cy, rx, ry, strength = 0.5) => {
    for (let y = Math.max(0, Math.floor(cy - ry)); y < Math.min(H, cy + ry); y++)
      for (let x = Math.max(0, Math.floor(cx - rx)); x < Math.min(W, cx + rx); x++) {
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
        if (d < 1) {
          const i = (y * W + x) * 3;
          const k = 1 - strength * Math.pow(1 - d, 1.4);
          for (let j = 0; j < 3; j++) img[i + j] *= k;
        }
      }
  };
  return { put, screen, get, cellRect, shadow };
}

/**
 * The scene's own light colour over a region, normalised so its mean is 1:
 * multiply a pixel element's colour by (0.75 + 0.25 * amb[k]) to sit it in
 * the scene's light.
 */
export function ambient(img, x0, y0, x1, y1) {
  const amb = [0, 0, 0];
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, y1); y += 7)
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, x1); x += 7) {
      const i = (y * W + x) * 3;
      for (let k = 0; k < 3; k++) amb[k] += img[i + k];
    }
  const m = (amb[0] + amb[1] + amb[2]) / 3;
  return amb.map((v) => v / Math.max(m, 1e-4));
}

/**
 * Light a pixel of a solid thing: base colour c, surface normal (nx, ny)
 * in screen space (y down; a surface facing up has ny < 0), light from
 * (lx, ly) (default above and a little left), ambient tint amb. Takes a
 * third of the colour out first, so it looks worn, not new.
 */
export function shade(c, nx, ny, { lx = -0.42, ly = -0.91, amb = [1, 1, 1], drab = 0.65, ambientLight = 0.3, gain = 0.85 } = {}) {
  const l0 = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  const nl = Math.hypot(nx, ny, 0.6);
  const d = clamp((lx * nx + ly * ny + 0.25) / nl);
  const light = ambientLight + gain * d;
  return c.map((v, k) => clamp(mix(l0, v, drab) * light * (0.75 + 0.25 * amb[k])));
}

// ---------- output ----------
/** Grain over everything, then write frame f as a PNG into tmp. */
export async function writeFrame(img, f, tmp, width = W) {
  const out = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = (hash(x, y, 99 + f * 3) + hash(x, y, 98 + f * 3) - 1) * 0.065;
      const i = (y * W + x) * 3;
      for (let k = 0; k < 3; k++) out[i + k] = Math.round(clamp(img[i + k] + n) * 255);
    }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } })
    .resize(width)
    .png({ compressionLevel: 3 })
    .toFile(join(tmp, `frame-${String(f).padStart(4, "0")}.png`));
}

/** A fresh temp folder for one render. */
export function freshTmp(path) {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
  return path;
}

/**
 * Encode the frames in tmp with the sound: an MP4 for Instagram (with
 * sound) and a silent GIF at 12fps and 720px. Removes tmp afterwards.
 */
export function encode({ tmp, fps, wav, mp4, gif, crf = 24 }) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", join(tmp, "frame-%04d.png"), ...(wav ? ["-i", wav] : []), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", String(crf), ...(wav ? ["-c:a", "aac", "-b:a", "192k", "-shortest"] : []), "-movflags", "+faststart", mp4]);
  if (gif)
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", join(tmp, "frame-%04d.png"), "-vf", "fps=12,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=256[p];[b][p]paletteuse=dither=bayer:bayer_scale=3", "-loop", "0", gif]);
  rmSync(tmp, { recursive: true, force: true });
}
