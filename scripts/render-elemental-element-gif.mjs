#!/usr/bin/env node
/**
 * Animates one Elemental element poster on a seamless 3-second loop: its
 * pollution moves (water flows, smoke and dust drift, flames and sparks
 * rise, Aether's pixels float up) and the film grain moves. The type stays
 * still on top.
 *
 *   node scripts/render-elemental-element-gif.mjs --element <key> --out <dir>
 *        [--frames 36] [--fps 12] [--width 720] [--base http://localhost:3010]
 *
 * Needs the poster route running and ffmpeg. Writes <dir>/elemental-<key>.gif
 * (--width wide) and <dir>/elemental-<key>.mp4 (full 1080x1350, looped 4
 * times; the MP4 is what Instagram takes).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const OUT = resolve(arg("--out", "output/marketing/elemental-elements"));
const ELEMENT = arg("--element");
if (!["water", "earth", "air", "fire", "aether"].includes(ELEMENT)) {
  console.error("--element must be water, earth, air, fire or aether");
  process.exit(1);
}
const FRAMES = Number(arg("--frames", 36));
const FPS = Number(arg("--fps", 12));
const WIDTH = Number(arg("--width", 720));
const BASE = arg("--base", "http://localhost:3010");
const ID = `elemental-${ELEMENT}`;
const TMP = join(OUT, `.frames-${ELEMENT}`);

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
try {
  const page = await browser.newPage({ viewport: { width: 2400, height: 1600 } });
  await page.routeWebSocket(/hmr|turbopack/, () => {});
  await page.goto(`${BASE}/hackathon/poster/elemental/elements?render=1`, { waitUntil: "load", timeout: 180000 });
  await page.waitForSelector(`#${ID}`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    el.querySelector(":scope > img").style.display = "none";
    // Clear every background from the poster up to the page, so only the type is captured.
    for (let n = el; n; n = n.parentElement) n.style.setProperty("background", "transparent", "important");
  }, ID);
  overlay = await page.locator(`#${ID}`).screenshot({ omitBackground: true, animations: "disabled" });
} finally {
  await browser.close();
}

// 2. The frames: plate per frame, type on top, scaled down.
for (let f = 0; f < FRAMES; f++) {
  const plate = join(TMP, `plate-${f}.png`);
  execFileSync("node", [join(ROOT, "scripts/render-elemental-element.mjs"), "--element", ELEMENT, "--frames", String(FRAMES), "--frame", String(f), "--out", plate], { stdio: "ignore" });
  // sharp resizes before it composites, so lay the type on first, then scale.
  const full = await sharp(plate).composite([{ input: overlay }]).png().toBuffer();
  const name = `${String(f).padStart(3, "0")}.png`;
  await sharp(full).png().toFile(join(TMP, `full-${name}`));
  await sharp(full).resize(WIDTH).png().toFile(join(TMP, `frame-${name}`));
  process.stdout.write(`\rframe ${f + 1}/${FRAMES}`);
}
process.stdout.write("\n");

// 3. Encode: a GIF with its own palette, and an MP4 for Instagram.
const gif = join(OUT, `elemental-${ELEMENT}.gif`);
const mp4 = join(OUT, `elemental-${ELEMENT}.mp4`);
const input = ["-y", "-framerate", String(FPS), "-i", join(TMP, "frame-%03d.png")];
execFileSync("ffmpeg", [...input, "-vf", "split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3", "-loop", "0", gif], { stdio: "ignore" });
// Loop the clip 4 times so the MP4 runs long enough to read.
execFileSync("ffmpeg", ["-y", "-stream_loop", "3", "-framerate", String(FPS), "-i", join(TMP, "full-%03d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-preset", "slow", "-movflags", "+faststart", mp4], { stdio: "ignore" });
rmSync(TMP, { recursive: true, force: true });
console.log(`✅ ${gif}\n✅ ${mp4}`);
