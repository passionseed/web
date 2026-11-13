/**
 * The campfire rounds' and the roots' rules, in one place: the bot's rounds
 * (bot/src/quests/rounds.ts), the ✍️ form (bot/src/quests/rounds-copy.ts)
 * and the web guide (lib/content/shift-island-guide.ts) read these. The
 * database's own copy of the roots rules lives in
 * supabase/migrations/20261113090000_shift_quest_roots.sql; change both.
 * Design: docs/superpowers/specs/2026-11-13-shift-campfire-rounds-roots-design.md.
 */

/** Minutes of focus, then rest, in each round; rounds start at :00 and :30. */
export const FOCUS_MINUTES = 25;
export const REST_MINUTES = 5;

/** Fewest characters of "what I learned" that count as a reflection. */
export const REFLECTION_MIN_CHARS = 10;
/** Most reflections that count toward roots per person per Bangkok day. */
export const REFLECTIONS_PER_DAY = 3;
/** Root levels drawn on a tree (0 is none). */
export const ROOT_LEVELS = 3;
