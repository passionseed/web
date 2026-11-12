import "server-only";

import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";

import { campfireJoinUrl } from "./campfire";

/**
 * Discord links for the island's ⋯ menu, read through
 * shift_quest_island_links (migration 20261111094000_shift_quest_live.sql,
 * web only, same gate as shift_quest_island_map). Today that is the
 * suggestions channel an admin set with /admin channel kind:suggest: a forum
 * or text channel inside the SHIFT High zone, a group space every student
 * and staff member can read. Callers enforce eligibility first (a ready
 * viewer), as for every other island read.
 */

const SNOWFLAKE = /^[0-9]{5,25}$/;

/**
 * https://discord.com/channels/<guild>/<channel>, with the guild from
 * DISCORD_SHIFT_GUILD_ID (shiftDiscordUrls). Null when the channel id is not a
 * snowflake string or no valid guild is configured.
 */
export function discordChannelUrl(channelId: unknown): string | null {
  if (typeof channelId !== "string") return null;
  return campfireJoinUrl(null, channelId) || null;
}

/**
 * Logged once per process: a configuration gap every page load would hit
 * (the function missing before the migration, or no DISCORD_SHIFT_GUILD_ID
 * while a suggestions channel is set). Anything else is logged each time.
 */
const ONCE = new Set(["SQLSTATE 42883", "no_guild"]);
const logged = new Set<string>();

function logFailure(code: string): void {
  if (ONCE.has(code)) {
    if (logged.has(code)) return;
    logged.add(code);
  }
  console.error(`[shift-island] links read failed: ${code}`);
}

function failureCode(error: unknown): string {
  if (error instanceof QuestError) return `sq:${error.code}`;
  if (error instanceof QuestDbError) return `SQLSTATE ${error.sqlstate}`;
  return error instanceof Error ? error.name : "unknown";
}

/**
 * The "เสนอไอเดีย / แจ้งบั๊ก" link for one ready viewer, or null to hide it.
 * Fails soft: no suggestions channel set gives null quietly; a refusal, a
 * database error (the function missing before the migration, 42883, or not
 * granted, 42501), malformed data or no known guild give null and log only a
 * code.
 */
export async function suggestUrlOf(api: QuestApi, actor: string): Promise<string | null> {
  let channel: unknown;
  try {
    const raw = await api.call<unknown>("shift_quest_island_links", actor);
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || !("suggest_channel_id" in raw)) {
      logFailure("malformed");
      return null;
    }
    channel = (raw as { suggest_channel_id: unknown }).suggest_channel_id;
  } catch (error) {
    logFailure(failureCode(error));
    return null;
  }

  if (channel === null) return null;
  if (typeof channel !== "string" || !SNOWFLAKE.test(channel)) {
    logFailure("malformed");
    return null;
  }
  const url = discordChannelUrl(channel);
  if (!url) logFailure("no_guild");
  return url;
}
