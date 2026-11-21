/**
 * Healing island states: how healthy each element's sector looks.
 *
 * The island starts sick and each element's teams heal their own sector by
 * logging tester entries. healthFor turns tonight's tallies into a health per
 * element; renderIsland passes it to paintHealth, which paints the sick look
 * over the sectors below full health. The bot's schedule (E19) always calls
 * healthFor, so healing is on whenever a guild's settings say so.
 *
 * Health is per SECTOR (the wedge of the island where a slot sits), not per
 * team element: an overflow team planted in another element's sector looks as
 * healthy as that sector.
 *
 * The sick look at step 0, all mixed back toward the healthy colours step by
 * step (bot/assets/elemental/sick-sprites.ts holds the colours and art):
 * - every colour in the sector desaturated (dry grass, grey sand);
 * - the sea in the sector darkened;
 * - a haze of dust dithered over it;
 * - trees bare: leaves drop in an ordered dither, a leafless crown shows
 *   through, and the leaves left turn dead brown.
 * Flags, lanterns, number tags and badge pips are drawn after paintHealth, so
 * they stay bright.
 *
 * Pure and deterministic: the same health and trees give the same pixels.
 */
import { BARE_BRANCHES, BARE_PALETTE, SICK_COLOURS, SICK_HAZE } from "../../../bot/assets/elemental/sick-sprites";

import { sectorOfTile, tileAt, type ElementalLayout } from "./layout";
import { SECTOR_ORDER, type SectorElement } from "./sectors";
import { bitmap, hexRgba, pack, type Surface } from "./surface";

/** Health per element sector, 0 (sick) to 1 (healthy). */
export type ElementHealth = Record<SectorElement, number>;

/** One element's tally for healing: counted tester entries and active teams. Numbers only. */
export interface ElementTally {
  counted: number;
  teams: number;
}

/** Per-element tallies (E19 builds these from elemental_bot_totals). A missing element counts as 0 and 0. */
export type HealthTotals = Partial<Record<SectorElement, ElementTally>>;

/** The healing fields of a guild's elemental_settings row; a whole row may be passed, only these are read. */
export interface HealthSettings {
  /** Healing is off (every sector healthy) unless this is exactly true (the column defaults to false). */
  healing_enabled?: boolean | null;
  /** Counted entries each team owes for its element to be fully healed. 1..50, default 3. */
  heal_per_team?: number | null;
  /** How many visible steps from sick to healthy. 1..20, default 5. */
  heal_steps?: number | null;
  /**
   * Optional (no settings column yet): hold the element furthest behind at 0
   * until every other element is fully healed, so one sector stays sick for
   * the finale. Off unless exactly true.
   */
  hold_last_at_zero?: boolean | null;
}

/** The settings' defaults and bounds, as the elemental_settings columns have them. */
export const HEAL_STEPS = { default: 5, min: 1, max: 20 } as const;
export const HEAL_PER_TEAM = { default: 3, min: 1, max: 50 } as const;

/** Every element at full health. */
export function fullHealth(): ElementHealth {
  return Object.fromEntries(SECTOR_ORDER.map((e) => [e, 1])) as ElementHealth;
}

/** A whole number within bounds; anything that is not a finite number gives the default. */
function setting(value: unknown, bounds: { default: number; min: number; max: number }): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return bounds.default;
  return Math.min(Math.max(Math.floor(value), bounds.min), bounds.max);
}

/** A count: a whole number, 0 or more; anything else is 0. */
function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * Each element's health for tonight's picture:
 * health = min(1, floor(counted / (heal_per_team x teams) x steps) / steps).
 * An element with no teams is healed as if it had one (so it stays sick until
 * someone counts for it). All 1 when healing is not enabled.
 */
export function healthFor(totals: HealthTotals, settings: HealthSettings): ElementHealth {
  if (settings?.healing_enabled !== true) return fullHealth();
  const steps = setting(settings.heal_steps, HEAL_STEPS);
  const perTeam = setting(settings.heal_per_team, HEAL_PER_TEAM);

  const progress = SECTOR_ORDER.map((e) => {
    const tally = totals?.[e];
    const need = perTeam * Math.max(1, count(tally?.teams));
    // Whole-number arithmetic: floor(counted * steps / need) has no float error at the step edges.
    return { e, ratio: count(tally?.counted) / need, step: Math.min(steps, Math.floor((count(tally?.counted) * steps) / need)) };
  });
  const health = Object.fromEntries(progress.map((p) => [p.e, p.step / steps])) as ElementHealth;

  if (settings.hold_last_at_zero === true) {
    // The element furthest behind; a tie goes to the later one in the fixed order.
    const last = progress.reduce((low, p) => (p.ratio <= low.ratio ? p : low));
    if (SECTOR_ORDER.some((e) => e !== last.e && health[e] < 1)) health[last.e] = 0;
  }
  return health;
}

/** A tree as healing sees it: where it stands and which sector's health applies. */
export interface HealthTree {
  slot: number;
  sector: SectorElement;
  stage: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What paintHealth may read: the layout drawn, each sector's health and the trees. */
export interface HealthPaint {
  layout: ElementalLayout;
  health: Readonly<ElementHealth>;
  trees: readonly HealthTree[];
}

// ---- Masks ----

const tileMasks = new Map<ElementalLayout, Uint8Array>();

/** In a mask: a pixel no sector owns (the plaza and its well stay as they are). */
export const NO_SECTOR = 255;

function inPlaza(layout: ElementalLayout, tx: number, ty: number): boolean {
  const p = layout.plaza;
  return tx >= p.x && tx < p.x + p.w && ty >= p.y && ty < p.y + p.h;
}

/** Each pixel's sector (index into SECTOR_ORDER) by the tile it sits on; the plaza is NO_SECTOR. Cached per layout. */
function tileMask(layout: ElementalLayout): Uint8Array {
  let mask = tileMasks.get(layout);
  if (mask) return mask;
  mask = new Uint8Array(layout.width * layout.height);
  const t = layout.tile;
  for (let ty = 0; ty < layout.rows; ty++) {
    for (let tx = 0; tx < layout.cols; tx++) {
      const k = inPlaza(layout, tx, ty) ? NO_SECTOR : SECTOR_ORDER.indexOf(sectorOfTile(layout, tx, ty));
      for (let j = 0; j < t; j++) mask.fill(k, (ty * t + j) * layout.width + tx * t, (ty * t + j) * layout.width + tx * t + t);
    }
  }
  tileMasks.set(layout, mask);
  return mask;
}

/**
 * Which sector's health each pixel takes (index into SECTOR_ORDER, row-major):
 * the sector of its tile, except that a tree's whole box takes the tree's own
 * sector, so a tree near a sector edge heals with its plot, and the plaza
 * (with its well) is NO_SECTOR: the shared centre never sickens. paintHealth
 * changes no pixel outside the mask of a sector below full health.
 */
export function healthSectorMask(layout: ElementalLayout, trees: readonly HealthTree[]): Uint8Array {
  const mask = tileMask(layout).slice();
  for (const tree of trees) {
    const k = SECTOR_ORDER.indexOf(tree.sector);
    if (k < 0) continue;
    const x0 = Math.max(0, tree.x);
    const x1 = Math.min(layout.width, tree.x + tree.w);
    if (x1 <= x0) continue;
    for (let y = Math.max(0, tree.y); y < Math.min(layout.height, tree.y + tree.h); y++) mask.fill(k, y * layout.width + x0, y * layout.width + x1);
  }
  return mask;
}

// ---- Colours ----

/** 4 x 4 ordered dither thresholds, 0..15. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** At step 0 this many of every 16 pixels carry haze. */
const HAZE_DENSITY = 5;

function rgba(hex: string): readonly [number, number, number, number] {
  const c = hexRgba(hex);
  if (!c) throw new Error(`bad colour ${hex}`);
  return c;
}

/** Packed healthy colour to packed sick colour. Dead wood maps to itself (already sick). */
const SICK: ReadonlyMap<number, number> = new Map([
  ...Object.entries(SICK_COLOURS).map(([from, to]) => [pack(rgba(from)), pack(rgba(to))] as const),
  ...Object.values(BARE_PALETTE).map((hex) => [pack(rgba(hex)), pack(rgba(hex))] as const),
]);
const BARE_PX: readonly (readonly number[])[] = BARE_BRANCHES.map((row) => [...row].map((ch) => (BARE_PALETTE[ch] ? pack(rgba(BARE_PALETTE[ch])) : 0)));
const HAZE = rgba(SICK_HAZE.colour);

const unpack = (v: number) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, v >>> 24] as const;
const repack = (r: number, g: number, b: number, a: number) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;

/** A colour not in the island's palette, at step 0: mostly grey and a little darker. */
function genericSick(v: number): number {
  const [r, g, b, a] = unpack(v);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const f = (c: number) => Math.round((c + (lum - c) * 0.75) * 0.85);
  return repack(f(r), f(g), f(b), a);
}

/** Mixes healthy toward sick by `s` (0 healthy, 1 sick), then dithers in haze when asked. */
function sickColour(v: number, s: number, hazed: boolean): number {
  const [r, g, b, a] = unpack(v);
  const [sr, sg, sb] = unpack(SICK.get(v) ?? genericSick(v));
  let out = [r + (sr - r) * s, g + (sg - g) * s, b + (sb - b) * s];
  if (hazed) out = out.map((c, i) => c + (HAZE[i] - c) * SICK_HAZE.strength);
  return repack(Math.round(out[0]), Math.round(out[1]), Math.round(out[2]), a);
}

// ---- Bare trees ----

/** The row where a tree sprite's trunk starts: everything above it is leaves. Cached per sprite. */
const trunkTops = new Map<string, number>();
function trunkTop(sprite: string): number {
  let top = trunkTops.get(sprite);
  if (top !== undefined) return top;
  const b = bitmap(sprite);
  const wood = new Set(["#79583F", "#A97950", "#C89561"].map((hex) => pack(rgba(hex))));
  top = b.h;
  for (let j = 0; j < b.h && top === b.h; j++) for (let i = 0; i < b.w; i++) if (wood.has(b.px[j * b.w + i])) top = j;
  trunkTops.set(sprite, top);
  return top;
}

/** Trees with leaves start at this stage (0 is a stump, 1 a seed). */
const FIRST_LEAFY_STAGE = 2;

/** Drops a sick tree's leaves in an ordered dither: the bare crown where it has a branch, else the ground beneath. */
function bareTree(surface: Surface, layout: ElementalLayout, tree: HealthTree, s: number): void {
  if (tree.stage < FIRST_LEAFY_STAGE) return;
  const sprite = `stage_${tree.stage}`;
  const b = bitmap(sprite);
  const top = trunkTop(sprite);
  // The crown's bottom row meets the trunk top.
  const shift = BARE_BRANCHES.length - top;
  const t = layout.tile;
  for (let j = 0; j < top; j++) {
    const y = tree.y + j;
    if (y < 0 || y >= surface.height) continue;
    for (let i = 0; i < b.w; i++) {
      const x = tree.x + i;
      if (x < 0 || x >= surface.width || b.px[j * b.w + i] === 0) continue;
      if (BAYER[(y & 3) * 4 + (x & 3)] >= s * 16) continue;
      const branch = BARE_PX[j + shift]?.[i] ?? 0;
      let v = branch;
      if (!v) {
        const tile = bitmap(tileAt(layout, Math.floor(x / t), Math.floor(y / t)));
        v = tile.px[(y % t) * tile.w + (x % t)];
      }
      if (v) surface.px[y * surface.width + x] = v;
    }
  }
}

/**
 * Paints the sick look over sectors below full health. renderIsland calls it
 * after the ground, the well and the trees, and before the flags, lanterns,
 * number tags and badge pips (so those stay bright), and only when some
 * element is below 1. Writes only inside healthSectorMask's pixels of the
 * sectors below 1.
 */
export function paintHealth(surface: Surface, paint: HealthPaint): void {
  const { layout, trees } = paint;
  const sick = SECTOR_ORDER.map((e) => {
    const h = paint.health?.[e];
    return typeof h === "number" && Number.isFinite(h) ? 1 - Math.min(Math.max(h, 0), 1) : 0;
  });
  if (sick.every((s) => s <= 0)) return;

  for (const tree of trees) {
    const k = SECTOR_ORDER.indexOf(tree.sector);
    if (k >= 0 && sick[k] > 0) bareTree(surface, layout, tree, sick[k]);
  }

  const mask = healthSectorMask(layout, trees);
  const hazeCut = sick.map((s) => s * HAZE_DENSITY);
  // One cache per sector and haze: the island has few distinct colours.
  const cache = sick.map(() => [new Map<number, number>(), new Map<number, number>()]);
  const { px, width, height } = surface;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    const bayerRow = ((y + 1) & 3) * 4;
    for (let x = 0; x < width; x++) {
      const k = row + x;
      const sector = mask[k];
      const s = sick[sector];
      // NO_SECTOR reads undefined: left as it is.
      if (!(s > 0)) continue;
      const hazed = BAYER[bayerRow + ((x + 2) & 3)] < hazeCut[sector];
      const memo = cache[sector][hazed ? 1 : 0];
      const v = px[k];
      let out = memo.get(v);
      if (out === undefined) {
        out = sickColour(v, s, hazed);
        memo.set(v, out);
      }
      px[k] = out;
    }
  }
}
