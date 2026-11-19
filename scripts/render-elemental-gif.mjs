#!/usr/bin/env node
/**
 * Animates the Elemental key visual: the fire flickers, sparks rise, the
 * smog drifts, the toxic water shimmers and the film grain moves, on a
 * seamless loop. The type stays still on top.
 *
 *   node scripts/render-elemental-gif.mjs --out <dir> [--sky blue|grey]
 *        [--frames 24] [--fps 12] [--width 720] [--base http://localhost:3010]
 *
 * Needs the poster route running (scripts/studio-server.sh) and ffmpeg.
 * Writes <dir>/elemental-<sky>.gif and <dir>/elemental-<sky>.mp4 (the MP4
 * is what Instagram takes; it doesn't play GIFs).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const OUT = resolve(arg("--out", "output/marketing/elemental-gif"));
const SKY = arg("--sky", "blue");
const FRAMES = Number(arg("--frames", 24));
const FPS = Number(arg("--fps", 12));
const WIDTH = Number(arg("--width", 720));
const BASE = arg("--base", "http://localhost:3010");
const ID = SKY === "blue" ? "elemental-key-blue" : "elemental-key";
const TMP = join(OUT, `.frames-${SKY}`);

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
  overlay = await page.locator(`#${ID}`).screenshot({ omitBackground: true, animations: "disabled" });
} finally {
  await browser.close();
}

// 2. The frames: plate per frame, type on top, scaled down.
for (let f = 0; f < FRAMES; f++) {
  const plate = join(TMP, `plate-${f}.png`);
  execFileSync("node", [join(ROOT, "scripts/render-elemental-plate.mjs"), ...(SKY === "blue" ? ["--sky", "blue"] : []), "--frames", String(FRAMES), "--frame", String(f), "--out", plate], { stdio: "ignore" });
  // sharp resizes before it composites, so lay the type on first, then scale.
  const full = await sharp(plate).composite([{ input: overlay }]).png().toBuffer();
  await sharp(full).resize(WIDTH).png().toFile(join(TMP, `frame-${String(f).padStart(3, "0")}.png`));
  process.stdout.write(`\rframe ${f + 1}/${FRAMES}`);
}
process.stdout.write("\n");

// 3. Encode: a GIF with its own palette, and an MP4 for Instagram.
const gif = join(OUT, `elemental-${SKY}.gif`);
const mp4 = join(OUT, `elemental-${SKY}.mp4`);
const input = ["-y", "-framerate", String(FPS), "-i", join(TMP, "frame-%03d.png")];
execFileSync("ffmpeg", [...input, "-vf", "split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3", "-loop", "0", gif], { stdio: "ignore" });
// Loop the clip 6 times so the MP4 runs long enough to read.
execFileSync("ffmpeg", ["-y", "-stream_loop", "5", "-framerate", String(FPS), "-i", join(TMP, "frame-%03d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", mp4], { stdio: "ignore" });
rmSync(TMP, { recursive: true, force: true });
console.log(`✅ ${gif}\n✅ ${mp4}`);
