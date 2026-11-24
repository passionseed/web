import { addDays, bangkokDate, daysBetween } from "./bangkok-date";
import { ELEMENTAL_TARGETS, type SeatCheckpoint } from "./targets";

/**
 * Seat pace for the Elemental progress page. Pure: the page passes in the
 * paid seat count and today's Bangkok date.
 */

export type SeatPace = {
  paid: number;
  target: number;
  /** Seats we should have by the end of today on a straight line between checkpoints. The bar's marker. */
  expectedToday: number;
  /**
   * The line at the end of yesterday: what "behind" and "ahead" compare to,
   * so the count is not red every morning before today's selling starts.
   */
  expectedNow: number;
  /** The checkpoint we are heading for; null once the last one has passed. */
  next: SeatCheckpoint | null;
  /** Days left until the next checkpoint (0 on its own day). */
  daysToNext: number | null;
  /** Seats still needed to reach the next checkpoint (0 when already there). */
  neededForNext: number;
  status: "on_track" | "behind";
  behindBy: number;
  aheadBy: number;
};

/**
 * Expected seats by the end of `today`: a straight line from the previous
 * checkpoint to the next one, rounded up so "on track" means really there.
 */
export function expectedSeatsOn(
  today: string,
  start: SeatCheckpoint = ELEMENTAL_TARGETS.seats.start,
  checkpoints: readonly SeatCheckpoint[] = ELEMENTAL_TARGETS.seats.checkpoints,
): number {
  if (checkpoints.length === 0) return 0;
  if (today <= start.by) return start.seats;
  let prev = start;
  for (const cp of checkpoints) {
    if (today <= cp.by) {
      const span = daysBetween(prev.by, cp.by);
      if (span <= 0) return cp.seats;
      const done = daysBetween(prev.by, today);
      return Math.ceil(prev.seats + ((cp.seats - prev.seats) * done) / span);
    }
    prev = cp;
  }
  return checkpoints[checkpoints.length - 1].seats;
}

export function seatPace(
  paid: number,
  today: string,
  start: SeatCheckpoint = ELEMENTAL_TARGETS.seats.start,
  checkpoints: readonly SeatCheckpoint[] = ELEMENTAL_TARGETS.seats.checkpoints,
  target: number = ELEMENTAL_TARGETS.seats.target,
): SeatPace {
  const expectedToday = expectedSeatsOn(today, start, checkpoints);
  const expectedNow = expectedSeatsOn(addDays(today, -1), start, checkpoints);
  const next = checkpoints.find((cp) => today <= cp.by) ?? null;
  const gap = expectedNow - paid;
  return {
    paid,
    target,
    expectedToday,
    expectedNow,
    next,
    daysToNext: next ? daysBetween(today, next.by) : null,
    neededForNext: next ? Math.max(0, next.seats - paid) : Math.max(0, target - paid),
    status: gap > 0 ? "behind" : "on_track",
    behindBy: Math.max(0, gap),
    aheadBy: Math.max(0, -gap),
  };
}

// ---------------------------------------------------------------------------
// Pace: what it takes from here, and where the current speed lands.

const DAY_MS = 24 * 60 * 60 * 1000;

/** The instant a Bangkok calendar day starts. */
function bangkokDayStart(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00+07:00`);
}

/**
 * Seats a day needed to reach `seats` by the end of `by`, counting today as
 * a selling day. 0 when already there, null when `by` has passed.
 */
export function neededPerDay(paid: number, seats: number, today: string, by: string): number | null {
  const days = daysBetween(today, by) + 1;
  if (days <= 0) return null;
  return Math.max(0, Math.ceil((seats - paid) / days));
}

/** One sign-up's paid moment: paid_at, or created_at for a paid row that has none. */
function paidMoment(r: RegistrationTotalsRow): number | null {
  if (r.status !== "paid") return null;
  const t = Date.parse(r.paidAt ?? r.createdAt ?? "");
  return Number.isNaN(t) ? null : t;
}

/** Seats paid in the 24 hours before `now`. */
export function paidLast24h(rows: readonly RegistrationTotalsRow[], now: Date): number {
  const from = now.getTime() - DAY_MS;
  let n = 0;
  for (const r of rows) {
    const t = paidMoment(r);
    if (t !== null && t > from && t <= now.getTime()) n += r.memberCount;
  }
  return n;
}

/** Seats paid on one Bangkok calendar day. */
export function paidOn(rows: readonly RegistrationTotalsRow[], isoDate: string): number {
  let n = 0;
  for (const r of rows) {
    const t = paidMoment(r);
    if (t !== null && bangkokDate(new Date(t)) === isoDate) n += r.memberCount;
  }
  return n;
}

/**
 * Seats a day over the last three days. Before promotion has run three days,
 * the window is the time since it started, never shorter than one day, so
 * the first morning does not read as a huge rate.
 */
export function runRate3d(
  rows: readonly RegistrationTotalsRow[],
  now: Date,
  paceStart: string = ELEMENTAL_TARGETS.seats.paceStart,
): number {
  const end = now.getTime();
  const windowStart = Math.max(end - 3 * DAY_MS, bangkokDayStart(paceStart));
  if (windowStart >= end) return 0;
  const days = Math.max(1, (end - windowStart) / DAY_MS);
  let n = 0;
  for (const r of rows) {
    const t = paidMoment(r);
    if (t !== null && t > windowStart && t <= end) n += r.memberCount;
  }
  return n / days;
}

/**
 * Paid seats at the close of sign-up if the current rate holds: a straight
 * line from now to the end of `closesOn`, Bangkok time. Rounded down.
 */
export function forecastByClose(
  paid: number,
  ratePerDay: number,
  now: Date,
  closesOn: string = ELEMENTAL_TARGETS.registrationClosesOn,
): number {
  const left = Math.max(0, (bangkokDayStart(addDays(closesOn, 1)) - now.getTime()) / DAY_MS);
  return paid + Math.floor(ratePerDay * left);
}

export type DayCell = { date: string; seats: number; when: "past" | "today" | "future" };

/** Paid seats for each Bangkok day from `from` to `to`, inclusive. */
export function paidPerDay(
  rows: readonly RegistrationTotalsRow[],
  today: string,
  from: string = ELEMENTAL_TARGETS.seats.paceStart,
  to: string = ELEMENTAL_TARGETS.registrationClosesOn,
): DayCell[] {
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const t = paidMoment(r);
    if (t === null) continue;
    const d = bangkokDate(new Date(t));
    byDay.set(d, (byDay.get(d) ?? 0) + r.memberCount);
  }
  const out: DayCell[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    out.push({ date: d, seats: byDay.get(d) ?? 0, when: d < today ? "past" : d === today ? "today" : "future" });
  }
  return out;
}

export type PaceLine = {
  /** Seats a day to reach the next checkpoint, with that checkpoint. Null after the last one. */
  toNext: { perDay: number; seats: number; by: string } | null;
  /** Seats a day to reach the full target by the close. Null after the close. */
  toTarget: { perDay: number; seats: number; by: string } | null;
  rate3d: number;
  forecast: number;
  paidToday: number;
  paidLast24h: number;
  days: DayCell[];
};

export function paceLine(
  rows: readonly RegistrationTotalsRow[],
  paid: number,
  now: Date,
  checkpoints: readonly SeatCheckpoint[] = ELEMENTAL_TARGETS.seats.checkpoints,
): PaceLine {
  const today = bangkokDate(now);
  const { target } = ELEMENTAL_TARGETS.seats;
  const close = ELEMENTAL_TARGETS.registrationClosesOn;
  const next = checkpoints.find((cp) => today <= cp.by) ?? null;
  const nextPer = next ? neededPerDay(paid, next.seats, today, next.by) : null;
  const targetPer = neededPerDay(paid, target, today, close);
  const rate3d = runRate3d(rows, now);
  return {
    toNext: next && nextPer !== null ? { perDay: nextPer, seats: next.seats, by: next.by } : null,
    toTarget: targetPer !== null ? { perDay: targetPer, seats: target, by: close } : null,
    rate3d,
    forecast: forecastByClose(paid, rate3d, now, close),
    paidToday: paidOn(rows, today),
    paidLast24h: paidLast24h(rows, now),
    days: paidPerDay(rows, today),
  };
}

/** "2", "1.5", "0.3": a rate with at most one decimal. */
export function formatRate(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

// ---------------------------------------------------------------------------
// Totals

/** One sign-up, reduced to what the totals need. Never names, phones or slips. */
export type RegistrationTotalsRow = {
  status: "pending" | "review" | "paid" | "cancelled";
  memberCount: number;
  source: string | null;
  /** When the sign-up was made (ISO). Timestamps are not personal data. */
  createdAt: string | null;
  /** When it was marked paid (ISO), or null. */
  paidAt: string | null;
};

export type SourceTotals = {
  source: string;
  /** Sign-ups from this link, cancelled ones left out. */
  signups: number;
  paidSignups: number;
  paidSeats: number;
  /** Paid sign-ups over sign-ups, 0 to 1. */
  rate: number;
};

export type RegistrationTotals = {
  paidSeats: number;
  paidSignups: number;
  /** Sign-ups that have not paid and have no slip waiting. */
  unpaidSignups: number;
  unpaidPeople: number;
  /** Unpaid people who signed up less than 24 hours ago, and longer ago. */
  unpaidFreshPeople: number;
  unpaidStalePeople: number;
  /** Slips SlipOK could not decide, waiting for an admin. */
  slipsToCheck: number;
  /** People on those slips. */
  reviewPeople: number;
  /** By ?src tracked link, most paid seats first. */
  sources: SourceTotals[];
};

/** Trim, lower-case and cap a tracked-link source for grouping; empty is "direct". */
export function sourceKey(raw: string | null | undefined): string {
  const v = (raw ?? "").trim().toLowerCase().slice(0, 40);
  return v || "direct";
}

export function summarizeRegistrations(
  rows: readonly RegistrationTotalsRow[],
  now: Date = new Date(),
): RegistrationTotals {
  const bySource = new Map<string, SourceTotals>();
  const out: Omit<RegistrationTotals, "sources"> = {
    paidSeats: 0,
    paidSignups: 0,
    unpaidSignups: 0,
    unpaidPeople: 0,
    unpaidFreshPeople: 0,
    unpaidStalePeople: 0,
    slipsToCheck: 0,
    reviewPeople: 0,
  };
  const dayAgo = now.getTime() - DAY_MS;
  for (const r of rows) {
    if (r.status === "cancelled") continue;
    const k = sourceKey(r.source);
    const src = bySource.get(k) ?? { source: k, signups: 0, paidSignups: 0, paidSeats: 0, rate: 0 };
    src.signups += 1;
    bySource.set(k, src);
    if (r.status === "paid") {
      out.paidSeats += r.memberCount;
      out.paidSignups += 1;
      src.paidSignups += 1;
      src.paidSeats += r.memberCount;
    } else if (r.status === "pending") {
      out.unpaidSignups += 1;
      out.unpaidPeople += r.memberCount;
      const created = Date.parse(r.createdAt ?? "");
      if (!Number.isNaN(created) && created > dayAgo) out.unpaidFreshPeople += r.memberCount;
      else out.unpaidStalePeople += r.memberCount;
    } else if (r.status === "review") {
      out.slipsToCheck += 1;
      out.reviewPeople += r.memberCount;
    }
  }
  const sources = [...bySource.values()]
    .map((x) => ({ ...x, rate: x.signups ? x.paidSignups / x.signups : 0 }))
    .sort((a, b) => b.paidSeats - a.paidSeats || b.signups - a.signups || a.source.localeCompare(b.source));
  return { ...out, sources };
}
