/**
 * Writes lib/elemental/island/slot-pool.json: the Elemental island's 200 plot
 * slots split into 5 element sectors around the plaza.
 *
 *   pnpm tsx scripts/elemental/gen-slot-pool.ts            # rewrite the file
 *   pnpm tsx scripts/elemental/gen-slot-pool.ts --check    # exit 1 if it is stale
 *   pnpm tsx scripts/elemental/gen-slot-pool.ts --out x.json
 *
 * Source: SHIFT High Island's fixed slot spots (SPOTS in
 * bot/src/quests/island/scene.ts), imported read-only. Slot k sits on
 * SPOTS[k - 1], and SPOTS is sorted by distance from the plaza, so a lower
 * slot is always nearer the plaza.
 *
 * How the split works, all deterministic:
 * 1. Each spot's centre is its tree footprint's centre (the 4 x 4 tiles SHIFT
 *    checks for land), measured from the plaza centre and scaled by the land's
 *    half-width and half-height, so the wedges follow the island's ellipse.
 * 2. Spots are sorted clockwise from north by that angle (ties by slot) and
 *    cut into 5 runs of 40, in the fixed element order. Each run is a wedge.
 * 3. Each element's preference list is its own wedge by distance from the
 *    plaza (slot order), then every other slot by its distance to the nearest
 *    slot of the wedge (ties by slot), so an overflow team lands beside its
 *    own sector, not across the island.
 *
 * Pure until main(): the tests import buildSlotPool and renderSlotPool.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { SPOTS, layoutFor } from "../../bot/src/quests/island/scene";

/** Slots on the Elemental island. */
export const POOL_SLOTS = 200;
/** Fixed element order: also the clockwise sector order from north. Equal to E02's ELEMENT_KEYS (jest parity test). */
export const POOL_ORDER = ["water", "earth", "air", "fire", "aether"] as const;
type Element = (typeof POOL_ORDER)[number];

export const DEFAULT_OUT = join(__dirname, "..", "..", "lib", "elemental", "island", "slot-pool.json");

export interface GeneratedSlotPool {
  v: 1;
  source: string;
  slots: number;
  order: Element[];
  /** Half-width and half-height of the land, in tiles: the angle's scale. */
  axes: { ax: number; ay: number };
  /** Where each sector starts, in degrees clockwise from north; sector k spans [starts[k], starts[k + 1]). */
  starts: number[];
  /** Each sector's slots, nearest the plaza first. */
  sectors: Record<Element, number[]>;
  /** Each element's full slot preference: its sector, then the rest by distance to the sector. */
  preference: Record<Element, number[]>;
}

/** Rounded to 6 decimals so the file never carries float noise. */
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Clockwise degrees from north, [0, 360), of a point in tiles from the plaza centre (y grows down). */
export function clockwiseDegrees(dx: number, dy: number, ax: number, ay: number): number {
  const deg = (Math.atan2(dx / ax, -dy / ay) * 180) / Math.PI;
  return deg < 0 ? deg + 360 : deg;
}

/**
 * A slot's tree footprint centre, as a point in tiles from the plaza centre:
 * SHIFT checks tile columns x-1..x+2 and rows y-2..y+1 for land, a block that
 * spans [x-1, x+3) by [y-2, y+2), so its centre is (x+1, y).
 */
function footprintCentre(slot: number): { x: number; y: number } {
  const s = SPOTS[slot - 1];
  return { x: s.x + 1, y: s.y };
}

/** Half-extents of the land on the 200-slot island, measured from its land grid. */
function landAxes(): { ax: number; ay: number } {
  const layout = layoutFor(POOL_SLOTS);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  layout.land.forEach((row, y) =>
    row.forEach((land, x) => {
      if (!land) return;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    })
  );
  return { ax: (maxX - minX + 1) / 2, ay: (maxY - minY + 1) / 2 };
}

export function buildSlotPool(): GeneratedSlotPool {
  if (SPOTS.length < POOL_SLOTS) throw new Error(`SPOTS has ${SPOTS.length} spots, fewer than ${POOL_SLOTS}`);
  const axes = landAxes();
  const slots = Array.from({ length: POOL_SLOTS }, (_, k) => k + 1);
  const angle = new Map(
    slots.map((slot) => {
      const c = footprintCentre(slot);
      return [slot, clockwiseDegrees(c.x, c.y, axes.ax, axes.ay)];
    })
  );
  const byAngle = [...slots].sort((a, b) => angle.get(a)! - angle.get(b)! || a - b);

  const per = POOL_SLOTS / POOL_ORDER.length;
  const sectors = {} as Record<Element, number[]>;
  const starts: number[] = [];
  POOL_ORDER.forEach((element, k) => {
    const run = byAngle.slice(k * per, (k + 1) * per);
    sectors[element] = [...run].sort((a, b) => a - b);
    // A sector starts halfway between the previous run's last angle and its own first; the first starts at north.
    starts.push(k === 0 ? 0 : round6((angle.get(byAngle[k * per - 1])! + angle.get(run[0])!) / 2));
  });

  const preference = {} as Record<Element, number[]>;
  for (const element of POOL_ORDER) {
    const own = sectors[element];
    const ownSet = new Set(own);
    const home = own.map(footprintCentre);
    const reach = new Map(
      slots
        .filter((slot) => !ownSet.has(slot))
        .map((slot) => {
          const c = footprintCentre(slot);
          // Squared distances between integer points are exact, so ties are exact too.
          return [slot, Math.min(...home.map((h) => (h.x - c.x) ** 2 + (h.y - c.y) ** 2))];
        })
    );
    const rest = [...reach.keys()].sort((a, b) => reach.get(a)! - reach.get(b)! || a - b);
    preference[element] = [...own, ...rest];
  }

  return {
    v: 1,
    source: "bot/src/quests/island/scene.ts SPOTS, slots 1..200 (generated by scripts/elemental/gen-slot-pool.ts; do not edit by hand)",
    slots: POOL_SLOTS,
    order: [...POOL_ORDER],
    axes,
    starts,
    sectors,
    preference,
  };
}

/** The file's bytes: stable key order, number lists on one line, trailing newline. */
export function renderSlotPool(pool: GeneratedSlotPool = buildSlotPool()): string {
  const list = (xs: readonly (number | string)[]) => `[${xs.map((x) => JSON.stringify(x)).join(", ")}]`;
  const record = (r: Record<Element, number[]>) =>
    `{\n${POOL_ORDER.map((e) => `    ${JSON.stringify(e)}: ${list(r[e])}`).join(",\n")}\n  }`;
  return [
    "{",
    `  "v": ${pool.v},`,
    `  "source": ${JSON.stringify(pool.source)},`,
    `  "slots": ${pool.slots},`,
    `  "order": ${list(pool.order)},`,
    `  "axes": { "ax": ${pool.axes.ax}, "ay": ${pool.axes.ay} },`,
    `  "starts": ${list(pool.starts)},`,
    `  "sectors": ${record(pool.sectors)},`,
    `  "preference": ${record(pool.preference)}`,
    "}",
    "",
  ].join("\n");
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** Writes the pool to a path and returns the file's sha256. */
export function writeSlotPool(out: string = DEFAULT_OUT): string {
  const text = renderSlotPool();
  writeFileSync(out, text);
  return sha256(text);
}

function main(argv: string[]): number {
  const outAt = argv.indexOf("--out");
  const out = outAt >= 0 ? argv[outAt + 1] : DEFAULT_OUT;
  if (!out) {
    console.error("--out needs a path");
    return 2;
  }
  if (argv.includes("--check")) {
    let current = "";
    try {
      current = readFileSync(out, "utf8");
    } catch {
      // A missing file is stale.
    }
    const fresh = renderSlotPool();
    if (current !== fresh) {
      console.error(`${out} is stale: run pnpm tsx scripts/elemental/gen-slot-pool.ts`);
      return 1;
    }
    console.log(`${out} is current (sha256 ${sha256(fresh)})`);
    return 0;
  }
  console.log(`wrote ${out} (sha256 ${writeSlotPool(out)})`);
  return 0;
}

if (/gen-slot-pool\.ts$/.test(process.argv[1] ?? "")) process.exit(main(process.argv.slice(2)));
