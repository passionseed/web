import "server-only";

import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";

import type { IslandNews, NewsEntry, TeamNews } from "./playerTypes";

/**
 * The AI island news (ข่าวเกาะ) for one ready viewer, read through
 * shift_quest_island_news (migration 20261111095000_shift_quest_player.sql,
 * web only, the same gate as shift_quest_island_map). The database returns
 * only teams that may appear: every active member shows their name and has
 * consent with the AI line, and staff have not hidden the team. Summaries
 * were written once by the daily job and stored; nothing is generated here.
 * The hidden list comes back only for staff.
 */

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SUMMARY = 600;
const MAX_NAME = 120;

/**
 * Logged once per process: a gap every page load would hit (the function
 * missing before the migration, 42883, or not granted, 42501). Anything else
 * is logged each time.
 */
const ONCE = new Set(["SQLSTATE 42883", "SQLSTATE 42501"]);
const logged = new Set<string>();

function logFailure(code: string): void {
  if (ONCE.has(code)) {
    if (logged.has(code)) return;
    logged.add(code);
  }
  console.error(`[shift-island] news read failed: ${code}`);
}

function failureCode(error: unknown): string {
  if (error instanceof QuestError) return `sq:${error.code}`;
  if (error instanceof QuestDbError) return `SQLSTATE ${error.sqlstate}`;
  return error instanceof Error ? error.name : "unknown";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function slotOf(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 1 ? n : null;
}

function nameOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t.slice(0, MAX_NAME) : null;
}

function entryOf(value: unknown): NewsEntry | null {
  if (!isObject(value)) return null;
  const noUpdate = value.no_update === true;
  const raw = typeof value.summary === "string" ? value.summary.trim().slice(0, MAX_SUMMARY) : "";
  const summary = noUpdate || !raw ? null : raw;
  const at = typeof value.created_at === "string" ? value.created_at : "";
  const day = typeof value.day === "string" && DAY.test(value.day) ? value.day : null;
  return { summary, noUpdate: noUpdate || summary === null, at, day };
}

function teamOf(value: unknown): TeamNews | null {
  if (!isObject(value)) return null;
  const slot = slotOf(value.slot);
  const name = nameOf(value.name);
  if (slot === null || name === null) return null;
  return { slot, name, day: entryOf(value.day), week: entryOf(value.week) };
}

/** The database's answer with every field checked; null when it is not the agreed shape. */
export function newsFrom(raw: unknown): IslandNews | null {
  if (!isObject(raw) || typeof raw.enabled !== "boolean") return null;
  const day = typeof raw.day === "string" && DAY.test(raw.day) ? raw.day : "";
  const weekOf = typeof raw.week_of === "string" && DAY.test(raw.week_of) ? raw.week_of : null;
  const teams = (Array.isArray(raw.teams) ? raw.teams : [])
    .map(teamOf)
    .filter((t): t is TeamNews => t !== null)
    .sort((a, b) => a.slot - b.slot);
  const news: IslandNews = { enabled: raw.enabled, day, weekOf, teams };
  if (Array.isArray(raw.hidden)) {
    news.hidden = raw.hidden
      .map((h) => {
        if (!isObject(h)) return null;
        const slot = slotOf(h.slot);
        const name = nameOf(h.name);
        return slot === null || name === null ? null : { slot, name };
      })
      .filter((h): h is { slot: number; name: string } => h !== null)
      .sort((a, b) => a.slot - b.slot);
  }
  return news;
}

/**
 * The island news for one ready viewer, or null to show no news at all:
 * digest_enabled off, a refusal, a database error (the function missing
 * before the migration, 42883, or not granted, 42501) or malformed data.
 * Fails soft and logs only a code; callers enforce eligibility first.
 */
export async function newsOf(api: QuestApi, actor: string): Promise<IslandNews | null> {
  let raw: unknown;
  try {
    raw = await api.call<unknown>("shift_quest_island_news", actor);
  } catch (error) {
    logFailure(failureCode(error));
    return null;
  }
  const news = newsFrom(raw);
  if (!news) {
    logFailure("malformed");
    return null;
  }
  return news.enabled ? news : null;
}
