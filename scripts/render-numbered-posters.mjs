#!/usr/bin/env node
/**
 * Numbered Elemental posters for a print shop: one JPEG per copy plus one PDF
 * of them all, from /hackathon/poster/elemental/print. Each copy's QR code
 * opens the hackathon page with ?src=poster-<n> (Big, 2026-11-26).
 *
 *   node scripts/render-numbered-posters.mjs --from 1 --to 30 \
 *        --out output/marketing/elemental-posters [--base http://localhost:3010] [--scale 2]
 *
 * The browser's own Save as PDF makes a very large file (the poster's film
 * grain is a blend layer, so every page is rasterised), which is why this
 * builds the PDF from JPEG screenshots instead: about 1.2 MB a page at
 * --scale 2 (2160x2700 px, about 185 dpi on A3).
 * Uses the same Playwright lookup as render-poster.mjs.
 */
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const W = 1080;
const H = 1350;

function parseArgs(argv) {
  const args = { base: "http://localhost:3010", from: "1", to: "30", out: null, scale: 2 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base") args.base = argv[++i];
    else if (a === "--from") args.from = argv[++i];
    else if (a === "--to") args.to = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--scale") args.scale = Number(argv[++i]);
    else throw new Error(`Unknown argument ${a}`);
  }
  if (!args.out) {
    console.error("Usage: --from 1 --to 30 --out dir [--base url] [--scale 2]");
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

const chromium = await loadChromium();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: W + 120, height: H + 150 }, deviceScaleFactor: args.scale });
  const url = `${args.base}/hackathon/poster/elemental/print?from=${encodeURIComponent(args.from)}&to=${encodeURIComponent(args.to)}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 180_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0), null, { timeout: 60_000 });

  // The page clamps the range, so read the numbers it actually drew.
  const numbers = await page.$$eval(".el-print-sheet", (els) => els.map((el) => Number(el.getAttribute("data-poster-no"))));
  const sheets = await page.$$(".el-print-sheet");
  const files = [];
  for (let i = 0; i < sheets.length; i++) {
    const file = join(outDir, `elemental-poster-${String(numbers[i]).padStart(2, "0")}.jpg`);
    await sheets[i].screenshot({ path: file, type: "jpeg", quality: 88 });
    files.push(file);
    console.log(`✓ ${file}`);
  }

  // One page per JPEG, at the poster's own size. Chrome embeds the JPEGs as they are.
  const html = `<!doctype html><html><head><style>@page{size:${W}px ${H}px;margin:0}html,body{margin:0}img{display:block;width:${W}px;height:${H}px;break-after:page}img:last-child{break-after:auto}</style></head><body>${files
    .map((f) => `<img src="${pathToFileURL(f).href}">`)
    .join("")}</body></html>`;
  const sheetHtml = join(outDir, ".sheet.html");
  writeFileSync(sheetHtml, html);
  const pdfPage = await browser.newPage();
  await pdfPage.goto(pathToFileURL(sheetHtml).href, { waitUntil: "load" });
  const pdf = join(outDir, `elemental-posters-${numbers[0]}-${numbers[numbers.length - 1]}.pdf`);
  await pdfPage.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
  console.log(`✓ ${pdf} (${(statSync(pdf).size / 1e6).toFixed(1)} MB, ${files.length} pages)`);
} finally {
  await browser.close();
}
