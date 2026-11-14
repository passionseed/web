/**
 * Tree styles: each team's leaf, bark and blossom colours and its planted seed
 * (20261114120000_shift_quest_tree_style, schema 13). The database answers
 * shift_quest_island_styles() with [{slot, seed, equipped}] for the shown
 * (name-visible) plots that have a style row; this module reads that once per
 * picture and merges it into the plots by slot. Coins, stages and gates never
 * depend on it.
 *
 * Optional, like roots: below schema 13 nothing is called and every tree is
 * drawn as it was. A failed read never fails the picture: it is logged once
 * per cause and the trees keep the default look. Unknown or malformed style
 * data resolves to the slot default and never throws.
 *
 * Shared by the bot and the website: no Discord, Node or DOM imports.
 */
import { resolveStyle, SEEDS, type TreeStyle } from "@/lib/shift-island/tree-style";
import type { MyTree } from "@/lib/supabase/shift-quests/types";
import { QuestDbError, QuestError, type QuestApi } from "../api";
import { schemaOf } from "../schema";

/** The island schema that adds the tree style reads. */
export const TREE_SCHEMA = 13;

export interface PlotStyle {
  seed: string | null;
  style: TreeStyle;
}
export type StylesBySlot = ReadonlyMap<number, PlotStyle>;

const NONE: StylesBySlot = new Map();

const seedOf = (value: unknown): string | null => (typeof value === "string" && value in SEEDS ? value : null);

/** shift_quest_island_styles()'s answer as slot -> {seed, style}; malformed entries are left out. */
export function stylesFrom(raw: unknown): StylesBySlot {
  if (!Array.isArray(raw)) return NONE;
  const out = new Map<number, PlotStyle>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { slot, seed, equipped } = entry as { slot?: unknown; seed?: unknown; equipped?: unknown };
    if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 1) continue;
    if (!equipped || typeof equipped !== "object") continue;
    out.set(slot, { seed: seedOf(seed), style: resolveStyle(equipped) });
  }
  return out;
}

/** Distinct, order-free key of a style, for caches and picture versions. */
export function styleKey(style: TreeStyle): string {
  return `${style.shape}/${style.leaf}/${style.bark}/${style.bloom}`;
}

/**
 * The plots with their style merged by slot: only where the plot is not plain
 * (a plain plot shows no tree detail). The caller's own plot uses `mine`
 * (their live tree) when given. Previous style fields are replaced. A plot
 * without a style has no style field, so an island without styles stays as it was.
 */
export function withStyles<P extends { slot: number; plain?: boolean; mine?: boolean; style?: TreeStyle; seeded?: boolean }>(
  plots: readonly P[],
  styles: StylesBySlot,
  mine: MyTree | null = null
): P[] {
  return plots.map((plot) => {
    const { style: _style, seeded: _seeded, ...rest } = plot;
    if (plot.plain) return rest as P;
    const found: PlotStyle | null =
      plot.mine && mine ? { seed: seedOf(mine.seed), style: resolveStyle(mine.equipped) } : (styles.get(plot.slot) ?? null);
    if (!found) return rest as P;
    return { ...rest, style: found.style, ...(found.seed ? { seeded: true } : {}) } as P;
  });
}

const logged = new Set<string>();

/** A failure as a code only: database messages can carry student text, which never goes to logs. */
function reasonOf(error: unknown): string {
  if (error instanceof QuestError) return `sq:${error.code}`;
  if (error instanceof QuestDbError) return `SQLSTATE ${error.sqlstate}`;
  return error instanceof Error ? error.name : "unknown";
}

function logOnce(prefix: string, reason: string): void {
  const key = `${prefix} ${reason}`;
  if (logged.has(key)) return;
  logged.add(key);
  console.warn(`${prefix} island tree styles off (${reason}); trees are drawn with the default look`);
}

/** The styles of every shown tree, or none: below schema 13, or when the read fails (logged once per cause). Never throws. */
export async function readStyles(api: QuestApi, log = "[shift-quests]"): Promise<StylesBySlot> {
  try {
    const version = await schemaOf(api);
    if (!(version >= TREE_SCHEMA)) {
      logOnce(log, `schema ${version} < ${TREE_SCHEMA}`);
      return NONE;
    }
    return stylesFrom(await api.call<unknown>("shift_quest_island_styles"));
  } catch (error) {
    logOnce(log, reasonOf(error));
    return NONE;
  }
}

const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const count = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

/** shift_quest_tree_get's answer with every field checked; null when it is not a tree at all. */
export function myTreeFrom(raw: unknown): MyTree | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!r.equipped || typeof r.equipped !== "object") return null;
  const gifts = Array.isArray(r.gifts)
    ? r.gifts.flatMap((g) => {
        const gift = g as { id?: unknown; options?: unknown } | null;
        return gift && typeof gift.id === "string" && isStrings(gift.options) ? [{ id: gift.id, options: gift.options }] : [];
      })
    : [];
  const roots = (r.roots && typeof r.roots === "object" ? r.roots : {}) as { count?: unknown; recent?: unknown };
  return {
    seed: seedOf(r.seed),
    equipped: resolveStyle(r.equipped),
    owned: isStrings(r.owned) ? r.owned : [],
    gifts,
    roots: { count: count(roots.count), recent: count(roots.recent) },
    stage: count(r.stage),
  };
}

/** The caller's own tree (shift_quest_tree_get), or null: below schema 13, no project, or any failure. Never throws. */
export async function readMyTree(api: QuestApi, actor: string, log = "[shift-quests]"): Promise<MyTree | null> {
  try {
    if (!((await schemaOf(api)) >= TREE_SCHEMA)) return null;
    return myTreeFrom(await api.call<unknown>("shift_quest_tree_get", actor));
  } catch (error) {
    logOnce(log, `own tree ${reasonOf(error)}`);
    return null;
  }
}

/** Test hook: forgets the causes already logged. */
export function resetTreeForTests(): void {
  logged.clear();
}
