/**
 * Student-facing summary of SeedStack progress, built from the same events
 * the mentors see. Pure: the page fetches rows, this decides what they mean.
 */

import { SEEDSTACK_STEPS, type SeedstackEventKind, type SeedstackStep } from "@/lib/seedstack/events";

/** One stored event, exactly the columns the student is shown. */
export interface SeedstackEventRow {
  step: SeedstackStep;
  event: SeedstackEventKind;
  minutes: number | null;
  next: string | null;
  detail: string | null;
  live_url: string | null;
  client_ts: string | null;
  created_at: string;
}

export type SeedstackStepStatus = "not_started" | "in_progress" | "stuck" | "done";

export interface SeedstackStepSummary {
  step: SeedstackStep;
  status: SeedstackStepStatus;
  lastAt: string | null;
  next: string | null;
}

export interface SeedstackProgress {
  steps: SeedstackStepSummary[];
  liveUrl: string | null;
}

/** When the student did it: the skill's own clock, else when it reached us. */
export function eventTime(event: Pick<SeedstackEventRow, "client_ts" | "created_at">): string {
  return event.client_ts ?? event.created_at;
}

/** Oldest first, so later events overwrite earlier ones while folding. */
function chronological(events: readonly SeedstackEventRow[]): SeedstackEventRow[] {
  return [...events].sort((a, b) => Date.parse(eventTime(a)) - Date.parse(eventTime(b)));
}

/** Same rule as the mentor board (board.ts): once a step is done it stays done. */
function nextStatus(current: SeedstackStepStatus, event: SeedstackEventKind): SeedstackStepStatus {
  if (event === "done" || current === "done") return "done";
  return event === "stuck" ? "stuck" : "in_progress";
}

export function summarizeSeedstackProgress(events: readonly SeedstackEventRow[]): SeedstackProgress {
  const byStep = new Map<SeedstackStep, SeedstackStepSummary>(
    SEEDSTACK_STEPS.map((step) => [step, { step, status: "not_started", lastAt: null, next: null }]),
  );
  let liveUrl: string | null = null;

  for (const event of chronological(events)) {
    const summary = byStep.get(event.step);
    if (!summary) continue;
    summary.status = nextStatus(summary.status, event.event);
    summary.lastAt = eventTime(event);
    if (event.next) summary.next = event.next;
    if (event.live_url) liveUrl = event.live_url;
  }

  return { steps: SEEDSTACK_STEPS.map((step) => byStep.get(step)!), liveUrl };
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const THAI_DATE = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "เมื่อสักครู่", "5 นาทีที่แล้ว", "3 ชม.ที่แล้ว", else a short Bangkok date and time. */
export function formatThaiWhen(iso: string, now = Date.now()): string {
  const ago = now - Date.parse(iso);
  if (ago < MINUTE) return "เมื่อสักครู่";
  if (ago < HOUR) return `${Math.floor(ago / MINUTE)} นาทีที่แล้ว`;
  if (ago < 24 * HOUR) return `${Math.floor(ago / HOUR)} ชม.ที่แล้ว`;
  return THAI_DATE.format(new Date(iso));
}
