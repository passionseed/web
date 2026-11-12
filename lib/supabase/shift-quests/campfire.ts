import "server-only";

import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";
import { shiftDiscordUrls } from "@/lib/shift/discordGuild";

import type { CampfireNames } from "./types";

/**
 * The voice campfire on the island: who is in the SHIFT coworking voice
 * channel right now (shift_quest_campfire, migration
 * 20261111093000_shift_quest_campfire.sql). The quest bot keeps only who is in
 * the channel now and deletes the row on leave; this module reads a
 * privacy-shaped summary (a count, and names only when asked) and never a
 * Discord id, a join time, or anything that links a person to a project or a
 * plot. Callers enforce eligibility first (a ready viewer), as for every other
 * island read.
 *
 * Plan: docs/designs/shift-high-island-web.md, "Festival, notice board, voice
 * campfire, canvas link", section 4.
 */

const SNOWFLAKE = /^[0-9]{5,25}$/;
/** shiftDiscordUrls().server for a valid guild id. */
const SERVER_URL = /^https:\/\/discord\.com\/channels\/[0-9]{5,25}$/;
/** As many names as the database ever returns. */
const MAX_NAMES = 50;
const NAME_CHARS = 32;
/** A name that is empty once cleaned (DRAFT copy). */
export const VOICE_NAME_FALLBACK = "เพื่อนใน SHIFT";

/** Bidi controls and zero-width characters (plus U+061C, the Arabic letter mark). */
const INVISIBLE = /[\u061C\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
const CONTROL_SPACE = /[\t\n\v\f\r\u0085]/g;
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/g;

/**
 * A Discord display name as the island shows it: control, bidi and
 * zero-width characters removed, whitespace collapsed, trimmed, at most 32
 * characters. Empty (or not a string) becomes "เพื่อนใน SHIFT".
 */
export function sanitizeVoiceName(raw: unknown): string {
  if (typeof raw !== "string") return VOICE_NAME_FALLBACK;
  const clean = raw
    .replace(INVISIBLE, "")
    .replace(CONTROL_SPACE, " ")
    .replace(CONTROL, "")
    .replace(/\s+/g, " ")
    .trim();
  const cut = Array.from(clean).slice(0, NAME_CHARS).join("").trim();
  return cut || VOICE_NAME_FALLBACK;
}

/**
 * The "เข้าห้อง" link: https://discord.com/channels/<guild>/<channel>. The guild
 * is the one the bot reported (when it is a snowflake), else
 * DISCORD_SHIFT_GUILD_ID (shiftDiscordUrls). Empty when no valid guild is known
 * or the channel id is not a snowflake (campfireOf then returns null).
 */
export function campfireJoinUrl(guildId: string | null, channelId: string): string {
  if (!SNOWFLAKE.test(channelId)) return "";
  if (typeof guildId === "string" && SNOWFLAKE.test(guildId)) {
    return `https://discord.com/channels/${guildId}/${channelId}`;
  }
  const server = shiftDiscordUrls().server;
  return server && SERVER_URL.test(server) ? `${server}/${channelId}` : "";
}

/** What shift_quest_campfire returns. */
interface CampfireRow {
  channel_id: unknown;
  guild_id: unknown;
  live: unknown;
  count: unknown;
  names: unknown;
}

/** Logged once per process: before the migration every page load would hit it. */
let loggedMissing = false;

function logFailure(code: string): void {
  if (code === "SQLSTATE 42883") {
    if (loggedMissing) return;
    loggedMissing = true;
  }
  console.error(`[shift-island] campfire read failed: ${code}`);
}

function failureCode(error: unknown): string {
  if (error instanceof QuestError) return `sq:${error.code}`;
  if (error instanceof QuestDbError) return `SQLSTATE ${error.sqlstate}`;
  return error instanceof Error ? error.name : "unknown";
}

/**
 * Who is at the campfire, for one ready viewer: the count, the join link and
 * (only when `names`) the display names in join order, sanitised. Fails soft:
 * a refusal, a database error (the function missing before the migration,
 * 42883, or not granted, 42501), malformed data or no known guild all give
 * null, and only a code is logged. No coworking channel set: null, quietly.
 * The bot not beating (not live): count 0, no names.
 */
export async function campfireOf(api: QuestApi, actor: string, names: boolean): Promise<CampfireNames | null> {
  const read = await campfireRead(api, actor, names);
  return read === CAMPFIRE_NONE ? null : read;
}

/**
 * The database's own answer that there is no campfire (no coworking channel
 * set), as opposed to a read that failed: a poll that gets it takes the
 * campfire off the island, while a failure keeps the last count.
 */
export const CAMPFIRE_NONE = "none" as const;

/** campfireOf, telling "no channel set" (CAMPFIRE_NONE) apart from a failed read (null). */
export async function campfireRead(api: QuestApi, actor: string, names: boolean): Promise<CampfireNames | typeof CAMPFIRE_NONE | null> {
  let row: CampfireRow;
  try {
    const raw = await api.call<unknown>("shift_quest_campfire", actor, names);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      logFailure("malformed");
      return null;
    }
    row = raw as CampfireRow;
  } catch (error) {
    logFailure(failureCode(error));
    return null;
  }

  if (row.channel_id === null) return CAMPFIRE_NONE;
  if (typeof row.channel_id !== "string" || !SNOWFLAKE.test(row.channel_id)) {
    logFailure("malformed");
    return null;
  }
  const joinUrl = campfireJoinUrl(typeof row.guild_id === "string" ? row.guild_id : null, row.channel_id);
  if (!joinUrl) {
    logFailure("no_guild");
    return null;
  }
  if (row.live !== true) return { count: 0, names: [], joinUrl };

  const count = Number(row.count);
  if (!Number.isSafeInteger(count) || count < 0) {
    logFailure("malformed");
    return null;
  }
  const list = names && Array.isArray(row.names) ? row.names.slice(0, MAX_NAMES).map(sanitizeVoiceName) : [];
  return { count, names: list, joinUrl };
}
