/**
 * The website does everything but Discord (schema 16,
 * 20261116090000_shift_quest_web_everything): the inbox, settings, teammates
 * on a submit, celebrating and thanking a peer, data rights, and the mentor,
 * fulfillment and admin pages, all through shift_quest_web. One gate for every
 * one of those surfaces: they show only once the database is at 16, so a
 * missing migration hides them instead of breaking the island
 * (lib/supabase/shift-quests/db.ts REQUIRED_SCHEMA stays the island's floor).
 */
import type { QuestApi } from "@/bot/src/quests/api";
import { schemaOf } from "@/bot/src/quests/schema";

/** The quest schema where the website reaches every flow but Discord's. */
export const WEB_EVERYTHING_SCHEMA = 16;
/** Teammates a student may name on one submit, not counting themselves (shift_quest__contributors_of). */
export const MAX_CONTRIBUTORS = 8;
/**
 * Celebrations and thanks a student may draft in 24 hours, cancelled drafts
 * included (shift_quest_share_draft, 'share_limit'). The campfire's
 * intentions, posted from Discord, do not count.
 */
export const SHARE_DRAFTS_PER_DAY = 5;
/** Side quests that take teammates: the two community quests (shift_quest__community_done). */
export const TEAM_SIDE_SLUGS: readonly string[] = ["side-help-a-builder", "side-improve-community"];
/** Request-key prefixes the admin wrappers add to the browser's uuid; the bot's keys never use them. */
export const WEB_KEY_PREFIX = { recognize: "web-recog:", award: "web-award:", reverse: "web-rev:" } as const;

/** True when the database has the website's every-flow functions. A failed read counts as no. */
export async function webEverythingAvailable(api: QuestApi): Promise<boolean> {
  try {
    return (await schemaOf(api)) >= WEB_EVERYTHING_SCHEMA;
  } catch {
    return false;
  }
}
