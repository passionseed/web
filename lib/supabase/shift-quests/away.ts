import "server-only";

import { z } from "zod";

import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";

import {
  AWAY_LINE_MAX,
  AWAY_REASONS,
  type AwayCount,
  type AwayLine,
  type AwayReason,
  type AwayReport,
  type AwayState,
} from "./playerTypes";

export type { AwayReason, AwayReport, AwayState } from "./playerTypes";

/**
 * The come-back DM and the return card on the island (code name away,
 * migration 20261121090000_shift_quest_away.sql, schema 23). The database
 * holds every rule: the switch, who may be asked, when the card is due, the
 * caps on the DM and the 90-day line retention. This module only checks the
 * shapes it answers and never passes on anything it did not ask for (no
 * member id, no name, no plot, no exact date). Callers enforce eligibility
 * first (a ready viewer), as for every other island read.
 *
 * Plan: docs/designs/shift-island-away.md.
 */

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The card's reason set, for checking what the database answers. */
const REASONS: ReadonlySet<string> = new Set(AWAY_REASONS);
/** A display name as the reveal shows it: at most this many characters. */
const NAME_CHARS = 64;

/** Logged once per process: before the migration every page load would hit it. */
let loggedMissing = false;

function logFailure(what: string, code: string): void {
  if (code === "SQLSTATE 42883") {
    if (loggedMissing) return;
    loggedMissing = true;
  }
  console.error(`[shift-island] ${what} failed: ${code}`);
}

function failureCode(error: unknown): string {
  if (error instanceof QuestError) return `sq:${error.code}`;
  if (error instanceof QuestDbError) return `SQLSTATE ${error.sqlstate}`;
  return error instanceof Error ? error.name : "unknown";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/** A reason the card knows, or null. */
export function awayReasonOf(value: unknown): AwayReason | null {
  return typeof value === "string" && REASONS.has(value) ? (value as AwayReason) : null;
}

/**
 * shift_quest_away_state's answer, checked: null when it is not the shape
 * the contract promises. With the switch off nothing is asked, whatever the
 * row says (the database says the same; this keeps a stray row from showing
 * a strip or a card).
 */
export function awayStateFrom(raw: unknown): AwayState | null {
  if (!isObject(raw) || typeof raw.enabled !== "boolean") return null;
  const days = Number(raw.days);
  if (!Number.isSafeInteger(days) || days < 1 || days > 365) return null;
  const dm = raw.dm === true ? true : raw.dm === false ? false : null;
  if (!raw.enabled) return { enabled: false, days, dm, askConsent: false, askReturn: null };
  const ask = isObject(raw.ask_return) ? raw.ask_return.gap_from : null;
  return {
    enabled: true,
    days,
    dm,
    askConsent: raw.ask_consent === true && dm === null,
    askReturn: typeof ask === "string" && DAY.test(ask) ? { gapFrom: ask } : null,
  };
}

/**
 * The viewer's away state for the page (shift_quest_away_state). Fails soft:
 * a refusal, a database error (the function missing before the migration,
 * 42883, logged once; not granted, 42501) or malformed data all give null,
 * and only a code is logged. Null shows no strip, no settings line, no card.
 */
export async function readAwayState(api: QuestApi, actor: string): Promise<AwayState | null> {
  try {
    const state = awayStateFrom(await api.call<unknown>("shift_quest_away_state", actor));
    if (!state) logFailure("away state read", "malformed");
    return state;
  } catch (error) {
    logFailure("away state read", failureCode(error));
    return null;
  }
}

// ---------------------------------------------------------------------------
// The server actions' inputs
// ---------------------------------------------------------------------------

const chars = (value: string) => Array.from(value).length;

/** setAwayDm: the student's own choice. */
export const setAwayDmSchema = z.object({ on: z.boolean() });

/**
 * answerAway: the stretch the card was opened for, one of the six reasons
 * (null: the card was closed, a skip) and an optional line, trimmed, empty
 * becomes null, at most 140 characters. A skip carries no line.
 */
export const answerAwaySchema = z
  .object({
    gapFrom: z.string().regex(DAY),
    reason: z.enum(AWAY_REASONS).nullable(),
    line: z
      .string()
      .trim()
      .refine((v) => chars(v) <= AWAY_LINE_MAX, { message: `at most ${AWAY_LINE_MAX} characters` })
      .nullish()
      .transform((v) => (v ? v : null)),
  })
  .transform((v) => ({ ...v, line: v.reason === null ? null : v.line }));

/** revealAwayAnswer: one answer's id. */
export const revealAwaySchema = z.object({ id: z.string().regex(UUID) });

// ---------------------------------------------------------------------------
// The admin report
// ---------------------------------------------------------------------------

/**
 * One admin count: an integer, or "1-2". One or two as a number is masked
 * here too, so a small group never shows on the web whatever the database
 * sends; anything else reads as 0.
 */
export function awayCount(raw: unknown): AwayCount {
  if (raw === "1-2") return "1-2";
  const n = typeof raw === "number" ? raw : NaN;
  if (!Number.isSafeInteger(n) || n < 0) return 0;
  return n === 1 || n === 2 ? "1-2" : n;
}

function counts<K extends string>(raw: unknown, keys: readonly K[]): Record<K, AwayCount> {
  const row = isObject(raw) ? raw : {};
  return Object.fromEntries(keys.map((key) => [key, awayCount(row[key])])) as Record<K, AwayCount>;
}

function lineOf(raw: unknown): AwayLine | null {
  if (!isObject(raw)) return null;
  const { id, week, reason, line } = raw;
  if (typeof id !== "string" || !UUID.test(id)) return null;
  if (typeof week !== "string" || !DAY.test(week)) return null;
  if (typeof line !== "string" || !line.trim()) return null;
  if (reason !== null && reason !== undefined && awayReasonOf(reason) === null) return null;
  // Field by field: nothing else on the row can leave this module.
  return { id, week, reason: awayReasonOf(reason), line: Array.from(line.trim()).slice(0, AWAY_LINE_MAX).join("") };
}

/**
 * shift_quest_admin_away's answer, checked: every count an integer or "1-2",
 * the lines without anything that could name a person, newest week first.
 * Null when it is not an object.
 */
export function awayReportFrom(raw: unknown): AwayReport | null {
  if (!isObject(raw)) return null;
  const answers = isObject(raw.answers) ? raw.answers : {};
  const lines = (Array.isArray(raw.lines) ? raw.lines : [])
    .map(lineOf)
    .filter((line): line is AwayLine => line !== null)
    .sort((a, b) => (a.week < b.week ? 1 : a.week > b.week ? -1 : 0));
  return {
    consent: counts(raw.consent, ["yes", "no", "unasked"] as const),
    awayNow: counts(raw.away_now, ["resting", "waiting", "other"] as const),
    dms: counts(raw.dms, ["queued", "sent", "unreachable", "dropped"] as const),
    answers: {
      byReason: counts(answers.by_reason, AWAY_REASONS),
      skipped: awayCount(answers.skipped),
      cameByDm: awayCount(answers.came_by_dm),
    },
    lines,
  };
}

/** shift_quest_admin_away_reveal's {name}: trimmed, at most 64 characters; null when there is none. */
export function revealedNameOf(raw: unknown): string | null {
  const name = isObject(raw) ? raw.name : null;
  if (typeof name !== "string") return null;
  const clean = Array.from(name.replace(/\s+/g, " ").trim()).slice(0, NAME_CHARS).join("").trim();
  return clean || null;
}
