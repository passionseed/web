import "server-only";

import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";

import { campfireJoinUrl } from "./campfire";
import type { DeepFire } from "./types";

export type { DeepFire } from "./types";

/**
 * The deep fire on the island (กองไฟโฟกัส, shift_quest_deepfire, migration
 * 20261120120000_shift_quest_deep_fire.sql, schema 22): the Discord lobby
 * where joining builds a locked voice room for one person, and whether the
 * quest bot that builds those rooms beat ready in the last 3 minutes. The
 * database keeps no rooms, no times and no ids of anyone in them; this reads
 * only the lobby, the guild and `live`. Callers enforce eligibility first (a
 * ready viewer), as for every other island read.
 *
 * Plan: docs/designs/shift-island-deep-fire.md.
 */

const SNOWFLAKE = /^[0-9]{5,25}$/;

/** What shift_quest_deepfire returns. */
interface DeepFireRow {
  channel_id: unknown;
  guild_id: unknown;
  live: unknown;
}

/** Logged once per process: before the migration every page load would hit it. */
let loggedMissing = false;

function logFailure(code: string): void {
  if (code === "SQLSTATE 42883") {
    if (loggedMissing) return;
    loggedMissing = true;
  }
  console.error(`[shift-island] deep fire read failed: ${code}`);
}

function failureCode(error: unknown): string {
  if (error instanceof QuestError) return `sq:${error.code}`;
  if (error instanceof QuestDbError) return `SQLSTATE ${error.sqlstate}`;
  return error instanceof Error ? error.name : "unknown";
}

/**
 * The deep fire for one ready viewer: the lobby's join link (the guild the
 * bot reported, else DISCORD_SHIFT_GUILD_ID, as campfireJoinUrl) and `live`.
 * No lobby set: null, quietly. Fails soft: a refusal, a database error (the
 * function missing before the migration, 42883, logged once; not granted,
 * 42501), malformed data or no known guild all give null, and only a code is
 * logged.
 */
export async function deepfireOf(api: QuestApi, actor: string): Promise<DeepFire | null> {
  let row: DeepFireRow;
  try {
    const raw = await api.call<unknown>("shift_quest_deepfire", actor);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      logFailure("malformed");
      return null;
    }
    row = raw as DeepFireRow;
  } catch (error) {
    logFailure(failureCode(error));
    return null;
  }

  if (row.channel_id === null) return null;
  if (typeof row.channel_id !== "string" || !SNOWFLAKE.test(row.channel_id)) {
    logFailure("malformed");
    return null;
  }
  const joinUrl = campfireJoinUrl(typeof row.guild_id === "string" ? row.guild_id : null, row.channel_id);
  if (!joinUrl) {
    logFailure("no_guild");
    return null;
  }
  return { joinUrl, live: row.live === true };
}
