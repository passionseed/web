#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import sharp from "sharp";

const out = resolve(process.argv[2] ?? "output/shift-ad");
const ids = ["1-student", "1-parent", "2", "3", "4", "5"];
const results = [];
const thumbnails = [];
for (const [i, id] of ids.entries()) {
  const path = join(out, `shift-ad-${id}.png`);
  const metadata = await sharp(path).metadata();
  if (metadata.width !== 1080 || metadata.height !== 1350) throw new Error(`Dimensions: ${id}`);
  const stats = await sharp(path).stats();
  if (stats.channels.every((channel) => channel.stdev < 1)) throw new Error(`Blank card: ${id}`);
  results.push({ id, width: metadata.width, height: metadata.height, bytes: readFileSync(path).length, nonblank: true });
  const thumb = await sharp(path).resize(360, 450, { kernel: "nearest" }).png().toBuffer();
  thumbnails.push({ input: thumb, left: (i % 3) * 360, top: Math.floor(i / 3) * 450 });
}
await sharp({ create: { width: 1080, height: 900, channels: 4, background: "#ffffff" } })
  .composite(thumbnails).png().toFile(join(out, "phone-contact-sheet.png"));

const copy = JSON.parse(readFileSync(join(out, "ads-manager.json"), "utf8"));
const publicCopy = JSON.stringify({ primaryText: copy.primaryText, cards: copy.cards, parentCard: copy.parentCard });
if (/pivot|—/i.test(publicCopy)) throw new Error("Prohibited public wording");
if (copy.cohort.round !== 1 || copy.cohort.priceBaht !== 670 || copy.cohort.applyDeadline !== "2026-10-03") throw new Error("Reviewed offer changed; reread cohort");
for (const card of copy.cards) {
  for (const hook of ["student", "parent"]) {
    const url = new URL(card[`${hook}Url`]);
    if (url.pathname !== "/shift/1" || url.searchParams.get("utm_source") !== "meta_ads") throw new Error("Wrong tracked destination");
  }
}
const panorama = await sharp(join(out, "shift-ad-panorama.png")).metadata();
if (panorama.width !== 5400 || panorama.height !== 1350) throw new Error("Panorama dimensions");
// Panorama was assembled from these exact card pixels; edges are not re-rendered.
for (const [i, id] of ["1-student", "2", "3", "4", "5"].entries()) {
  const tile = await sharp(join(out, "shift-ad-panorama.png")).extract({ left: i * 1080, top: 0, width: 1080, height: 1350 }).ensureAlpha().raw().toBuffer();
  const original = await sharp(join(out, `shift-ad-${id}.png`)).ensureAlpha().raw().toBuffer();
  if (!tile.equals(original)) throw new Error(`Panorama tile mismatch: ${id}`);
}
writeFileSync(join(out, "validation.json"), JSON.stringify({ reviewDateBangkok: "2026-10-02", results, panorama: [5400, 1350], panoramaTilesMatch: true, trackedLinksMatch: true, prohibitedWordingAbsent: true, phonePreview: "360x450 per card, nearest-neighbor integer factor 3" }, null, 2) + "\n");
console.log("Six nonblank 1080x1350 cards; panorama pixels, offer, copy and URLs validated.");
