import "server-only";

/**
 * The shared gate for every server action on /shift/island: validate the
 * input, resolve the viewer from the session (the client never sends an
 * actor), run one database call, map every failure to Thai, refresh on
 * success. A plain server module (not "use server"), so these helpers are
 * never callable from the browser; the action files import them. Logs carry
 * the function name and SQLSTATE or a refusal code, never text a student
 * wrote.
 */

import { refresh } from "next/cache";
import type { z } from "zod";

import { QuestDbError, QuestError } from "@/bot/src/quests/api";
import { questErrorText } from "@/lib/supabase/shift-quests/errors";
import type { IslandActionResult } from "@/lib/supabase/shift-quests/types";
import { resolveIslandViewer } from "@/lib/supabase/shift-quests/viewer";

export type Failure = Extract<IslandActionResult, { ok: false }>;

export interface Caller {
  actor: string;
  name: string;
  /** The Supabase user id from getUser(), for whiteboard reads. Server-only, like actor. */
  userId: string;
}

export function failure(code: string, textCode: string = code): Failure {
  return { ok: false, code, error: questErrorText(textCode) };
}

/**
 * Refusals that mean the page is out of date (the board changed underneath,
 * or the viewer lost access). The page is refreshed in the same response, so
 * a stale tile or a gate card replaces what the student was looking at.
 */
export const STALE_CODES: ReadonlySet<string> = new Set([
  "signed_out",
  "not_eligible",
  "not_started",
  "no_project",
  "milestone_open",
  "milestone_done",
  "milestone_appealed",
  "quest_done",
  "quest_locked",
  "quest_appealed",
  "not_repeatable",
  "template_unavailable",
  "stale_version",
  "bad_state",
  "not_found",
  // The page still says the project is linked to a canvas.
  "canvas_unlinked",
  // The shop or the viewer's balance, stage or consent changed under the sheet.
  "redemption_paused",
  "item_unavailable",
  "out_of_stock",
  "price_changed",
  "insufficient_balance",
  "stage_required",
  "community_required",
  "consent_required",
]);

export function refused(code: string, textCode: string = code): Failure {
  if (STALE_CODES.has(code)) refresh();
  return failure(code, textCode);
}

/** An error's class name for logs, never its message. */
export function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}

/**
 * The shared gate: validate, resolve the viewer, run one database call, map
 * every failure to Thai, refresh on success. Only startIsland lets a viewer
 * who has not started through. A `read` never calls refresh(), not even on a
 * refusal: reads run from effects while a sheet is open, and a refresh there
 * would re-render the page under the student.
 */
export async function withReadyViewer<S extends z.ZodTypeAny, T>(
  action: string,
  schema: S,
  input: unknown,
  run: (caller: Caller, input: z.output<S>) => Promise<T>,
  options: { allowNotStarted?: boolean; read?: boolean } = {}
): Promise<IslandActionResult<T>> {
  const refuse = options.read ? failure : refused;
  const parsed = schema.safeParse(input);
  if (!parsed.success) return failure("invalid_input");

  const viewer = await resolveIslandViewer();
  switch (viewer.state) {
    case "signed_out":
    case "no_discord":
      return refuse("signed_out");
    case "unavailable":
      return failure("unavailable");
    case "not_eligible":
      return refuse("not_eligible", viewer.reason === "discord_unavailable" ? "discord_unavailable" : "not_eligible");
    case "not_started":
      if (!options.allowNotStarted) return refuse("not_started");
      break;
    case "ready":
      break;
  }

  let data: T;
  try {
    data = await run({ actor: viewer.actor, name: viewer.me.name, userId: viewer.userId }, parsed.data);
  } catch (error) {
    if (error instanceof QuestError) return refuse(error.code);
    if (error instanceof QuestDbError) {
      console.error(`[shift-island] ${action}: ${error.fn} failed (SQLSTATE ${error.sqlstate})`);
    } else {
      console.error(`[shift-island] ${action} failed: ${errorName(error)}`);
    }
    return failure("unknown");
  }

  if (!options.read) refresh();
  return { ok: true, data };
}

/** withReadyViewer for reads: the same gate and error mapping, never a refresh. */
export function withReader<S extends z.ZodTypeAny, T>(
  action: string,
  schema: S,
  input: unknown,
  run: (caller: Caller, input: z.output<S>) => Promise<T>
): Promise<IslandActionResult<T>> {
  return withReadyViewer(action, schema, input, run, { read: true });
}
