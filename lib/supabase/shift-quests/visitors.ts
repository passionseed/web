import "server-only";

import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";
import { schemaOf } from "@/bot/src/quests/schema";
import { VISITORS_SCHEMA, visitorsFrom, type IslandVisitors } from "@/lib/shift-island/visitors";

/** Logged once per process: a database that refuses would log it on every page load. */
let logged = false;

function failureCode(error: unknown): string {
  if (error instanceof QuestError) return `sq:${error.code}`;
  if (error instanceof QuestDbError) return `SQLSTATE ${error.sqlstate}`;
  return error instanceof Error ? error.name : "unknown";
}

function logFailure(code: string): void {
  if (logged) return;
  logged = true;
  console.error(`[shift-island] visitors read failed: ${code}`);
}

/**
 * Today's visitors for one ready viewer (shift_quest_island_visitors): the
 * island's count and the viewer's own team's, two integers. Soft both ways:
 * before schema 17 the function is never called, and any refusal, database
 * error or malformed answer gives null (logged once, as a code). null draws
 * no figures; the island works the same without them.
 */
export async function visitorsOf(api: QuestApi, actor: string): Promise<IslandVisitors | null> {
  const schema = await schemaOf(api).catch(() => 0);
  if (schema < VISITORS_SCHEMA) return null;
  try {
    const visitors = visitorsFrom(await api.call<unknown>("shift_quest_island_visitors", actor));
    if (!visitors) logFailure("malformed");
    return visitors;
  } catch (error) {
    logFailure(failureCode(error));
    return null;
  }
}
