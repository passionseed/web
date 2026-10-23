#!/usr/bin/env node
/**
 * Screenshots bespoke poster sheets (not Studio sets) by element id.
 *
 *   node scripts/render-poster.mjs --route /shift/poster/3/launch \
 *        --ids shift3-launch-feed,shift3-launch-story \
 *        --out output/marketing/2026-10-23/shift3-launch [--base http://localhost:3010]
 *
 * Writes <id>.png per sheet at the element's own size, plus contact.png when
 * there is more than one. Loads the route with ?render=1 so SheetGallery pages
 * show their live sheets. --publish <dir> also writes <id>.webp there: the
 * images those pages show visitors (public/shift/poster/3/sheets). Uses the same Playwright lookup as
 * render-marketing.mjs (project, SHIFT_PLAYWRIGHT_MODULE, gstack's copy).
 */
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

function parseArgs(argv) {
  const args = { base: "http://localhost:3010", route: null, ids: [], out: null, publish: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base") args.base = argv[++i];
    else if (a === "--route") args.route = argv[++i];
    else if (a === "--ids") args.ids.push(...argv[++i].split(",").filter(Boolean));
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--publish") args.publish = argv[++i];
    else throw new Error(`Unknown argument ${a}`);
  }
  if (!args.route || !args.ids.length || !args.out) {
    console.error("Usage: --route /path --ids a,b --out dir [--base url]");
    process.exit(1);
  }
  return args;
}

async function loadChromium() {
  const candidates = [
    "playwright",
    process.env.SHIFT_PLAYWRIGHT_MODULE,
    join(homedir(), ".claude/skills/gstack/node_modules/playwright/index.mjs"),
  ].filter(Boolean);
  for (const spec of candidates) {
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

const args = parseArgs(process.argv.slice(2));
const outDir = resolve(args.out);
mkdirSync(outDir, { recursive: true });
if (args.publish) mkdirSync(resolve(args.publish), { recursive: true });

const chromium = await loadChromium();
const browser = await chromium.launch(
  process.env.SHIFT_CHROMIUM_PATH ? { executablePath: process.env.SHIFT_CHROMIUM_PATH } : {},
);
try {
  const page = await browser.newPage({ viewport: { width: 3600, height: 2400 } });
  // Leave the dev server's HMR socket unanswered: a Turbopack HMR panic
  // otherwise reloads the page in a loop mid-screenshot.
  await page.routeWebSocket(/hmr|turbopack/, () => {});
  // ?render=1 makes SheetGallery pages show the live sheets, not the images.
  const sep = args.route.includes("?") ? "&" : "?";
  await page.goto(`${args.base}${args.route}${sep}render=1`, { waitUntil: "load", timeout: 180000 });
  await page.waitForSelector(`#${args.ids[0]}`, { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    for (const img of document.images) {
      img.loading = "eager";
      try {
        await img.decode();
      } catch {
        // a broken image shows up in the review, not as a crash here
      }
    }
  });
  const files = [];
  for (const id of args.ids) {
    const file = join(outDir, `${id}.png`);
    const shot = await page.locator(`#${id}`).screenshot({ animations: "disabled" });
    await sharp(shot).png({ compressionLevel: 9 }).toFile(file);
    const { width, height } = await sharp(file).metadata();
    console.log(`✅ ${file} (${width}x${height})`);
    files.push({ file, width, height });
    if (args.publish) {
      const web = join(resolve(args.publish), `${id}.webp`);
      await sharp(file).webp({ quality: 90 }).toFile(web);
      console.log(`🌐 ${web}`);
    }
  }
  if (files.length > 1) {
    const thumbH = 720;
    const thumbs = await Promise.all(
      files.map(async (f) => {
        const w = Math.round((f.width / f.height) * thumbH);
        return { w, buf: await sharp(f.file).resize(w, thumbH).toBuffer() };
      }),
    );
    const gap = 16;
    const width = thumbs.reduce((sum, t) => sum + t.w + gap, gap);
    let left = gap;
    const composite = thumbs.map((t) => {
      const c = { input: t.buf, left, top: gap };
      left += t.w + gap;
      return c;
    });
    await sharp({ create: { width, height: thumbH + gap * 2, channels: 3, background: "#111" } })
      .composite(composite)
      .png()
      .toFile(join(outDir, "contact.png"));
    console.log(`🗂  ${join(outDir, "contact.png")}`);
  }
} finally {
  await browser.close();
}
