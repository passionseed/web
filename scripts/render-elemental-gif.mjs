#!/usr/bin/env node
/**
 * Animates the Elemental key visual: the fire flickers, sparks rise, the
 * smog drifts, the toxic water shimmers and the film grain moves, on a
 * seamless 3-second loop. The type stays still on top.
 *
 *   node scripts/render-elemental-gif.mjs --out <dir> [--sky blue|grey]
 *        [--frames 36] [--fps 12] [--width 720] [--base http://localhost:3010]
 *        [--story] [--layers --hold 2.5 --jobs 6]
 *
 * --story tells it as a story instead: the place starts clean and healthy,
 * then pixels corrupt it bit by bit (the e-waste is dumped, the river turns
 * toxic, the fire takes hold, its smoke spreads), and each element glitches
 * its letter of "Elemental" into a pixel glyph as it arrives. It holds on
 * the full poster, and
 * a short glitch snaps it back to clean so it loops. About 10 seconds.
 * Writes elemental-<sky>-story.gif and .mp4.
 *
 * --layers writes each frame as two full-size PNGs instead, scene-NNN.png
 * (the place with every element and the fire letters) and type-NNN.png (the
 * type on transparent), so a video can move them separately in depth
 * (scripts/render-elemental-teaser.py). --hold sets how long the story holds
 * the full poster, in seconds; with --layers there's no snap back to clean.
 *
 * Needs the poster route running (scripts/studio-server.sh) and ffmpeg.
 * Writes <dir>/elemental-<sky>.gif and <dir>/elemental-<sky>.mp4 (the MP4
 * is what Instagram takes; it doesn't play GIFs).
 */
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

import { stage } from "./elemental-stages.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const OUT = resolve(arg("--out", "output/marketing/elemental-gif"));
const SKY = arg("--sky", "blue");
const FRAMES = Number(arg("--frames", 36));
const FPS = Number(arg("--fps", 12));
const WIDTH = Number(arg("--width", 720));
const BASE = arg("--base", "http://localhost:3010");
const ID = SKY === "blue" ? "elemental-key-blue" : "elemental-key";
const STORY = process.argv.includes("--story");
const LAYERS = process.argv.includes("--layers");
const HOLD_S = Number(arg("--hold", 2.5));
const JOBS = Number(arg("--jobs", 6));
const NAME = `elemental-${SKY}${STORY ? "-story" : ""}`;
const TMP = join(OUT, `.frames-${NAME}`);
const run = promisify(execFile);

/**
 * The story's frames: each says how corrupted the place is (0 clean, 1 the
 * poster), which frame of the elements' own motion loop to draw, and how hard
 * to glitch it. The ramp is long so every element gets its moment.
 */
function storyFrames() {
  const CLEAN = Math.round(FPS * 1.2);
  const RAMP = Math.round(FPS * 6);
  const FULL = Math.round(FPS * HOLD_S);
  const list = [];
  let motion = 0;
  const glitchAt = (i) => {
    // A few glitch frames while it spreads, more as it gets worse.
    const r = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    return r < 0.06 + 0.16 * (i / RAMP) ? 0.25 + 0.5 * r : 0;
  };
  for (let i = 0; i < CLEAN; i++) list.push({ corrupt: 0, motion: motion++, glitch: 0 });
  for (let i = 0; i < RAMP; i++) list.push({ corrupt: (i + 1) / RAMP, motion: motion++, glitch: glitchAt(i) });
  for (let i = 0; i < FULL; i++) list.push({ corrupt: 1, motion: motion++, glitch: 0 });
  // The snap back: corrupted, then clean, both torn by a hard glitch.
  if (!LAYERS) {
    list.push({ corrupt: 1, motion: motion++, glitch: 1 });
    list.push({ corrupt: 0, motion: motion++, glitch: 1 });
    list.push({ corrupt: 0, motion: motion++, glitch: 0.4 });
  }
  // Each letter turns once its element is half there; the title glitches
  // on that frame and the next.
  const glyphs = (c) => ORDER.filter((k) => stage(k, c) >= 0.5).length;
  return list.map((f, i) => {
    const n = glyphs(f.corrupt);
    const prev = i > 0 ? glyphs(list[i - 1].corrupt) : n;
    const prev2 = i > 1 ? glyphs(list[i - 2].corrupt) : prev;
    return { ...f, motion: f.motion % FRAMES, glyphs: n, titleGlitch: n !== prev ? 1 : prev !== prev2 ? 0.5 : f.glitch >= 1 ? 1 : 0 };
  });
}

/**
 * Tears a frame like a corrupted file: bands of rows slide sideways and the
 * red channel slips further than the rest. Seeded, so runs are the same.
 */
async function glitch(png, amount, seed, band = null) {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const out = Buffer.from(data);
  let st = seed * 2654435761 + 1;
  const rnd = () => ((st = Math.imul(st ^ (st >>> 15), 2246822519) + 1) >>> 0) / 4294967296;
  const bands = Math.round(3 + 10 * amount);
  for (let b = 0; b < bands; b++) {
    const y0 = band ? band[0] + Math.floor(rnd() * (band[1] - band[0])) : Math.floor(rnd() * h);
    const bh = Math.round((8 + rnd() * 60 * amount) / 4) * 4;
    const dx = Math.round(((rnd() - 0.5) * 2 * (20 + 90 * amount)) / 4) * 4;
    const split = Math.round(6 + 14 * amount * rnd());
    for (let y = y0; y < Math.min(h, y0 + bh); y++)
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * ch;
        const sx = Math.min(w - 1, Math.max(0, x - dx));
        const rx = Math.min(w - 1, Math.max(0, x - dx - split));
        out[o] = data[(y * w + rx) * ch];
        out[o + 1] = data[(y * w + sx) * ch + 1];
        out[o + 2] = data[(y * w + sx) * ch + 2];
        if (ch === 4) out[o + 3] = Math.max(data[(y * w + sx) * ch + 3], data[(y * w + rx) * ch + 3]);
      }
  }
  return sharp(out, { raw: info }).png().toBuffer();
}

async function loadChromium() {
  for (const spec of ["playwright", process.env.SHIFT_PLAYWRIGHT_MODULE, join(homedir(), ".claude/skills/gstack/node_modules/playwright/index.mjs")].filter(Boolean)) {
    try {
      const mod = await import(spec.startsWith("/") ? pathToFileURL(spec).href : spec);
      return mod.chromium ?? mod.default?.chromium;
    } catch {
      // try the next one
    }
  }
  console.error("❌ Playwright not found. Set SHIFT_PLAYWRIGHT_MODULE to a playwright/index.mjs path.");
  process.exit(1);
}

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

// 1. The type layer: the live poster with its photo hidden, on transparent.
const chromium = await loadChromium();
const browser = await chromium.launch();
let overlay;
let letters;
// The story's title: one capture per number of glyphs switched on (0 to 4).
const ORDER = ["earth", "water", "fire", "air"];
const titles = [];
try {
  const page = await browser.newPage({ viewport: { width: 2400, height: 1600 } });
  await page.routeWebSocket(/hmr|turbopack/, () => {});
  await page.goto(`${BASE}/hackathon/poster/elemental?render=1`, { waitUntil: "load", timeout: 180000 });
  await page.waitForSelector(`#${ID}`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    el.querySelector(":scope > img").style.display = "none";
    // The plate frames carry their own moving grain; drop the still one.
    el.querySelector(":scope > svg:last-of-type").style.display = "none";
    // Clear every background from the poster up to the page, so only the type is captured.
    for (let n = el; n; n = n.parentElement) n.style.setProperty("background", "transparent", "important");
  }, ID);
  const shoot = () => page.locator(`#${ID}`).screenshot({ omitBackground: true, animations: "disabled" });
  if (!STORY) overlay = await shoot();
  else {
    // The letters breaking out of the fire can't float over a clean valley,
    // so the story takes them as their own layer and shows them with the fire.
    const setLetters = (show) =>
      page.evaluate(
        ([id, show]) => {
          const el = document.getElementById(id);
          for (const t of el.querySelectorAll(":scope > svg:first-of-type text")) t.style.visibility = show ? "visible" : "hidden";
        },
        [ID, show],
      );
    await setLetters(false);
    for (let n = 0; n <= ORDER.length; n++) {
      await page.evaluate(
        ([id, on]) => {
          for (const g of document.getElementById(id).querySelectorAll("[data-glyph]")) {
            const show = on.includes(g.dataset.glyph);
            g.querySelector("[data-glyph-letter]").style.color = show ? "transparent" : "";
            g.querySelector("[data-glyph-pixels]").style.visibility = show ? "visible" : "hidden";
          }
        },
        [ID, ORDER.slice(0, n)],
      );
      titles.push(await shoot());
    }
    await setLetters(true);
    await page.evaluate((id) => {
      const el = document.getElementById(id);
      for (const c of el.children) if (c !== el.querySelector(":scope > svg:first-of-type")) c.style.visibility = "hidden";
      el.querySelector(":scope > svg:first-of-type rect").style.visibility = "hidden";
    }, ID);
    letters = await shoot();
  }
} finally {
  await browser.close();
}

// 2. The frames: plate per frame, type on top, scaled down. The type is
// never glitched, so it stays readable the whole time.
const frames = STORY ? storyFrames() : Array.from({ length: FRAMES }, (_, f) => ({ corrupt: 1, motion: f, glitch: 0 }));
// The plate's size and fire, kept in step with render-elemental-plate.mjs:
// its base and how tall it grows.
const W = 1080;
const H = 1350;
const FIRE_BASE = 908;
const fireStage = (c) => stage("fire", c);
/** The top row of the fire letters to show: only those inside the flames. */
function lettersUpTo(corrupt) {
  const f = fireStage(corrupt);
  if (f <= 0.15) return 0;
  return Math.min(H - 1, Math.max(0, Math.round(FIRE_BASE - 520 * (0.08 + 0.92 * f))));
}
let done = 0;
async function renderFrame(f) {
  const { corrupt, motion, glitch: g, glyphs = 4, titleGlitch = 0 } = frames[f];
  const plate = join(TMP, `plate-${f}.png`);
  await run("node", [join(ROOT, "scripts/render-elemental-plate.mjs"), ...(SKY === "blue" ? ["--sky", "blue"] : []), "--frames", String(FRAMES), "--frame", String(motion), ...(STORY ? ["--corrupt", String(corrupt)] : []), "--out", plate]);
  const base = g > 0 ? await glitch(plate, g, f + 1) : plate;
  // sharp resizes before it composites, so lay the type on first, then scale.
  // The title's band of the poster, where its letters glitch.
  const type = STORY ? (titleGlitch ? await glitch(titles[glyphs], titleGlitch * 0.6, f + 101, [160, 290]) : titles[glyphs]) : overlay;
  const layers = [{ input: type }];
  const shown = letters && lettersUpTo(corrupt);
  if (shown) layers.unshift({ input: await sharp(letters).extract({ left: 0, top: shown, width: W, height: H - shown }).toBuffer(), left: 0, top: shown });
  if (LAYERS) {
    const n = String(f).padStart(3, "0");
    const fire = layers.slice(0, -1);
    await (fire.length ? sharp(base).composite(fire) : sharp(base)).png().toFile(join(OUT, `scene-${n}.png`));
    await sharp(type).png().toFile(join(OUT, `type-${n}.png`));
    process.stdout.write(`\rframe ${++done}/${frames.length}`);
    return;
  }
  const full = await sharp(base).composite(layers).png().toBuffer();
  await sharp(full).resize(WIDTH).png().toFile(join(TMP, `frame-${String(f).padStart(3, "0")}.png`));
  process.stdout.write(`\rframe ${++done}/${frames.length}`);
}
// A few plates at a time; each one is a separate, single-threaded node run.
const queue = frames.map((_, f) => f);
await Promise.all(Array.from({ length: JOBS }, async () => {
  while (queue.length) await renderFrame(queue.shift());
}));
process.stdout.write("\n");
if (LAYERS) {
  rmSync(TMP, { recursive: true, force: true });
  console.log(`✅ ${frames.length} scene and type layers in ${OUT}`);
  process.exit(0);
}

// 3. Encode: a GIF with its own palette, and an MP4 for Instagram.
const gif = join(OUT, `${NAME}.gif`);
const mp4 = join(OUT, `${NAME}.mp4`);
const input = ["-y", "-framerate", String(FPS), "-i", join(TMP, "frame-%03d.png")];
execFileSync("ffmpeg", [...input, "-vf", "split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3", "-loop", "0", gif], { stdio: "ignore" });
// Loop the clip so the MP4 runs long enough to read (the story is long already).
execFileSync("ffmpeg", ["-y", "-stream_loop", STORY ? "1" : "3", "-framerate", String(FPS), "-i", join(TMP, "frame-%03d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", mp4], { stdio: "ignore" });
rmSync(TMP, { recursive: true, force: true });
console.log(`✅ ${gif}\n✅ ${mp4}`);
