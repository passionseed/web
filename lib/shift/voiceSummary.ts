/**
 * Turns shift_voice_spans rows into one participation row per student for
 * /admin/shift/voice. Pure: the page loads the rows, this adds them up.
 */

import type { VoiceWindow } from "@/lib/shift/voiceWindow";

export interface VoiceSpanRow {
  discord_user_id: string;
  display_name: string | null;
  started_at: string;
  /** How far the bot vouches for the row; its end, open or closed. */
  seen_at: string;
  ended_at: string | null;
  mic_open: boolean;
  streaming: boolean;
  camera: boolean;
  is_join: boolean;
}

export interface VoiceRosterStudent {
  applicationId: string;
  name: string;
  discordUserId: string | null;
  paid: boolean;
}

export interface VoiceTotals {
  voiceMs: number;
  micMs: number;
  streamMs: number;
  cameraMs: number;
  joins: number;
  firstAt: number | null;
  lastAt: number | null;
  inVoiceNow: boolean;
}

export interface VoiceReportRow {
  key: string;
  name: string;
  /** An application holder, or someone recorded only by their SHIFT role. */
  kind: "student" | "role_only";
  discordLinked: boolean;
  paid: boolean;
  totals: VoiceTotals;
}

/** An open row counts as "in voice now" while its heartbeat is this fresh. */
const LIVE_MS = 3 * 60_000;

function emptyTotals(): VoiceTotals {
  return { voiceMs: 0, micMs: 0, streamMs: 0, cameraMs: 0, joins: 0, firstAt: null, lastAt: null, inVoiceNow: false };
}

/**
 * Rows are keyed by Discord account, because that is the person in voice: a
 * duplicate application for the same account folds into one row, and a
 * role-only student who links later keeps their earlier time.
 */
export function buildVoiceReport(
  roster: VoiceRosterStudent[],
  spans: VoiceSpanRow[],
  window: VoiceWindow,
  now: Date = new Date(),
): VoiceReportRow[] {
  const from = window.from.getTime();
  const to = Math.min(window.to.getTime(), now.getTime());
  const rows = new Map<string, VoiceReportRow>();

  for (const student of roster) {
    const key = student.discordUserId ? `discord:${student.discordUserId}` : `app:${student.applicationId}`;
    const existing = rows.get(key);
    if (existing) {
      existing.paid ||= student.paid;
      continue;
    }
    rows.set(key, {
      key,
      name: student.name,
      kind: "student",
      discordLinked: Boolean(student.discordUserId),
      paid: student.paid,
      totals: emptyTotals(),
    });
  }

  for (const span of spans) {
    const key = `discord:${span.discord_user_id}`;
    let row = rows.get(key);
    if (!row) {
      row = {
        key,
        name: span.display_name ?? span.discord_user_id,
        kind: "role_only",
        discordLinked: true,
        paid: false,
        totals: emptyTotals(),
      };
      rows.set(key, row);
    }
    // Spans arrive oldest first, so a role-only name ends up the newest one.
    if (row.kind === "role_only" && span.display_name) row.name = span.display_name;
    const t = row.totals;
    const startedAt = new Date(span.started_at).getTime();
    const seenAt = new Date(span.seen_at).getTime();

    if (span.is_join && startedAt >= from && startedAt < to) t.joins += 1;
    if (span.ended_at === null && now.getTime() - seenAt < LIVE_MS && window.to.getTime() >= now.getTime()) {
      t.inVoiceNow = true;
    }

    const start = Math.max(startedAt, from);
    const end = Math.min(seenAt, to);
    if (end <= start) continue;
    const ms = end - start;
    t.voiceMs += ms;
    if (span.mic_open) t.micMs += ms;
    if (span.streaming) t.streamMs += ms;
    if (span.camera) t.cameraMs += ms;
    t.firstAt = t.firstAt === null ? start : Math.min(t.firstAt, start);
    t.lastAt = t.lastAt === null ? end : Math.max(t.lastAt, end);
  }

  return [...rows.values()].sort(
    (a, b) =>
      Number(b.totals.inVoiceNow) - Number(a.totals.inVoiceNow) ||
      b.totals.voiceMs - a.totals.voiceMs ||
      Number(b.discordLinked) - Number(a.discordLinked) ||
      a.name.localeCompare(b.name),
  );
}

/** "1 h 05 min", "42 min", "0 min". */
export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

/** Share of time in voice, as a whole percent. */
export function sharePercent(partMs: number, wholeMs: number): number {
  return wholeMs > 0 ? Math.round((100 * partMs) / wholeMs) : 0;
}
