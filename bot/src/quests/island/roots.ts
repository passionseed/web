/**
 * Roots: reflections grow a tree's roots (20261113090000_shift_quest_roots,
 * schema 10). The database answers shift_quest_island_roots() with
 * [{slot, roots}] for the shown trees that have any (a level 1..3, never a
 * count, a name or an id); this module reads that once per picture and merges
 * it into the plots by slot. The 7 stages, coins and shop gates never depend on it.
 *
 * Optional: below schema 10 (a bot or website deployed before the migration)
 * nothing is called and every tree has roots 0. The version is read once per
 * QuestApi, like the bot's other optional features read it once at start, so
 * a database upgraded later shows roots after the next restart. A failed read
 * never fails the picture or the post: it is logged once per cause and the
 * trees are drawn without roots.
 *
 * Shared by the bot (the live post, /island) and the website (the island page
 * and its picture route): no Discord, Node or DOM imports.
 */
import { QuestDbError, QuestError, type QuestApi } from "../api";

import { rootsLevel } from "./scene";

/** The island schema that adds shift_quest_island_roots (20261113090000_shift_quest_roots.sql). */
export const ROOTS_SCHEMA = 10;

/** Roots by slot (levels 1..3 only). */
export type RootsBySlot = ReadonlyMap<number, number>;

const NONE: RootsBySlot = new Map();

/**
 * shift_quest_island_roots()'s answer as slot -> level, every field checked:
 * entries that are not {slot: positive integer, roots: 1..3} are left out, so a
 * surprise shape draws no roots instead of breaking the picture.
 */
export function rootsFrom(raw: unknown): RootsBySlot {
  if (!Array.isArray(raw)) return NONE;
  const out = new Map<number, number>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { slot, roots } = entry as { slot?: unknown; roots?: unknown };
    if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 1) continue;
    if (typeof roots !== "number" || !Number.isInteger(roots)) continue;
    const level = rootsLevel(roots);
    if (level > 0) out.set(slot, level);
  }
  return out;
}

/**
 * The plots with their roots merged by slot: a level only where the map has
 * one and the plot is not plain (a plain plot has no roots, whatever it was
 * sent). Any roots the plots already carried are replaced. New objects; the
 * input is not changed. A plot without roots has no roots field, so pictures
 * and signatures of an island without roots stay exactly as they were.
 */
export function withRoots<P extends { slot: number; plain?: boolean; roots?: number }>(plots: readonly P[], roots: RootsBySlot): P[] {
  return plots.map((plot) => {
    const { roots: _previous, ...rest } = plot;
    const level = plot.plain ? 0 : (roots.get(plot.slot) ?? 0);
    return (level > 0 ? { ...rest, roots: level } : rest) as P;
  });
}

const versions = new WeakMap<QuestApi, Promise<number>>();

/** The database's island schema, read once per api (a failed read is tried again next time). */
function schemaOf(api: QuestApi): Promise<number> {
  let version = versions.get(api);
  if (!version) {
    const read = api.call<number>("shift_quest_schema_version").then((v) => Number(v));
    version = read;
    versions.set(api, read);
    read.catch(() => {
      if (versions.get(api) === read) versions.delete(api);
    });
  }
  return version;
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
  console.warn(`${prefix} island roots off (${reason}); trees are drawn without roots`);
}

/**
 * The roots of every shown tree, or none: below schema 10, or when the read
 * fails (logged once per cause with `prefix`, e.g. "[shift-quests]"). Never throws.
 */
export async function readRoots(api: QuestApi, prefix = "[shift-quests]"): Promise<RootsBySlot> {
  try {
    const version = await schemaOf(api);
    if (!(version >= ROOTS_SCHEMA)) {
      logOnce(prefix, `schema ${version} < ${ROOTS_SCHEMA}`);
      return NONE;
    }
    return rootsFrom(await api.call<unknown>("shift_quest_island_roots"));
  } catch (error) {
    logOnce(prefix, reasonOf(error));
    return NONE;
  }
}

/** Test hook: forgets the causes already logged (versions are kept per api object; tests make a new one). */
export function resetRootsForTests(): void {
  logged.clear();
}
