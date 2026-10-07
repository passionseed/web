/**
 * Folds raw SeedStack events into one row per student for the mentor board.
 * Pure: the admin page loads rows and passes them in.
 */

import { SEEDSTACK_STEPS, type SeedstackEventKind, type SeedstackStep } from "@/lib/seedstack/events";

export interface BoardEvent {
  user_id: string;
  step: SeedstackStep;
  event: SeedstackEventKind;
  minutes: number | null;
  next: string | null;
  detail: string | null;
  live_url: string | null;
  created_at: string;
}

export type StepStatus = "not_started" | "in_progress" | "stuck" | "done";

export interface StepSummary {
  status: StepStatus;
  minutes: number | null;
  detail: string | null;
}

export interface BoardRow {
  userId: string;
  steps: Record<SeedstackStep, StepSummary>;
  next: string | null;
  liveUrl: string | null;
  lastSeen: string;
}

const EMPTY: StepSummary = { status: "not_started", minutes: null, detail: null };

function statusAfter(prev: StepSummary, e: BoardEvent): StepSummary {
  if (e.event === "done") return { status: "done", minutes: e.minutes ?? prev.minutes, detail: null };
  if (prev.status === "done") return prev;
  if (e.event === "stuck") return { status: "stuck", minutes: prev.minutes, detail: e.detail };
  return { status: "in_progress", minutes: e.minutes ?? prev.minutes, detail: prev.detail };
}

/** Events in any order; returns rows sorted by most recent activity. */
export function buildSeedstackBoard(events: BoardEvent[]): BoardRow[] {
  const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const rows = new Map<string, BoardRow>();

  for (const e of sorted) {
    const row =
      rows.get(e.user_id) ??
      {
        userId: e.user_id,
        steps: Object.fromEntries(SEEDSTACK_STEPS.map((s) => [s, EMPTY])) as Record<SeedstackStep, StepSummary>,
        next: null,
        liveUrl: null,
        lastSeen: e.created_at,
      };
    row.steps[e.step] = statusAfter(row.steps[e.step], e);
    row.next = e.next ?? row.next;
    row.liveUrl = e.live_url ?? row.liveUrl;
    row.lastSeen = e.created_at;
    rows.set(e.user_id, row);
  }

  return [...rows.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
}
