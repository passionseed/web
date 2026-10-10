#!/usr/bin/env node
/**
 * Export the SHIFT for schools poster set (1080x1350 each) to
 * public/shift/school/poster-N.png, where /shift/school shows them.
 *
 *   node scripts/render-shift-school-posters.mjs [baseUrl] [outDir]
 *
 * Needs a running dev server. SHIFT_PLAYWRIGHT_MODULE points at a
 * playwright(-core) entry when it is not installed here, and
 * SHIFT_CHROMIUM_PATH at a browser binary when the bundled one is missing.
 */
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const { chromium } = await import(process.env.SHIFT_PLAYWRIGHT_MODULE ?? "playwright");
const base = process.argv[2] ?? "http://localhost:3000";
const out = resolve(process.argv[3] ?? "public/shift/school");
const COUNT = 5;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch(
  process.env.SHIFT_CHROMIUM_PATH ? { executablePath: process.env.SHIFT_CHROMIUM_PATH } : {},
);
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
  await page.goto(`${base}/shift/poster/school`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    for (const img of document.images) {
      img.loading = "eager";
      await img.decode();
    }
  });
  for (let i = 1; i <= COUNT; i++) {
    const shot = await page.locator(`#school-poster-${i}`).screenshot({ animations: "disabled" });
    const file = join(out, `poster-${i}.png`);
    await sharp(shot).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(file);
    const { width, height } = await sharp(file).metadata();
    if (width !== 1080 || height !== 1350) throw new Error(`Wrong poster size for ${i}: ${width}x${height}`);
    console.log(`wrote ${file}`);
  }
} finally {
  await browser.close();
}
