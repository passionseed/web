#!/usr/bin/env node
/** Export the organic guide independently from the paid carousel. */
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";
const { chromium } = await import(process.env.SHIFT_PLAYWRIGHT_MODULE ?? "playwright");
const base = process.argv[2] ?? "http://localhost:3000";
const out = resolve(process.argv[3] ?? "output/shift-guide");
mkdirSync(join(out, "png"), { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
  await page.goto(`${base}/shift/poster/guide`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    for (const img of document.images) { img.loading = "eager"; await img.decode(); }
  });
  for (let i = 1; i <= 6; i++) {
    const file = join(out, "png", `guide-${i}.png`);
    await page.locator(`#shift-guide-${i}`).screenshot({ path: file, animations: "disabled" });
    const { width, height } = await sharp(file).metadata();
    if (width !== 1080 || height !== 1350) throw new Error(`Wrong guide dimensions: ${i}`);
  }
  await sharp({ create: { width: 2160, height: 4050, channels: 4, background: "#172836" } })
    .composite(Array.from({ length: 6 }, (_, i) => ({ input: join(out, "png", `guide-${i + 1}.png`), left: (i % 2) * 1080, top: Math.floor(i / 2) * 1350 })))
    .png().toFile(join(out, "preview.png"));
} finally { await browser.close(); }
