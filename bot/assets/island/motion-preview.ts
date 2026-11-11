/** Run from the repository root: node_modules/.bin/tsx bot/assets/island/motion-preview.ts
 *
 * Validates the motion sprites with the same rules as
 * bot/src/quests/__tests__/motion-sprites.test.ts, then writes review files into
 * .gstack/tmp/art/ (gitignored): sheet.png + sheet.json, strips/<family>.png and
 * preview.html. It never writes into bot/assets/island/png, so the bot's
 * pictures and its pinned hash stay as they are.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import {
  ACTOR_FRAMES,
  MOTION_SIZES,
  MOTION_SPRITES,
  SHORE_FRAMES,
  SWAY_FRAMES,
  WATER_FRAMES,
  type MotionSpriteName,
} from "./motion-sprites";
import { PALETTE, SPRITES } from "./sprites";

export const MOTION_RULES = ["inventory", "size", "palette", "names", "frames", "water", "shore", "sway", "style"] as const;
export type MotionRule = (typeof MOTION_RULES)[number];
export interface MotionProblem {
  rule: MotionRule;
  name: string;
  detail: string;
}

/** The first trunk row of each swaying tree: from here down, frame B equals frame A. */
export const SWAY_TRUNK_ROW: Readonly<Record<string, number>> = {
  stage_2: 25,
  stage_3: 24,
  stage_4: 21,
  stage_5: 21,
  stage_6: 21,
  stage_7: 21,
};

/** Rows 30 to 39 of every tree are the shared soil mound (the generate.ts rule). */
const SOIL_FROM = 30;

/** Keys each family may use, beyond the palette check. */
const FAMILY_KEYS: [RegExp, string][] = [
  [/^water_/, "wvu"],
  [/^shore_/, "wvuisd"],
  [/^gull_/, "ofa"],
  [/^cloud_/, "o"],
  [/^lantern_glow_/, "yif"],
  [/^festoon$/, "orypf"],
];

function column(rows: string[], x: number): string {
  return rows.map((row) => row[x]).join("");
}

function inkBox(rows: string[]): { minX: number; maxX: number; minY: number; maxY: number } {
  const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  rows.forEach((row, y) => {
    [...row].forEach((symbol, x) => {
      if (symbol === ".") return;
      box.minX = Math.min(box.minX, x);
      box.maxX = Math.max(box.maxX, x);
      box.minY = Math.min(box.minY, y);
      box.maxY = Math.max(box.maxY, y);
    });
  });
  return box;
}

function shifted(row: string, by: number): string {
  if (by === 0) return row;
  const blank = ".".repeat(Math.abs(by));
  return by > 0 ? blank + row.slice(0, row.length - by) : row.slice(-by) + blank;
}

/**
 * Every rule broken by `sprites` (default: MOTION_SPRITES). Empty means valid.
 * The test asserts one rule at a time; the preview refuses to write when any fails.
 */
export function motionSpriteProblems(sprites: Record<string, string[]> = MOTION_SPRITES): MotionProblem[] {
  const problems: MotionProblem[] = [];
  const add = (rule: MotionRule, name: string, detail: string) => problems.push({ rule, name, detail });
  const sizes = MOTION_SIZES as Record<string, [number, number]>;
  const lookup = (name: string): string[] | undefined => SPRITES[name] ?? sprites[name];

  if (Object.keys(PALETTE).length !== 24) add("palette", "PALETTE", `has ${Object.keys(PALETTE).length} keys, expected 24`);
  for (const name of Object.keys(sizes)) if (!sprites[name]) add("inventory", name, "missing from the sprites");
  for (const name of Object.keys(sprites)) if (!sizes[name]) add("inventory", name, "has no size in MOTION_SIZES");

  for (const [name, rows] of Object.entries(sprites)) {
    if (name in SPRITES) add("names", name, "clashes with a sprite in sprites.ts");
    const size = sizes[name];
    if (size) {
      const [width, height] = size;
      if (rows.length !== height) add("size", name, `has ${rows.length} rows, expected ${height}`);
      rows.forEach((row, y) => {
        if (row.length !== width) add("size", name, `row ${y} has ${row.length} pixels, expected ${width}`);
      });
    }
    const unknown = new Set([...rows.join("")].filter((symbol) => symbol !== "." && !(symbol in PALETTE)));
    if (unknown.size) add("palette", name, `unknown keys ${[...unknown].join(" ")}`);
    for (const [pattern, allowed] of FAMILY_KEYS) {
      if (!pattern.test(name)) continue;
      const extra = new Set([...rows.join("")].filter((symbol) => symbol !== "." && !allowed.includes(symbol)));
      if (extra.size) add("style", name, `uses ${[...extra].join(" ")}; this family allows only ${allowed}`);
    }
  }

  const families: [string, readonly string[]][] = [
    ...Object.entries(WATER_FRAMES),
    ...Object.entries(SHORE_FRAMES),
    ...Object.entries(ACTOR_FRAMES),
    ...Object.entries(SWAY_FRAMES).map(([base, frame]): [string, readonly string[]] => [base, [base, frame]]),
  ];
  for (const [family, frames] of families) {
    const grids = frames.map(lookup);
    frames.forEach((frame, index) => {
      if (!grids[index]) add("frames", family, `${frame} does not exist`);
    });
    const first = grids[0];
    if (!first) continue;
    grids.forEach((grid, index) => {
      if (grid && (grid.length !== first.length || grid[0]?.length !== first[0]?.length)) {
        add("frames", family, `${frames[index]} is not the size of ${frames[0]}`);
      }
    });
  }
  for (const base of [...Object.values(WATER_FRAMES), ...Object.values(SHORE_FRAMES)].map((frames) => frames[0])) {
    if (!SPRITES[base]) add("frames", base, "base tile is not in sprites.ts");
  }
  for (const stage of Object.keys(SWAY_FRAMES)) {
    if (!SPRITES[stage]) add("frames", stage, "tree is not in sprites.ts");
    if (!(stage in SWAY_TRUNK_ROW)) add("frames", stage, "has no trunk row in SWAY_TRUNK_ROW");
  }

  // Water: the outer ring of every frame equals its base, so a/b tiles and frames mix seamlessly.
  for (const [base, ...frames] of Object.values(WATER_FRAMES)) {
    const tile = SPRITES[base];
    for (const frame of frames) {
      const rows = sprites[frame];
      if (!tile || !rows) continue;
      if (rows[0] !== tile[0] || rows[15] !== tile[15]) add("water", frame, "top or bottom row differs from the base");
      if (column(rows, 0) !== column(tile, 0) || column(rows, 15) !== column(tile, 15)) {
        add("water", frame, "left or right column differs from the base");
      }
    }
  }

  // Shore: dry sand never moves, and the edges that meet the next shore tile stay put.
  for (const [base, ...frames] of Object.values(SHORE_FRAMES)) {
    const tile = SPRITES[base];
    const horizontal = base === "shore_n" || base === "shore_s";
    for (const frame of frames) {
      const rows = sprites[frame];
      if (!tile || !rows) continue;
      tile.forEach((row, y) => {
        [...row].forEach((symbol, x) => {
          const now = rows[y]?.[x];
          const sandBefore = symbol === "s" || symbol === "d";
          const sandNow = now === "s" || now === "d";
          if ((sandBefore || sandNow) && now !== symbol) add("shore", frame, `sand pixel ${x},${y} changed`);
        });
      });
      const edgesSame = horizontal
        ? column(rows, 0) === column(tile, 0) && column(rows, 15) === column(tile, 15)
        : rows[0] === tile[0] && rows[15] === tile[15];
      if (!edgesSame) add("shore", frame, `${horizontal ? "edge columns" : "edge rows"} differ from the base`);
    }
  }

  // Sway: trunk and soil are frame A; only canopy rows lean, each by at most 1px.
  const soil = SPRITES.stage_0.slice(SOIL_FROM).join("\n");
  for (const [stage, frame] of Object.entries(SWAY_FRAMES)) {
    const tree = SPRITES[stage];
    const rows = sprites[frame];
    const trunk = SWAY_TRUNK_ROW[stage];
    if (!tree || !rows || trunk === undefined) continue;
    if (rows.slice(SOIL_FROM).join("\n") !== soil) add("sway", frame, "soil rows 30-39 differ from stage_0");
    if (rows.slice(trunk).join("\n") !== tree.slice(trunk).join("\n")) add("sway", frame, `rows ${trunk}+ differ from ${stage}`);
    rows.slice(0, trunk).forEach((row, y) => {
      if (![0, 1, -1].some((by) => shifted(tree[y], by) === row)) add("sway", frame, `row ${y} is not ${stage} moved by 1px at most`);
    });
    const a = inkBox(tree);
    const b = inkBox(rows);
    if (b.minY !== a.minY || b.maxY !== a.maxY) add("sway", frame, "ink grows up or down");
    if (b.minX < a.minX - 1 || b.maxX > a.maxX + 1) add("sway", frame, "ink grows more than 1px sideways");
  }

  // Glow sits behind the lantern body, so its centre stays empty.
  for (const name of ACTOR_FRAMES.lanternGlow) {
    const rows = sprites[name];
    if (rows?.slice(5, 11).some((row) => row.slice(5, 11) !== "......")) add("style", name, "the centre 6x6 must be transparent");
  }
  return problems;
}

/* ------------------------------------------------------------------ previews */

type RGB = [number, number, number];
const SCALE = 4;

function colors(): Record<string, RGB> {
  return Object.fromEntries(
    Object.entries(PALETTE).map(([key, hex]) => [key, [1, 3, 5].map((s) => parseInt(hex.slice(s, s + 2), 16)) as RGB]),
  );
}

function blank(width: number, height: number, fill: RGB | null): PNG {
  const png = new PNG({ width, height });
  png.data.fill(0);
  if (fill) for (let offset = 0; offset < png.data.length; offset += 4) png.data.set([...fill, 255], offset);
  return png;
}

/** Integer replication only, so every native pixel stays a crisp square. */
function stamp(png: PNG, rows: string[], left: number, top: number, scale: number, rgb: Record<string, RGB>): void {
  rows.forEach((row, y) => {
    [...row].forEach((symbol, x) => {
      if (symbol === ".") return;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = left + x * scale + dx;
          const py = top + y * scale + dy;
          if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
          png.data.set([...rgb[symbol], 255], (py * png.width + px) * 4);
        }
      }
    });
  });
}

function single(rows: string[], rgb: Record<string, RGB>): string {
  const png = blank(rows[0].length, rows.length, null);
  stamp(png, rows, 0, 0, 1, rgb);
  return `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;
}

const STRIPS: Record<string, string[]> = {
  water_a: [...WATER_FRAMES.water_a],
  water_b: [...WATER_FRAMES.water_b],
  shore_n: [...SHORE_FRAMES.shore_n],
  shore_s: [...SHORE_FRAMES.shore_s],
  shore_e: [...SHORE_FRAMES.shore_e],
  shore_w: [...SHORE_FRAMES.shore_w],
  boat: [...ACTOR_FRAMES.boat],
  gull: [...ACTOR_FRAMES.gull],
  cloud: ["cloud_a", "cloud_b"],
  sway: Object.entries(SWAY_FRAMES).flatMap(([stage, frame]) => [stage, frame]),
  lantern: ["lantern", ...ACTOR_FRAMES.lanternGlow],
  plaza_night: ["lamp_post", "festoon"],
  builder: [...ACTOR_FRAMES.builder],
  tester: [...ACTOR_FRAMES.tester],
};

function previewHtml(all: Record<string, string[]>, rgb: Record<string, RGB>): string {
  const names = [...new Set([...Object.values(STRIPS).flat(), "grass_a", "plaza", "sand"])];
  const uris = Object.fromEntries(names.map((name) => [name, single(all[name], rgb)]));
  const data = JSON.stringify({ uris, water: WATER_FRAMES, shore: SHORE_FRAMES, sway: SWAY_FRAMES, actors: ACTOR_FRAMES });
  return `<!doctype html>
<meta charset="utf-8">
<title>SHIFT island motion sprites</title>
<style>
  body { margin: 24px; background: #2b3133; color: #f6e4b5; font: 14px system-ui, sans-serif; }
  section { display: inline-block; vertical-align: top; margin: 0 24px 24px 0; }
  h2 { font-size: 13px; font-weight: 600; margin: 0 0 8px; }
  canvas { image-rendering: pixelated; display: block; background: #438eac; }
  label { display: block; margin-bottom: 16px; }
</style>
<label><input type="checkbox" id="pause"> pause</label>
<section><h2>sea 4x3, a/b mixed, ping-pong 0-1-2-1</h2><canvas id="sea" width="64" height="48"></canvas></section>
<section><h2>foam on a shore_n row (all four in strips/)</h2><canvas id="shore" width="96" height="48"></canvas></section>
<section><h2>boat bob (faces left natively) and gulls</h2><canvas id="boat" width="96" height="48"></canvas></section>
<section><h2>sway A/B in a gust</h2><canvas id="sway" width="192" height="40"></canvas></section>
<section><h2>night: earned lantern glow, lamp post, festoon</h2><canvas id="night" width="96" height="48"></canvas></section>
<section><h2>builder and tester</h2><canvas id="people" width="48" height="24"></canvas></section>
<section><h2>cloud shadows at 14% over grass</h2><canvas id="clouds" width="96" height="48"></canvas></section>
<script>
const D = ${data};
const S = ${SCALE};
const img = {};
for (const [name, uri] of Object.entries(D.uris)) { const i = new Image(); i.src = uri; img[name] = i; }
function ctx(id) {
  const c = document.getElementById(id);
  c.style.width = c.width * S + "px"; c.style.height = c.height * S + "px";
  const x = c.getContext("2d"); x.imageSmoothingEnabled = false; return x;
}
const C = { sea: ctx("sea"), shore: ctx("shore"), boat: ctx("boat"), sway: ctx("sway"), night: ctx("night"), people: ctx("people"), clouds: ctx("clouds") };
const pingpong = (t) => [0, 1, 2, 1][t % 4];
const mix = [["a","b","a","a"],["b","a","b","b"],["a","a","b","a"]];
function draw(tick) {
  const sea = pingpong(Math.floor(tick / 3));
  mix.forEach((row, y) => row.forEach((k, x) => C.sea.drawImage(img[D.water["water_" + k][sea]], x * 16, y * 16)));
  const foam = pingpong(Math.floor(tick / 4));
  const sh = C.shore; sh.clearRect(0, 0, 96, 48);
  for (let x = 0; x < 6; x++) { sh.drawImage(img[D.water.water_a[sea]], x * 16, 0); sh.drawImage(img[D.shore.shore_n[foam]], x * 16, 16); sh.drawImage(img.sand, x * 16, 32); }
  const b = C.boat; b.clearRect(0, 0, 96, 48);
  for (let x = 0; x < 6; x++) for (let y = 0; y < 3; y++) b.drawImage(img[D.water.water_a[sea]], x * 16, y * 16);
  const bx = 96 - Math.floor(tick / 2) % 116;
  b.drawImage(img[D.actors.boat[Math.floor(tick / 4) % 2]], bx, 28);
  const gx = (tick % 112) - 8;
  b.drawImage(img[D.actors.gull[Math.floor(tick / 2) % 2]], gx, 4);
  b.drawImage(img[D.actors.gull[Math.floor(tick / 2 + 1) % 2]], (gx + 30) % 112 - 8, 10);
  const w = C.sway;
  for (let x = 0; x < 12; x++) for (let y = 0; y < 3; y++) w.drawImage(img.grass_a, x * 16, y * 16);
  const gust = tick % 64 < 13;
  Object.entries(D.sway).forEach(([stage, frame], i) => {
    const flip = gust && Math.floor((tick - i) / 3) % 2 === 1;
    w.drawImage(img[flip ? frame : stage], i * 32, 0);
  });
  const n = C.night; n.clearRect(0, 0, 96, 48);
  for (let x = 0; x < 6; x++) for (let y = 0; y < 3; y++) n.drawImage(img[x < 3 ? "grass_a" : "plaza"], x * 16, y * 16);
  n.save(); n.globalCompositeOperation = "multiply"; n.fillStyle = "#4a5a8c"; n.fillRect(0, 0, 96, 48); n.restore();
  n.drawImage(img[D.actors.lanternGlow[Math.floor(tick / 3) % 2]], 8, 18);
  n.drawImage(img.lantern, 12, 19);
  n.drawImage(img.festoon, 48, 2);
  n.drawImage(img.lamp_post, 52, 24); n.drawImage(img.lamp_post, 84, 24);
  const p = C.people; p.fillStyle = "#91b76b"; p.fillRect(0, 0, 48, 24);
  p.drawImage(img[D.actors.builder[Math.floor(tick / 3) % 2]], 6, 5);
  p.drawImage(img[D.actors.tester[Math.floor(tick / 6) % 2]], 30, 5);
  const c = C.clouds;
  for (let x = 0; x < 6; x++) for (let y = 0; y < 3; y++) c.drawImage(img.grass_a, x * 16, y * 16);
  c.save(); c.globalAlpha = 0.14;
  c.drawImage(img.cloud_a, (Math.floor(tick / 4) % 150) - 50, 4);
  c.drawImage(img.cloud_b, ((Math.floor(tick / 4) + 70) % 130) - 34, 30);
  c.restore();
}
let tick = 0;
setInterval(() => { if (!document.getElementById("pause").checked) draw(tick++); }, 125);
</script>
`;
}

function main(): void {
  const root = process.cwd();
  if (!existsSync(join(root, "bot/assets/island/sprites.ts"))) {
    console.error("Run this from the repository root: node_modules/.bin/tsx bot/assets/island/motion-preview.ts");
    process.exit(1);
  }
  const problems = motionSpriteProblems();
  if (problems.length) {
    for (const problem of problems) console.error(`${problem.rule}: ${problem.name}: ${problem.detail}`);
    console.error(`${problems.length} problem(s); nothing written.`);
    process.exit(1);
  }
  const out = join(root, ".gstack/tmp/art");
  mkdirSync(join(out, "strips"), { recursive: true });
  const rgb = colors();
  const all: Record<string, string[]> = { ...SPRITES, ...MOTION_SPRITES };
  const grey: RGB = [128, 128, 128];

  // Contact sheet: same cell layout as generate.ts (4x, 6 columns), names in sheet.json.
  const entries = Object.entries(all);
  const padding = 16;
  const columns = 6;
  const cellWidth = 48 * SCALE + padding * 2;
  const cellHeight = 40 * SCALE + padding * 2;
  const sheet = blank(columns * cellWidth, Math.ceil(entries.length / columns) * cellHeight, grey);
  const cells = entries.map(([name, rows], index) => {
    const width = rows[0].length * SCALE;
    const height = rows.length * SCALE;
    const left = (index % columns) * cellWidth + (cellWidth - width) / 2;
    const top = Math.floor(index / columns) * cellHeight + (cellHeight - height) / 2;
    stamp(sheet, rows, left, top, SCALE, rgb);
    return { name, motion: name in MOTION_SPRITES, x: left, y: top, w: width, h: height };
  });
  writeFileSync(join(out, "sheet.png"), PNG.sync.write(sheet));
  writeFileSync(join(out, "sheet.json"), `${JSON.stringify({ scale: SCALE, cells }, null, 2)}\n`);

  for (const [family, names] of Object.entries(STRIPS)) {
    const grids = names.map((name) => all[name]);
    const height = Math.max(...grids.map((rows) => rows.length)) * SCALE + 8;
    const width = grids.reduce((sum, rows) => sum + rows[0].length * SCALE + 8, 8);
    const strip = blank(width, height + 8, grey);
    let left = 8;
    for (const rows of grids) {
      stamp(strip, rows, left, 8, SCALE, rgb);
      left += rows[0].length * SCALE + 8;
    }
    writeFileSync(join(out, "strips", `${family}.png`), PNG.sync.write(strip));
  }

  writeFileSync(join(out, "preview.html"), previewHtml(all, rgb));
  const motion = Object.keys(MOTION_SPRITES) as MotionSpriteName[];
  console.log(`Valid: ${motion.length} motion sprites, palette ${Object.keys(PALETTE).length} keys.`);
  console.log(`Wrote ${join(out, "sheet.png")}, sheet.json, strips/ (${Object.keys(STRIPS).length}) and preview.html.`);
}

if (process.argv[1] && /motion-preview\.ts$/.test(process.argv[1])) main();
