import {
  isWeeklySession,
  sessionDetails,
  type AlumniCalendarDoc,
  type AlumniSession,
} from "@/lib/content/shift-alumni";

import type { BrainEvent } from "./schema";

/**
 * Turns an alumni calendar save into company-brain events by comparing the
 * calendar before and after. Only the date, title (topic) and time are sent;
 * co-host nicknames, notes and places stay out. Pure, so it can be tested.
 */

/** A save that touches more sessions than this is a bulk edit; the rest are dropped. */
const MAX_EVENTS = 20;

type AlumniEvent = Extract<BrainEvent, { type: `alumni_${string}` }>;

const clock = (value: string) => value || undefined;

function sessionFacts(session: AlumniSession, doc: AlumniCalendarDoc) {
  const { startTime, endTime } = sessionDetails(session, doc.defaults);
  return {
    date: session.date,
    title: session.topic || undefined,
    start_time: clock(startTime),
    end_time: clock(endTime),
  };
}

const sameDetails = (a: AlumniSession, b: AlumniSession) =>
  a.topic === b.topic && a.startTime === b.startTime && a.endTime === b.endTime;

export function alumniCalendarEvents(
  before: AlumniCalendarDoc,
  after: AlumniCalendarDoc,
): AlumniEvent[] {
  const events: AlumniEvent[] = [];

  const { defaults: was } = before;
  const { defaults: now } = after;
  if (was.firstDate !== now.firstDate || was.startTime !== now.startTime || was.endTime !== now.endTime) {
    events.push({
      type: "alumni_schedule_changed",
      payload: { first_date: now.firstDate, start_time: clock(now.startTime), end_time: clock(now.endTime) },
    });
  }

  const old = new Map(before.sessions.map((s) => [s.date, s]));
  const next = new Map(after.sessions.map((s) => [s.date, s]));

  for (const session of after.sessions) {
    const previous = old.get(session.date);
    const weekly = isWeeklySession(session.date, now.firstDate);
    if (session.cancelled) {
      if (!previous?.cancelled) {
        events.push({
          type: "alumni_session_cancelled",
          payload: { date: session.date, title: session.topic || undefined },
        });
      }
    } else if (!previous && !weekly) {
      events.push({ type: "alumni_session_created", payload: sessionFacts(session, after) });
    } else if (previous?.cancelled || !previous || !sameDetails(previous, session)) {
      // Restored, a weekly session filled in, or a new title or time.
      if (!previous && !session.topic && !session.startTime) continue;
      events.push({ type: "alumni_session_changed", payload: sessionFacts(session, after) });
    }
  }

  // A one-off event deleted from the calendar no longer happens.
  for (const session of before.sessions) {
    if (next.has(session.date) || session.cancelled) continue;
    if (isWeeklySession(session.date, now.firstDate)) continue;
    events.push({
      type: "alumni_session_cancelled",
      payload: { date: session.date, title: session.topic || undefined },
    });
  }

  return events.slice(0, MAX_EVENTS);
}

/** Session dates whose RSVP totals the events should carry. */
export function rsvpDates(events: AlumniEvent[]): string[] {
  return events.flatMap((e) =>
    e.type === "alumni_session_changed" || e.type === "alumni_session_cancelled" ? [e.payload.date] : [],
  );
}

/** Adds RSVP totals (counts only) to changed and cancelled sessions. */
export function withRsvpTotals(events: AlumniEvent[], counts: Record<string, number>): AlumniEvent[] {
  return events.map((e) => {
    if (e.type !== "alumni_session_changed" && e.type !== "alumni_session_cancelled") return e;
    const rsvps = counts[e.payload.date];
    return rsvps === undefined ? e : ({ ...e, payload: { ...e.payload, rsvps } } as AlumniEvent);
  });
}
