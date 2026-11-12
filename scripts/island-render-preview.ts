/**
 * Renders SHIFT Island to a PNG with the bot's own renderer: no Discord, no
 * database, no env file. For checking sprites and layout in seconds.
 *
 *   pnpm island:render                         # the full sample island
 *   pnpm island:render --fixture empty         # full | empty | overflow
 *   pnpm island:render map.json                # a saved shift_quest_island_map result, or a plots array
 *   pnpm island:render --out island.png --thumb
 *
 * Options: --out <file> (default /tmp/shift-island-preview.png), --scale 1-4
 * (default 2, what /island sends), --thumb (scale 1), --no-festival, --no-pin.
 * Prints the file path, the size and the sign line the bot would send with it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderIsland, type IslandPlot } from "../bot/src/quests/island/render";

const DEFAULT_OUT = "/tmp/shift-island-preview.png";

const NAMES = [
  "ร้านขนมออนไลน์",
  "เกมพิกเซลสอนฟิสิกส์",
  "แอปจองคิวร้านตัดผม",
  "ติวคณิตออนไลน์",
  "เพลงประกอบหนังสั้น",
  "แผนที่ร้านอาหารใกล้โรงเรียน",
];

/** Plot k cycles through every stage and decoration, so each sprite appears. */
function plot(k: number): IslandPlot {
  return {
    slot: k + 1,
    stage: k % 8,
    visitor: k % 8 >= 3,
    key: k % 5 === 0,
    helper: k % 4 === 0,
    lantern: k % 7 === 0,
    name: k % 3 === 0 ? NAMES[(k / 3) % NAMES.length] : null,
    mine: k === 2,
  };
}

const FIXTURES: Record<string, () => IslandPlot[]> = {
  /** A pilot cohort: every stage and decoration, some names shown. */
  full: () => Array.from({ length: 24 }, (_, k) => plot(k)),
  /** Before anyone has a project. */
  empty: () => [],
  /** More plots than a cohort should ever have. */
  overflow: () => Array.from({ length: 130 }, (_, k) => plot(k)),
};

function usage(problem: string): never {
  console.error(`island:render: ${problem}`);
  console.error(
    "usage: pnpm island:render [map.json] [--fixture full|empty|overflow] [--out file.png] [--scale 1-4] [--thumb] [--no-festival] [--no-pin]"
  );
  process.exit(2);
}

/** A saved shift_quest_island_map result ({ plots, season }) or a bare array of plots. */
function readMap(file: string): { plots: IslandPlot[]; festival: boolean } {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    usage(`cannot read ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const map = Array.isArray(raw) ? { plots: raw, season: null } : (raw as { plots?: unknown; season?: unknown });
  if (!map || !Array.isArray(map.plots)) usage(`${file}: expected { "plots": [...] } or an array of plots`);
  const plots = map.plots.map((value: unknown, k: number): IslandPlot => {
    const p = value as Partial<IslandPlot>;
    if (typeof p?.slot !== "number" || typeof p?.stage !== "number") {
      usage(`${file}: plot ${k} needs a numeric slot and stage`);
    }
    return {
      slot: p.slot,
      stage: p.stage,
      visitor: Boolean(p.visitor),
      key: Boolean(p.key),
      helper: Boolean(p.helper),
      lantern: Boolean(p.lantern),
      name: typeof p.name === "string" ? p.name : null,
      mine: Boolean(p.mine),
    };
  });
  return { plots, festival: Boolean(map.season) };
}

function main(): void {
  const args = process.argv.slice(2);
  let fixture = "full";
  let file: string | null = null;
  let out = DEFAULT_OUT;
  let scale = 2;
  let festival: boolean | null = null;
  let pin = true;

  for (let k = 0; k < args.length; k++) {
    const arg = args[k];
    const value = () => args[++k] ?? usage(`${arg} needs a value`);
    if (arg === "--fixture") fixture = value();
    else if (arg === "--out") out = value();
    else if (arg === "--scale") scale = Number(value());
    else if (arg === "--thumb") scale = 1;
    else if (arg === "--no-festival") festival = false;
    else if (arg === "--no-pin") pin = false;
    else if (arg === "--help" || arg === "-h") usage("render a preview island");
    else if (arg.startsWith("-")) usage(`unknown option ${arg}`);
    else file = arg;
  }
  if (!Number.isInteger(scale) || scale < 1 || scale > 4) usage("--scale must be 1, 2, 3 or 4");
  if (!file && !FIXTURES[fixture]) usage(`unknown fixture ${fixture}`);

  const source = file ? readMap(file) : { plots: FIXTURES[fixture](), festival: true };
  const started = performance.now();
  const island = renderIsland(source.plots, { scale, markMine: pin, festival: festival ?? source.festival });
  const ms = performance.now() - started;
  writeFileSync(out, island.png);

  const signs = source.plots
    .filter((p) => p.name)
    .map((p) => `#${island.numbers.get(p.slot)} ${p.name}`);
  console.log(resolve(out));
  console.log(
    `${file ?? `fixture ${fixture}`}: ${source.plots.length} plots, ${island.width}x${island.height}, ` +
      `${(island.png.length / 1024).toFixed(1)} KB, rendered in ${ms.toFixed(0)} ms`
  );
  if (signs.length) console.log(`🪧 ${signs.join(" · ")}`);
}

main();
