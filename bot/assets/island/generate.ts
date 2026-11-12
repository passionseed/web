/** Run from the repository root: node_modules/.bin/tsx bot/assets/island/generate.ts */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { PALETTE, SPRITES } from "./sprites";

const outputDirectory = join(dirname(fileURLToPath(import.meta.url)), "png");
const tileNames = [
  "water_a", "water_b", "sand", "sand_b", "grass_a", "grass_b", "grass_c",
  "path", "plaza", "shore_n", "shore_s", "shore_e", "shore_w",
];
const dimensions: Record<string, [number, number]> = {
  ...Object.fromEntries(tileNames.map((name) => [name, [16, 16]])),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, stage) => [`stage_${stage}`, [32, 40]])),
  visitor: [10, 14], key_flag: [10, 16], lantern: [8, 14], marker: [9, 9],
  banner: [48, 20], well: [24, 24], boat: [20, 12],
};

function validate(): Record<string, [number, number, number]> {
  if (Object.keys(PALETTE).length > 24) throw new Error("Palette exceeds 24 colors");
  const colors: Record<string, [number, number, number]> = {};
  for (const [symbol, hex] of Object.entries(PALETTE)) {
    if (symbol.length !== 1 || symbol === "." || !/^#[\da-f]{6}$/i.test(hex)) {
      throw new Error(`Invalid palette entry: ${symbol} = ${hex}`);
    }
    colors[symbol] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as [number, number, number];
  }
  if (Object.keys(SPRITES).length !== Object.keys(dimensions).length) {
    throw new Error("Sprite inventory does not match the requested inventory");
  }
  for (const [name, [width, height]] of Object.entries(dimensions)) {
    const rows = SPRITES[name];
    if (!rows || rows.length !== height || rows.some((row) => row.length !== width)) {
      throw new Error(`${name} must be exactly ${width}×${height}`);
    }
    for (const symbol of rows.join("")) {
      if (symbol !== "." && !colors[symbol]) throw new Error(`${name}: unknown color ${symbol}`);
    }
    if (name.startsWith("stage_") && rows.slice(30).join("\n") !== SPRITES.stage_0.slice(30).join("\n")) {
      throw new Error(`${name}: soil footprint must match stage_0`);
    }
  }
  return colors;
}

function render(rows: string[], colors: Record<string, [number, number, number]>): PNG {
  const png = new PNG({ width: rows[0].length, height: rows.length });
  png.data.fill(0);
  rows.forEach((row, y) => {
    [...row].forEach((symbol, x) => {
      if (symbol === ".") return;
      const offset = (y * png.width + x) * 4;
      const [red, green, blue] = colors[symbol];
      png.data.set([red, green, blue, 255], offset);
    });
  });
  return png;
}

function generate(): void {
  // Validate everything before writing any files.
  const colors = validate();
  const entries = Object.entries(SPRITES);
  const scale = 4;
  const padding = 16;
  const columns = 6;
  const cellWidth = 48 * scale + padding * 2;
  const cellHeight = 40 * scale + padding * 2;
  const sheet = new PNG({ width: columns * cellWidth, height: Math.ceil(entries.length / columns) * cellHeight });
  for (let offset = 0; offset < sheet.data.length; offset += 4) {
    sheet.data.set([128, 128, 128, 255], offset);
  }
  mkdirSync(outputDirectory, { recursive: true });
  entries.forEach(([name, rows], index) => {
    const png = render(rows, colors);
    const destination = join(outputDirectory, `${name}.png`);
    writeFileSync(destination, PNG.sync.write(png));
    console.log(destination);
    // Integer replication preserves every native pixel, including 1px outlines.
    const left = (index % columns) * cellWidth + (cellWidth - png.width * scale) / 2;
    const top = Math.floor(index / columns) * cellHeight + (cellHeight - png.height * scale) / 2;
    for (let y = 0; y < png.height * scale; y++) {
      for (let x = 0; x < png.width * scale; x++) {
        const source = (Math.floor(y / scale) * png.width + Math.floor(x / scale)) * 4;
        if (!png.data[source + 3]) continue;
        const target = ((top + y) * sheet.width + left + x) * 4;
        sheet.data.set(png.data.subarray(source, source + 4), target);
      }
    }
  });
  const sheetPath = join(outputDirectory, "_sheet.png");
  writeFileSync(sheetPath, PNG.sync.write(sheet));
  console.log(sheetPath);
  console.log(`Palette: ${Object.keys(PALETTE).length} colors. Generated ${entries.length} sprites and one 4× contact sheet.`);
}

generate();
