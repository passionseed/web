#!/usr/bin/env node
/**
 * Export every SHIFT[2] grid slide to public/shift/posters/shift2-grid/<id>.png
 * at its real size (1080x1440), from a real browser, so the downloads on
 * /shift/poster/2/grid match the page exactly.
 *
 * Usage (dev server running):
 *   node scripts/export-shift2-grid.mjs [baseUrl]
 * Needs Playwright: `pnpm dlx playwright install chromium` once, and the
 * `playwright` package resolvable (e.g. `pnpm add -D playwright`).
 */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const base = process.argv[2] ?? "http://localhost:3000";
const outDir = process.env.SHIFT_GRID_OUT ?? join(dirname(fileURLToPath(import.meta.url)), "..", "public", "shift", "posters", "shift2-grid");

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("❌ Playwright not found. Run: pnpm add -D playwright && pnpm dlx playwright install chromium");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 3400, height: 1600 } });
await page.goto(`${base}/shift/poster/2/grid`, { waitUntil: "networkidle", timeout: 120000 });
await page.evaluate(() => document.fonts.ready);

// Slides plus the grid preview; skip the preview's three inner tiles.
const ids = await page.$$eval('[id^="shift2-grid-"]', (els) =>
  els.map((el) => el.id).filter((id) => !/^shift2-grid-panorama-/.test(id)),
);
for (const id of ids) {
  await page.locator(`#${id}`).screenshot({ path: join(outDir, `${id}.png`) });
  console.log(`✅ ${id}.png`);
}
await browser.close();
console.log(`${ids.length} files -> ${outDir}`);
