import { PER_NETWORK_CAP } from "./link-views-shared";
import { SHARE, SHARE_CODE_RE, shareCode, type ShareKind } from "./share";

/**
 * The rules for Elemental share links (Big, 2026-11-27). Pure and safe to
 * import in the browser; the database side is lib/supabase/hackathon-share-links.ts.
 *
 * - A link qualifies at SHARE.devicesGoal real devices AND SHARE.paidGoal paid
 *   seats from sign-ups that came through it.
 * - Each school has one free seat. It goes to the first link at that school,
 *   student or teacher, to qualify, measured by when it reached both goals,
 *   not by who happened to open their page first.
 * - Staff confirm a seat (a fraud check) before it is given. An unpaid
 *   student's own sign-up gets it; a paid student names an unpaid friend; a
 *   teacher names an unpaid student.
 * - A teacher whose link reaches the devices goal is invited to Demo Day.
 */

export type Goals = { devices: number; paid: number };
export const GOALS: Goals = { devices: SHARE.devicesGoal, paid: SHARE.paidGoal };

export type Progress = { devices: number; paid: number };

export function qualifies(p: Progress, goals: Goals = GOALS): boolean {
  return p.devices >= goals.devices && p.paid >= goals.paid;
}

/** A teacher's Demo Day invite needs only the devices goal. */
export function reachedDevicesGoal(p: Progress, goals: Goals = GOALS): boolean {
  return p.devices >= goals.devices;
}

/** What's still missing; never below zero. */
export function remaining(p: Progress, goals: Goals = GOALS): Progress {
  return { devices: Math.max(0, goals.devices - p.devices), paid: Math.max(0, goals.paid - p.paid) };
}

export type SharePhase = "start" | "early" | "close" | "done";

/**
 * Which words the page uses: nothing yet, under way, nearly there (70% of
 * the way on both goals together), or both goals met.
 */
export function sharePhase(p: Progress, goals: Goals = GOALS): SharePhase {
  if (qualifies(p, goals)) return "done";
  if (p.devices === 0 && p.paid === 0) return "start";
  const share = (Math.min(p.devices, goals.devices) / goals.devices + Math.min(p.paid, goals.paid) / goals.paid) / 2;
  return share >= 0.7 ? "close" : "early";
}

/** One device that opened a link (a row of hackathon_link_views). */
export type ViewEvent = { ipHash: string; at: string };
/** One paid sign-up that came through a link: its seats, and when it was paid. */
export type PaidEvent = { seats: number; at: string };

const byTime = <T extends { at: string }>(rows: readonly T[]) => [...rows].sort((a, b) => a.at.localeCompare(b.at));

/**
 * Devices with each network adding at most `cap` (the same total as
 * countDevices in link-views.ts), and when the total first reached `goal`.
 */
export function deviceCount(views: readonly ViewEvent[], goal: number, cap = PER_NETWORK_CAP): { devices: number; reachedAt: string | null } {
  const perNetwork = new Map<string, number>();
  let devices = 0;
  let reachedAt: string | null = null;
  for (const v of byTime(views)) {
    const n = (perNetwork.get(v.ipHash) ?? 0) + 1;
    perNetwork.set(v.ipHash, n);
    if (n > cap) continue;
    devices += 1;
    if (devices === goal) reachedAt = v.at;
  }
  return { devices, reachedAt };
}

/** Paid seats, and when they first added up to `goal`. */
export function paidCount(paid: readonly PaidEvent[], goal: number): { paid: number; reachedAt: string | null } {
  let total = 0;
  let reachedAt: string | null = null;
  for (const p of byTime(paid)) {
    const before = total;
    total += Math.max(0, p.seats);
    if (before < goal && total >= goal) reachedAt = p.at;
  }
  return { paid: total, reachedAt };
}

/** A link's numbers, and the moment it met both goals (null until it has). */
export function linkProgress(
  views: readonly ViewEvent[],
  paid: readonly PaidEvent[],
  goals: Goals = GOALS,
): Progress & { qualifiedAt: string | null } {
  const d = deviceCount(views, goals.devices);
  const p = paidCount(paid, goals.paid);
  const qualifiedAt = d.reachedAt && p.reachedAt ? (d.reachedAt > p.reachedAt ? d.reachedAt : p.reachedAt) : null;
  return { devices: d.devices, paid: p.paid, qualifiedAt };
}

export type SeatCandidate = { linkId: string; qualifiedAt: string | null; createdAt: string; rejected?: boolean };

/** The link that gets a school's seat: the earliest to qualify; on a tie, the older link. Null if none has. */
export function pickSeatWinner(candidates: readonly SeatCandidate[]): SeatCandidate | null {
  const ready = candidates.filter((c) => c.qualifiedAt && !c.rejected);
  ready.sort((a, b) => a.qualifiedAt!.localeCompare(b.qualifiedAt!) || a.createdAt.localeCompare(b.createdAt));
  return ready[0] ?? null;
}

/** Registration statuses that count as "has paid": a slip waiting for a check counts (no free seat on top of a payment). */
export const hasPaid = (status: string) => status === "paid" || status === "review";

export type SeatStatus = "qualified" | "confirmed" | "rejected";
/** A school's seat as stored (hackathon_school_seats). */
export type SeatRow = { id: string; linkId: string; status: SeatStatus; recipientRegistrationId: string | null };

/** Who the seat goes to, as the link's owner sees it. A friend shows by code only, never by name. */
export type Recipient = { who: "self" } | { who: "other"; code: string } | { who: "none" };

export type SeatView =
  /** Nobody at this school has qualified yet: the seat is still up for grabs. */
  | { state: "open" }
  /** Another link at this school qualified first. */
  | { state: "taken" }
  /** Staff checked this link and turned it down. */
  | { state: "rejected" }
  /** This link qualified first; staff are checking. */
  | { state: "checking"; recipient: Recipient }
  /** Staff confirmed: the seat is given. */
  | { state: "given"; recipient: Recipient };

export function seatView(input: {
  linkId: string;
  kind: ShareKind;
  linkRejected: boolean;
  /** The student's own sign-up; null for a teacher. */
  ownRegistrationId: string | null;
  selfPaid: boolean;
  seat: SeatRow | null;
}): SeatView {
  const { seat } = input;
  if (input.linkRejected) return { state: "rejected" };
  if (!seat || seat.status === "rejected") return { state: "open" };
  if (seat.linkId !== input.linkId) return { state: "taken" };
  let recipient: Recipient;
  if (seat.recipientRegistrationId) {
    recipient =
      seat.recipientRegistrationId === input.ownRegistrationId
        ? { who: "self" }
        : { who: "other", code: shareCode(seat.recipientRegistrationId) };
  } else {
    recipient = input.kind === "student" && !input.selfPaid ? { who: "self" } : { who: "none" };
  }
  return seat.status === "confirmed" ? { state: "given", recipient } : { state: "checking", recipient };
}

/**
 * The sign-up that gets the seat when staff confirm: the one named on the
 * page, or else an unpaid student's own sign-up. Null: someone must be named first.
 */
export function seatRecipientId(input: {
  kind: ShareKind;
  ownRegistrationId: string | null;
  ownStatus: string | null;
  namedRecipientId: string | null;
}): string | null {
  if (input.namedRecipientId) return input.namedRecipientId;
  if (input.kind === "student" && input.ownRegistrationId && input.ownStatus === "pending") return input.ownRegistrationId;
  return null;
}

/** Whether the owner may type a code to give the seat: a teacher, or a student who has paid, while staff haven't confirmed yet. */
export function canNameRecipient(kind: ShareKind, selfPaid: boolean, seat: SeatView): boolean {
  return seat.state === "checking" && (kind === "teacher" || selfPaid);
}

export type RecipientProblem = "not_found" | "self" | "paid" | "cancelled" | "ambiguous";

/** Why a typed code can't get the seat, or null if it can. Only an unpaid sign-up of this event, not your own. */
export function recipientProblem(
  matches: readonly { id: string; status: string }[],
  ownRegistrationId: string | null,
): RecipientProblem | null {
  if (matches.length === 0) return "not_found";
  if (matches.length > 1) return "ambiguous";
  const [m] = matches;
  if (m.id === ownRegistrationId) return "self";
  if (m.status === "cancelled") return "cancelled";
  if (m.status !== "pending") return "paid";
  return null;
}

/**
 * A school can be changed only before the link has really started (fewer
 * than 5 devices, no paid seat), so nobody can fill a link at one school and
 * then move it to a school whose seat is still free.
 */
export const CHANGE_SCHOOL_MAX_DEVICES = 5;
export function canChangeSchool(p: Progress, seat: SeatView): boolean {
  return (seat.state === "open" || seat.state === "taken") && p.paid === 0 && p.devices < CHANGE_SCHOOL_MAX_DEVICES;
}

/** A code as people type it: "1a2b 3c4d", "No. 1A2B3C4D", "1a2b-3c4d" all read as 1a2b3c4d. */
export function parseShareCode(raw: string): string | null {
  const code = raw
    .trim()
    .replace(/^no\.?\s*/i, "")
    .replace(/[\s-]/g, "")
    .toLowerCase();
  return SHARE_CODE_RE.test(code) ? code : null;
}

/**
 * A student's code is the first 8 hex digits of their sign-up's id, which is
 * the whole first group of the uuid, so the ids that carry it are one range.
 */
export function codeIdRange(code: string): { from: string; to: string } {
  return { from: `${code}-0000-0000-0000-000000000000`, to: `${code}-ffff-ffff-ffff-ffffffffffff` };
}

export const TEACHER_TOKEN_RE = /^[0-9a-f]{32}$/;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LINE_ID_RE = /^@?[a-z0-9._-]{3,30}$/;

/** A teacher's email or LINE ID, and the key that keeps one live link per contact. */
export function parseTeacherContact(raw: string): { kind: "email" | "line"; value: string; key: string } | null {
  const value = raw.trim();
  const lower = value.toLowerCase();
  if (value.length > 120) return null;
  if (EMAIL_RE.test(lower)) return { kind: "email", value, key: `email:${lower}` };
  if (LINE_ID_RE.test(lower)) return { kind: "line", value, key: `line:${lower.replace(/^@/, "")}` };
  return null;
}

/** An optional phone number: empty is fine, otherwise 9 to 15 digits. */
export function parseOptionalPhone(raw: string | undefined | null): { ok: true; value: string | null } | { ok: false } {
  const value = (raw ?? "").trim();
  if (!value) return { ok: true, value: null };
  const digits = value.replace(/[\s()+-]/g, "");
  return /^\d{9,15}$/.test(digits) ? { ok: true, value } : { ok: false };
}

/** What a share page shows about one link. Nothing in it names a person. */
export type ShareLinkView = {
  kind: ShareKind;
  code: string;
  school: { name: string; province: string | null };
  progress: Progress;
  seat: SeatView;
  canChangeSchool: boolean;
  /** Students: whether their own sign-up has paid. */
  selfPaid: boolean;
  /** Teachers: staff have sent the Demo Day invite. */
  invited: boolean;
};
