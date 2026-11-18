/**
 * What mentors said about the student's own work, read straight from the
 * board (each quest's mine.latest_review), so a result reaches the web
 * without Discord's /inbox. Pure and client-safe. `mine` is the caller's own
 * work only: a teammate's feedback is never listed.
 */
import type { BoardRef } from "@/lib/supabase/shift-quests/board";
import type { QuestBoard, QuestMine } from "@/lib/supabase/shift-quests/types";

export type ResultOutcome = "approved" | "clarification" | "declined";

export interface QuestResult {
  /** Stable per quest and review time, for React keys and tests. */
  key: string;
  ref: BoardRef;
  title: string;
  outcome: ResultOutcome;
  feedback: string | null;
  /** ISO time of the review. */
  at: string;
}

/** The envelope lists this many at most: the newest. */
export const RESULTS_SHOWN = 12;

/** Without a seen mark on this browser, results this recent still count as new. */
export const FRESH_WITHOUT_MARK_MS = 7 * 24 * 60 * 60 * 1000;

const OUTCOMES: ReadonlySet<string> = new Set<ResultOutcome>(["approved", "clarification", "declined"]);

function resultOf(ref: BoardRef, key: string, title: string, mine: QuestMine | null): QuestResult | null {
  const review = mine?.latest_review;
  if (!review || !OUTCOMES.has(review.outcome) || Number.isNaN(Date.parse(review.created_at))) return null;
  const feedback = review.feedback?.trim() ? review.feedback.trim() : null;
  return { key: `${key}@${review.created_at}`, ref, title, outcome: review.outcome as ResultOutcome, feedback, at: review.created_at };
}

/** The student's own reviewed work, newest first, at most RESULTS_SHOWN. */
export function questResults(board: QuestBoard): QuestResult[] {
  const found: QuestResult[] = [];
  const add = (result: QuestResult | null) => {
    if (result) found.push(result);
  };
  for (const m of board.main) add(resultOf({ kind: "main", milestone: m.milestone }, `main:${m.milestone}`, m.title, m.mine));
  for (const s of board.side) add(resultOf({ kind: "side", templateId: s.template_id }, `side:${s.template_id}`, s.title, s.mine));
  for (const p of board.proposed) add(resultOf({ kind: "proposed", instanceId: p.instance_id }, `proposed:${p.instance_id}`, p.title, p));
  return found.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, RESULTS_SHOWN);
}

/**
 * Is this result new to the student on this browser? Newer than the last
 * time they opened the envelope; with no mark yet, anything from the last
 * week.
 */
export function isFresh(result: QuestResult, seenAt: number | null, now: number): boolean {
  const at = Date.parse(result.at);
  return seenAt == null ? now - at < FRESH_WITHOUT_MARK_MS : at > seenAt;
}
