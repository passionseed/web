#!/usr/bin/env node
/**
 * Exports the Elemental key poster (blue sky) with an empty QR block, for the
 * share page's poster maker (app/api/hackathon/elemental/share/poster/[code]).
 * The maker draws each sharer's own QR code and code into that block, so a
 * change to the poster (dates, wordmark) is one re-export, not a new batch.
 *
 *   node scripts/render-share-poster-base.mjs [--base http://localhost:3010]
 *
 * Writes lib/hackathon/elemental/share/poster-base.jpg (2x, 2160x2700) and
 * poster-base.json: where the QR code goes, in poster pixels (1080 wide).
 * Playwright lookup as in render-poster.mjs.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "lib/hackathon/elemental/share");
const ID = "elemental-key-blue";
const SCALE = 2;
const argv = process.argv.slice(2);
const base = argv.includes("--base") ? argv[argv.indexOf("--base") + 1] : "http://localhost:3010";

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
  console.error("Playwright not found. Set SHIFT_PLAYWRIGHT_MODULE to a playwright/index.mjs path.");
  process.exit(1);
}

const chromium = await loadChromium();
const browser = await chromium.launch(process.env.SHIFT_CHROMIUM_PATH ? { executablePath: process.env.SHIFT_CHROMIUM_PATH } : {});
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1600 }, deviceScaleFactor: SCALE });
  await page.routeWebSocket(/hmr|turbopack/, () => {});
  await page.goto(`${base}/hackathon/poster/elemental?render=1`, { waitUntil: "load", timeout: 180000 });
  await page.waitForSelector(`#${ID}`, { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    for (const img of document.images) {
      img.loading = "eager";
      try {
        await img.decode();
      } catch {
        // shows up in the review
      }
    }
  });

  // The plain QR code sits in a cream block; measure it, then hide the code and keep the block.
  const box = await page.evaluate((id) => {
    const poster = document.getElementById(id);
    const qr = poster?.querySelector('svg[aria-label="QR code: sign up"]');
    if (!poster || !qr) return null;
    const p = poster.getBoundingClientRect();
    const q = qr.getBoundingClientRect();
    const block = qr.parentElement.getBoundingClientRect();
    qr.style.visibility = "hidden";
    return {
      qr: { x: q.left - p.left, y: q.top - p.top, size: q.width },
      block: { x: block.left - p.left, y: block.top - p.top, width: block.width, height: block.height },
      width: p.width,
      height: p.height,
    };
  }, ID);
  if (!box) throw new Error(`No plain QR code found in #${ID}`);

  const shot = await page.locator(`#${ID}`).screenshot({ animations: "disabled" });
  mkdirSync(OUT, { recursive: true });
  const jpg = await sharp(shot).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  writeFileSync(join(OUT, "poster-base.jpg"), jpg);
  const meta = {
    // Changes whenever the image does, so poster links (and caches) move on.
    version: createHash("sha1").update(jpg).digest("hex").slice(0, 8),
    scale: SCALE,
    ...box,
  };
  writeFileSync(join(OUT, "poster-base.json"), JSON.stringify(meta, null, 2) + "\n");
  console.log("Wrote", join(OUT, "poster-base.jpg"), meta);
} finally {
  await browser.close();
}
