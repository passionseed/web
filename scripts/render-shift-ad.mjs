#!/usr/bin/env node
/**
 * Export the SHIFT Meta ad carousel cards as 1080x1350 PNGs.
 *   node scripts/render-shift-ad.mjs [baseUrl] [outDir]
 * Needs the dev server running (pnpm dev).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";
// Allows an existing workspace runtime without adding a project dependency.
const { chromium } = await import(process.env.SHIFT_PLAYWRIGHT_MODULE ?? "playwright");

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = resolve(process.argv[3] ?? "output/shift-ad");
const IDS = ["shift-ad-1-student", "shift-ad-1-parent", "shift-ad-2", "shift-ad-3", "shift-ad-4", "shift-ad-5"];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1600 } });
await page.goto(`${BASE}/shift/poster/ad`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(async () => {
  await Promise.all(Array.from(document.images).map(async (img) => {
    img.loading = "eager";
    await img.decode();
    if (!img.naturalWidth) throw new Error(`Missing image: ${img.src}`);
  }));
});

const copy = JSON.parse(await page.locator("#shift-ad-copy").textContent());
writeFileSync(join(OUT, "ads-manager.json"), JSON.stringify(copy, null, 2) + "\n");
writeFileSync(join(OUT, "ads-manager.md"), [
  `# ${copy.cohort.name} · Ads Manager · Review only`,
  `CTA: ${copy.cta}`,
  ...["student", "parent"].map((hook) => `## ${hook}\n\n${copy.primaryText[hook]}`),
  `## Alternate parent card 1\n\nHeadline: ${copy.parentCard.headline}\n\nDescription: ${copy.parentCard.description}`,
  ...copy.cards.map((card, i) => `## Card ${i + 1}\n\nHeadline: ${card.headline}\n\nDescription: ${card.description}\n\nStudent: ${card.studentUrl}\n\nParent: ${card.parentUrl}`),
].join("\n\n") + "\n");
await page.goto(`${BASE}/shift/poster/ad?render=1`, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all(Array.from(document.images).map((img) => { img.loading = "eager"; return img.decode(); }));
});
const panorama = await page.locator("#shift-ad-panorama").screenshot();
await sharp(panorama).png().toFile(join(OUT, "shift-ad-panorama.png"));
for (const [i, id] of ["shift-ad-1-student", "shift-ad-2", "shift-ad-3", "shift-ad-4", "shift-ad-5"].entries()) {
  await sharp(panorama).extract({ left: i * 1080, top: 0, width: 1080, height: 1350 }).png().toFile(join(OUT, `${id}.png`));
}
await page.goto(`${BASE}/shift/poster/ad?render=1&hook=parent`, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all(Array.from(document.images).map((img) => { img.loading = "eager"; return img.decode(); }));
});
const parent = await page.locator("#shift-ad-panorama").screenshot();
await sharp(parent).extract({ left: 0, top: 0, width: 1080, height: 1350 }).png().toFile(join(OUT, "shift-ad-1-parent.png"));
for (const id of IDS) {
  const file = join(OUT, `${id}.png`);
  const { width, height } = await sharp(file).metadata();
  if (width !== 1080 || height !== 1350) throw new Error(`Wrong dimensions: ${id}`);
  console.log(file);
}
await browser.close();
