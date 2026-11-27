import { PER_NETWORK_CAP } from "./link-views-shared";
import { foldSchoolName, SHARE_CODE_RE, shareCode, type ShareKind } from "./share";

/**
 * The rules for Elemental share links. Pure and safe to import in the
 * browser; the database side is lib/supabase/hackathon-share-links.ts.
 *
 * Big, 2026-11-27 ("go with 50 devices + 1 paid, max 2 each"):
 * - every 50 real devices plus 1 paid sign-up through a link earns 1 free
 *   seat, up to 2 per link: seat 1 at 50 devices + 1 paid, seat 2 at 100 + 2;
 *   seats never outnumber the paid sign-ups the link brought;
 * - no one-per-school limit: links don't race each other (the school stays
 *   on the link for the staff fraud check);
 * - an unpaid student's first seat is their own sign-up; every other seat (a
 *   paid student's, an unpaid student's second, any teacher's) goes to an
 *   unpaid friend or student, named by their code;
 * - staff confirm every seat;
 * - a teacher whose link reaches 50 devices is invited to Demo Day (after
 *   staff verify them with the school).
 * Counting: devices and paid sign-ups up to sign-up close, paid by slip time,
 * free seats never count as paid.
 */

/** The one place the seat rule lives. Copy, demos and the engine all read it. */
export const SEAT_RULE = { devicesPerSeat: 50, paidPerSeat: 1, maxSeatsPerLink: 2, onePerSchool: false } as const;
export type SeatRule = { devicesPerSeat: number; paidPerSeat: number; maxSeatsPerLink: number; onePerSchool: boolean };

/** A teacher's Demo Day invite: this many devices (staff verify the teacher first). */
export const TEACHER_INVITE_DEVICES = 50;

export type Progress = { devices: number; paid: number };

/** Seats a link has earned: one per (50 devices + 1 paid), capped, and never more than the paid sign-ups it brought. */
export function seatsEarned(p: Progress, rule: SeatRule = SEAT_RULE): number {
  const byDevices = Math.floor(p.devices / rule.devicesPerSeat);
  const byPaid = Math.floor(p.paid / rule.paidPerSeat);
  return Math.max(0, Math.min(rule.maxSeatsPerLink, byDevices, byPaid, p.paid));
}

/** What seat `index` (1-based) needs in total. */
export function seatGoal(index: number, rule: SeatRule = SEAT_RULE): Progress {
  return { devices: index * rule.devicesPerSeat, paid: index * rule.paidPerSeat };
}

export type NextSeat = { index: number; devicesLeft: number; paidLeft: number };

/** The next seat to earn and what's missing for it; null once the link has its maximum. */
export function nextSeat(p: Progress, seatsSoFar: number, rule: SeatRule = SEAT_RULE): NextSeat | null {
  const index = Math.max(seatsSoFar, seatsEarned(p, rule)) + 1;
  if (index > rule.maxSeatsPerLink) return null;
  const goal = seatGoal(index, rule);
  return { index, devicesLeft: Math.max(0, goal.devices - p.devices), paidLeft: Math.max(0, goal.paid - p.paid) };
}

/** A teacher's Demo Day invite needs only devices. */
export function reachedInvite(p: Progress): boolean {
  return p.devices >= TEACHER_INVITE_DEVICES;
}

export type ProgressPhase = "start" | "early" | "close" | "done";

/**
 * Which words the page uses for the seat in progress: nothing yet, under way,
 * nearly there (70% of the way on both parts together), or earned.
 */
export function progressPhase(p: Progress, seatsSoFar = 0, rule: SeatRule = SEAT_RULE): ProgressPhase {
  const next = nextSeat(p, seatsSoFar, rule);
  if (!next) return "done";
  if (p.devices === 0 && p.paid === 0) return "start";
  const goal = seatGoal(next.index, rule);
  const from = seatGoal(next.index - 1, rule);
  const part = (have: number, lo: number, hi: number) => Math.min(1, Math.max(0, (have - lo) / Math.max(1, hi - lo)));
  const share = (part(p.devices, from.devices, goal.devices) + part(p.paid, from.paid, goal.paid)) / 2;
  return share >= 0.7 ? "close" : "early";
}

/** One device that opened a link (a row of hackathon_link_views). */
export type ViewEvent = { ipHash: string; at: string };
/** One paid sign-up that came through a link: its seats, and when it paid (see paidAt). */
export type PaidEvent = { seats: number; at: string };

/**
 * When a sign-up paid, for the seat race: when its slip was uploaded (the
 * slip's file name starts with the upload time in ms), or else when it signed
 * up. Never when staff happened to approve it, so a slow check can't cost a
 * link its place.
 */
export function paidAt(r: { slipPath: string | null; createdAt: string }): string {
  const ms = Number(r.slipPath?.match(/\/(\d{12,14})-/)?.[1]);
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : r.createdAt;
}

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

/** A link's numbers (devices capped per network, paid seats), and when each seat was earned. */
export function linkProgress(views: readonly ViewEvent[], paid: readonly PaidEvent[], rule: SeatRule = SEAT_RULE): Progress & { earnedAt: string[] } {
  const total = { devices: deviceCount(views, Number.MAX_SAFE_INTEGER).devices, paid: paidCount(paid, Number.MAX_SAFE_INTEGER).paid };
  const earnedAt: string[] = [];
  for (let i = 1; i <= seatsEarned(total, rule); i++) {
    const goal = seatGoal(i, rule);
    const d = deviceCount(views, goal.devices).reachedAt;
    const p = paidCount(paid, goal.paid).reachedAt;
    if (d && p) earnedAt.push(d > p ? d : p);
  }
  return { ...total, earnedAt };
}

/** Registration statuses that count as "has paid": a slip waiting for a check counts (no free seat on top of a payment). */
export const hasPaid = (status: string) => status === "paid" || status === "review";

/**
 * A seat as stored (hackathon_share_seats):
 * - needs_recipient: earned, nobody named yet;
 * - qualified: earned and someone to give it to; waiting for staff;
 * - confirmed: staff gave it (that sign-up is free);
 * - rejected: staff turned it down. It still uses up its place.
 */
export type SeatSlotStatus = "qualified" | "needs_recipient" | "confirmed" | "rejected";
export type SeatRow = { id: string; index: number; status: SeatSlotStatus; recipientRegistrationId: string | null };

/** Who an earned seat goes to before anyone is named: an unpaid student's first seat is their own sign-up; any other seat waits for a name. */
export function defaultRecipient(input: { kind: ShareKind; index: number; ownRegistrationId: string | null; ownStatus: string | null }): string | null {
  return input.kind === "student" && input.index === 1 && input.ownRegistrationId && input.ownStatus === "pending" ? input.ownRegistrationId : null;
}

/** One seat as a share page shows it. A friend shows by code only. */
export type SeatSlotView = {
  index: number;
  status: SeatSlotStatus;
  /** The named recipient's code, when it isn't the viewer's own sign-up. */
  recipientCode?: string;
  /** The seat goes to the viewer's own sign-up. */
  mine?: boolean;
};

/** Everything a page needs to draw a link's seats: the view model the share UI is designed against. */
export type SeatProgressView = {
  rule: SeatRule;
  phase: "open" | "after-close" | "off";
  devices: number;
  paid: number;
  /** Earned seats, by index. */
  seats: SeatSlotView[];
  /** The next seat and what's missing for it (counting stops at close, so after close it stays where it stopped). Null when maxed. */
  next: NextSeat | null;
  maxed: boolean;
};

/**
 * The seats as the link's owner sees them. A qualified seat for the owner's
 * own sign-up turns back into needs_recipient if they paid in the meantime
 * (no free seat on top of a payment): they name a friend instead.
 */
export function seatProgressView(input: {
  progress: Progress;
  rows: readonly SeatRow[];
  ownRegistrationId: string | null;
  selfPaid: boolean;
  phase: SeatProgressView["phase"];
  rule?: SeatRule;
}): SeatProgressView {
  const rule = input.rule ?? SEAT_RULE;
  const seats = [...input.rows]
    .sort((a, b) => a.index - b.index)
    .map((r): SeatSlotView => {
      const mine = !!r.recipientRegistrationId && r.recipientRegistrationId === input.ownRegistrationId;
      const status = r.status === "qualified" && mine && input.selfPaid ? "needs_recipient" : r.status;
      const slot: SeatSlotView = { index: r.index, status };
      if (status === "needs_recipient") return slot;
      if (mine) slot.mine = true;
      else if (r.recipientRegistrationId) slot.recipientCode = shareCode(r.recipientRegistrationId);
      return slot;
    });
  return {
    rule,
    phase: input.phase,
    devices: input.progress.devices,
    paid: input.progress.paid,
    seats,
    next: nextSeat(input.progress, seats.length, rule),
    maxed: seats.length >= rule.maxSeatsPerLink,
  };
}

/** Whether the owner may type a code for this seat: it waits for a name, or a friend was named and staff haven't confirmed yet. */
export function canNameSeat(seat: SeatSlotView, phase: SeatProgressView["phase"]): boolean {
  if (phase === "off") return false;
  return seat.status === "needs_recipient" || (seat.status === "qualified" && !seat.mine);
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

/** For the admin fraud check: how a link's devices came in. */
export function trafficStats(views: readonly ViewEvent[], now: Date): { networks: number; last24h: number; peakHour: number } {
  const since = now.getTime() - 24 * 3600_000;
  const hours = new Map<string, number>();
  let last24h = 0;
  for (const v of views) {
    if (new Date(v.at).getTime() >= since) last24h += 1;
    const h = v.at.slice(0, 13);
    hours.set(h, (hours.get(h) ?? 0) + 1);
  }
  return { networks: new Set(views.map((v) => v.ipHash)).size, last24h, peakHour: Math.max(0, ...hours.values()) };
}

const digits = (p: string | null | undefined) => (p ?? "").replace(/\D/g, "").replace(/^66/, "0").slice(-9);

/** Whether any phone in one list is the same number as any in the other (ignores spaces, dashes and +66). */
export function phonesMatch(a: readonly (string | null | undefined)[], b: readonly (string | null | undefined)[]): boolean {
  const left = new Set(a.map(digits).filter((d) => d.length >= 8));
  return b.map(digits).some((d) => d.length >= 8 && left.has(d));
}

function editDistance(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[y.length];
}

export type SchoolMatch = "match" | "similar" | "different";

/**
 * For the admin check, two school names as staff should read them:
 * - "match": the same name once folded (no โรงเรียน/รร., spaces, Thai digits);
 * - "similar": one name inside the other, or a few letters apart. Sibling
 *   schools ("สตรีวิทยา" / "สตรีวิทยา 2") and abbreviations both land here,
 *   so a person looks;
 * - "different": anything else, or a name missing.
 */
export function schoolMatch(a: string | null | undefined, b: string | null | undefined): SchoolMatch {
  const x = foldSchoolName(a ?? "");
  const y = foldSchoolName(b ?? "");
  if (!x || !y) return "different";
  if (x === y) return "match";
  if (x.includes(y) || y.includes(x)) return "similar";
  return editDistance(x, y) <= Math.max(2, Math.floor(Math.min([...x].length, [...y].length) * 0.2)) ? "similar" : "different";
}

/** What a share page shows about one link. Nothing in it names a person. */
export type ShareLinkView = {
  kind: ShareKind;
  code: string;
  school: { name: string; province: string | null };
  /** Students may change their school while sign-up is open. */
  canChangeSchool: boolean;
  /** Students: whether their own sign-up has paid. */
  selfPaid: boolean;
  /** Teachers: staff checked with the school. */
  verified: boolean;
  /** Teachers: staff have sent the Demo Day invite. */
  invited: boolean;
  seats: SeatProgressView;
};
