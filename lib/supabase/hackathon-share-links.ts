import "server-only";

import { freeSeatOutcome, linkSource, shareCode, sharePhase, type ShareKind } from "@/lib/hackathon/elemental/share";
import { elementalCountingEndsAt } from "@/lib/hackathon/elemental/link-views-shared";
import { newTeacherCode, newTeacherToken } from "@/lib/hackathon/elemental/share-codes";
import { notifyShareSeat } from "@/lib/hackathon/elemental/share-notify";
import {
  canNameSeat,
  codeIdRange,
  confirmBlock,
  countsForLink,
  defaultRecipient,
  hasPaid,
  linkProgress,
  paidAt,
  parseShareCode,
  recipientProblem,
  seatProgressView,
  seatsAllowedNow,
  seatsClosedReason,
  seatsEarned,
  seatsSwitchOpen,
  SEAT_RULE,
  trafficStats,
  type PaidEvent,
  type Progress,
  type RecipientProblem,
  type SeatRow,
  type SeatSlotStatus,
  type SeatsClosedReason,
  type ShareLinkView,
  type ViewEvent,
} from "@/lib/hackathon/elemental/share-rules";
import { createAdminClient } from "@/utils/supabase/admin";

import { isPayToken, isUniqueViolation, type RegistrationStatus } from "./hackathon-event-registrations";

/**
 * Elemental share links and their free seats, up to 2 per link
 * (hackathon_share_links, hackathon_share_seats; rules and SEAT_RULE in
 * lib/hackathon/elemental/share-rules.ts). Service role only: the share
 * pages hold a pay token or a teacher token, the admin page calls
 * requireAdmin() first. Every caller wraps these in try/catch, so pages keep
 * working before the migration is applied.
 */

export type ShareLink = {
  id: string;
  kind: ShareKind;
  code: string;
  registrationId: string | null;
  schoolKey: string;
  schoolName: string;
  province: string | null;
  /** Teachers only, for staff: never on a public page. */
  token: string | null;
  teacherName: string | null;
  teacherContact: string | null;
  teacherPhone: string | null;
  verifiedAt: string | null;
  invitedAt: string | null;
  /** Staff shut the link (fraud): it earns no more seats. */
  rejectedAt: string | null;
  createdAt: string;
  /** A student link's sign-up status (a cancelled sign-up's link earns no seats). */
  registrationStatus: string | null;
  /** A student link's team: with SEAT_RULE.countTeammates off, teammates' payments don't count for it. */
  teamId: string | null;
};

type LinkRow = {
  id: string;
  kind: ShareKind;
  code: string;
  registration_id: string | null;
  school_key: string;
  school_name: string;
  province: string | null;
  token: string | null;
  teacher_name: string | null;
  teacher_contact: string | null;
  teacher_phone: string | null;
  verified_at: string | null;
  invited_at: string | null;
  rejected_at: string | null;
  created_at: string;
  registration?: { status: string; team_id: string | null } | { status: string; team_id: string | null }[] | null;
};

const LINK_COLUMNS =
  "id, kind, code, registration_id, school_key, school_name, province, token, teacher_name, teacher_contact, teacher_phone, verified_at, invited_at, rejected_at, created_at, registration:hackathon_event_registrations!registration_id(status, team_id)";

const toLink = (r: LinkRow): ShareLink => ({
  id: r.id,
  kind: r.kind,
  code: r.code,
  registrationId: r.registration_id,
  schoolKey: r.school_key,
  schoolName: r.school_name,
  province: r.province,
  token: r.token,
  teacherName: r.teacher_name,
  teacherContact: r.teacher_contact,
  teacherPhone: r.teacher_phone,
  verifiedAt: r.verified_at,
  invitedAt: r.invited_at,
  createdAt: r.created_at,
  rejectedAt: r.rejected_at,
  registrationStatus: (Array.isArray(r.registration) ? r.registration[0]?.status : r.registration?.status) ?? null,
  teamId: (Array.isArray(r.registration) ? r.registration[0]?.team_id : r.registration?.team_id) ?? null,
});

export type School = { key: string; name: string; province: string | null };

/* ------------------------------------------------------------------ */
/* Sign-ups                                                            */
/* ------------------------------------------------------------------ */

/** What the share page needs about a sign-up, found by its pay token. */
export type ShareContext = {
  id: string;
  status: RegistrationStatus;
  /** The school typed at sign-up, to start the search with. */
  school: string | null;
  teamId: string | null;
};

export async function getShareContext(token: string): Promise<ShareContext | null> {
  if (!isPayToken(token)) return null;
  const { data, error } = await createAdminClient()
    .from("hackathon_event_registrations")
    .select("id, status, team_id, hackathon_event_registration_members(position, school)")
    .eq("pay_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const first = [...(data.hackathon_event_registration_members ?? [])].sort((a, b) => a.position - b.position)[0];
  return { id: data.id, status: data.status as RegistrationStatus, school: first?.school ?? null, teamId: data.team_id ?? null };
}

/** Sign-ups of this event whose code (first 8 hex of the id) is `code`. */
async function registrationsByCode(eventSlug: string, code: string): Promise<{ id: string; status: string }[]> {
  const { from, to } = codeIdRange(code);
  const { data, error } = await createAdminClient()
    .from("hackathon_event_registrations")
    .select("id, status")
    .eq("event_slug", eventSlug)
    .gte("id", from)
    .lte("id", to)
    .limit(2);
  if (error) throw error;
  return (data ?? []) as { id: string; status: string }[];
}

/* ------------------------------------------------------------------ */
/* Links                                                               */
/* ------------------------------------------------------------------ */

export async function getStudentLink(registrationId: string): Promise<ShareLink | null> {
  const { data, error } = await createAdminClient()
    .from("hackathon_share_links")
    .select(LINK_COLUMNS)
    .eq("registration_id", registrationId)
    .maybeSingle();
  if (error) throw error;
  return data ? toLink(data as LinkRow) : null;
}

export async function getTeacherLink(token: string): Promise<ShareLink | null> {
  const { data, error } = await createAdminClient()
    .from("hackathon_share_links")
    .select(LINK_COLUMNS)
    .eq("token", token)
    .eq("kind", "teacher")
    .maybeSingle();
  if (error) throw error;
  return data ? toLink(data as LinkRow) : null;
}

/** Which kind of link a poster code belongs to, or null if none. */
export async function findLinkKind(eventSlug: string, code: string): Promise<ShareKind | null> {
  const { data, error } = await createAdminClient()
    .from("hackathon_share_links")
    .select("kind")
    .eq("event_slug", eventSlug)
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return (data?.kind as ShareKind | undefined) ?? null;
}

export type SetSchoolResult = { ok: true; link: ShareLink } | { ok: false; reason: "code_taken" };

/**
 * A student picks their school, which makes their link, or changes it. With
 * no limit per school there's nothing to game by moving, so it can change any
 * time while sign-up is open (staff still see it in the fraud check).
 */
export async function setStudentSchool(
  eventSlug: string,
  self: { id: string; status: string },
  school: School,
): Promise<SetSchoolResult> {
  const db = createAdminClient();
  const existing = await getStudentLink(self.id);
  if (existing) {
    if (existing.schoolKey === school.key) return { ok: true, link: existing };
    const { data, error } = await db
      .from("hackathon_share_links")
      .update({ school_key: school.key, school_name: school.name, province: school.province, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select(LINK_COLUMNS)
      .single();
    if (error) throw error;
    return { ok: true, link: toLink(data as LinkRow) };
  }
  const { data, error } = await db
    .from("hackathon_share_links")
    .insert({
      event_slug: eventSlug,
      kind: "student",
      code: shareCode(self.id),
      registration_id: self.id,
      school_key: school.key,
      school_name: school.name,
      province: school.province,
    })
    .select(LINK_COLUMNS)
    .single();
  if (error) {
    if (isUniqueViolation(error)) {
      // Two taps at once: the other one made the link.
      const again = await getStudentLink(self.id);
      if (again) return { ok: true, link: again };
      return { ok: false, reason: "code_taken" };
    }
    throw error;
  }
  return { ok: true, link: toLink(data as LinkRow) };
}

export type CreateTeacherResult = { ok: true; token: string; code: string } | { ok: false; reason: "exists" };

/**
 * A teacher's link. Its code is 8 random hex digits that no link and no
 * sign-up's code already uses; the token is the private page's key.
 */
export async function createTeacherLink(
  eventSlug: string,
  input: { name: string; school: School; contact: string; contactKey: string; phone: string | null },
): Promise<CreateTeacherResult> {
  const db = createAdminClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newTeacherCode();
    if ((await registrationsByCode(eventSlug, code)).length > 0) continue;
    const token = newTeacherToken();
    const { error } = await db.from("hackathon_share_links").insert({
      event_slug: eventSlug,
      kind: "teacher",
      code,
      token,
      school_key: input.school.key,
      school_name: input.school.name,
      province: input.school.province,
      teacher_name: input.name,
      teacher_contact: input.contact,
      teacher_contact_key: input.contactKey,
      teacher_phone: input.phone,
    });
    if (!error) return { ok: true, token, code };
    if (!isUniqueViolation(error)) throw error;
    if (error.message.includes("teacher_contact")) return { ok: false, reason: "exists" };
    // The code was taken: try another.
  }
  throw new Error("Could not find a free teacher code");
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

const PAGE = 1000;

/** Every row of a query, a page at a time (the API returns at most 1,000 rows per call). */
async function allRows<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 100 * PAGE; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

type Activity = Map<string, { views: ViewEvent[]; paid: (PaidEvent & { teamId: string | null })[] }>;

/**
 * Device views and paid sign-ups per tracked source, counted only up to
 * sign-up close: views before it, and paid sign-ups whose slip came in by
 * then (paidAt) and that paid real money (not free seats). `sources` null:
 * every link of the event.
 */
async function loadActivity(eventSlug: string, sources: string[] | null): Promise<Activity> {
  const out: Activity = new Map();
  if (sources && sources.length === 0) return out;
  const db = createAdminClient();
  const endsAt = elementalCountingEndsAt().toISOString();
  const [views, regs] = await Promise.all([
    allRows<{ source: string; ip_hash: string; created_at: string }>((from, to) => {
      let q = db.from("hackathon_link_views").select("source, ip_hash, created_at").eq("event_slug", eventSlug).lte("created_at", endsAt);
      if (sources) q = q.in("source", sources);
      return q.order("id").range(from, to);
    }),
    allRows<{ source: string; member_count: number | null; slip_path: string | null; created_at: string; team_id: string | null }>((from, to) => {
      let q = db
        .from("hackathon_event_registrations")
        .select("source, member_count, slip_path, created_at, team_id")
        .eq("event_slug", eventSlug)
        .eq("status", "paid")
        .eq("free_seat", false)
        .lte("created_at", endsAt);
      q = sources ? q.in("source", sources) : q.not("source", "is", null);
      return q.order("id").range(from, to);
    }),
  ]);
  const slot = (s: string) => {
    let a = out.get(s);
    if (!a) out.set(s, (a = { views: [], paid: [] }));
    return a;
  };
  for (const v of views) slot(v.source).views.push({ ipHash: v.ip_hash, at: v.created_at });
  const endsMs = Date.parse(endsAt);
  for (const r of regs) {
    const at = paidAt({ slipPath: r.slip_path, createdAt: r.created_at });
    // Paid means the slip came in by close, not just a sign-up made by then.
    if (Date.parse(at) > endsMs) continue;
    slot(r.source).paid.push({ seats: r.member_count ?? 1, at, teamId: r.team_id });
  }
  return out;
}

export type LinkProgress = Progress & { earnedAt: string[] };

function progressOf(link: ShareLink, activity: Activity): LinkProgress {
  const a = activity.get(linkSource(link.kind, link.code));
  // With SEAT_RULE.countTeammates off, a teammate's payment doesn't count toward the sharer's seats.
  const paid = (a?.paid ?? []).filter((p) => countsForLink({ kind: link.kind, sharerTeamId: link.teamId, payerTeamId: p.teamId }));
  return linkProgress(a?.views ?? [], paid);
}

/* ------------------------------------------------------------------ */
/* Seats                                                               */
/* ------------------------------------------------------------------ */

export type ShareSeat = SeatRow & {
  linkId: string;
  earnedAt: string;
  devices: number;
  paid: number;
  decidedAt: string | null;
};

type SeatDbRow = {
  id: string;
  link_id: string;
  seat_index: number;
  status: SeatSlotStatus;
  earned_at: string;
  devices: number;
  paid: number;
  recipient_registration_id: string | null;
  decided_at: string | null;
};

const SEAT_COLUMNS = "id, link_id, seat_index, status, earned_at, devices, paid, recipient_registration_id, decided_at";

const toSeat = (r: SeatDbRow): ShareSeat => ({
  id: r.id,
  linkId: r.link_id,
  index: r.seat_index,
  status: r.status,
  earnedAt: r.earned_at,
  devices: r.devices,
  paid: r.paid,
  recipientRegistrationId: r.recipient_registration_id,
  decidedAt: r.decided_at,
});

async function seatsOf(linkIds: string[]): Promise<ShareSeat[]> {
  if (linkIds.length === 0) return [];
  const db = createAdminClient();
  const out: ShareSeat[] = [];
  for (let i = 0; i < linkIds.length; i += 100) {
    const part = linkIds.slice(i, i + 100);
    const rows = await allRows<SeatDbRow>((from, to) => db.from("hackathon_share_seats").select(SEAT_COLUMNS).in("link_id", part).order("id").range(from, to));
    out.push(...rows.map(toSeat));
  }
  return out;
}

/** What decides whether new seats are written now, and who the owner's first seat goes to. */
type SeatContext = {
  /** Why no new seats are written (ELEMENTAL_SEATS_OPEN=0, or SEAT_RULE.maxSeatsTotal reached), or null. */
  closedReason: SeatsClosedReason | null;
  liveSeatsTotal: number;
  /** The owner is already the recipient of a live seat on another link. */
  ownGiftedElsewhere: boolean;
};

/** Live (not rejected) seats across the event; only read when there's a cap to check. */
async function liveSeatsTotal(eventSlug: string): Promise<number> {
  if (SEAT_RULE.maxSeatsTotal === null) return 0;
  const { count, error } = await createAdminClient()
    .from("hackathon_share_seats")
    .select("id", { count: "exact", head: true })
    .eq("event_slug", eventSlug)
    .neq("status", "rejected");
  if (error) throw error;
  return count ?? 0;
}

async function giftedElsewhere(registrationId: string | null, linkId: string): Promise<boolean> {
  if (!registrationId) return false;
  const { data, error } = await createAdminClient()
    .from("hackathon_share_seats")
    .select("id")
    .eq("recipient_registration_id", registrationId)
    .neq("status", "rejected")
    .neq("link_id", linkId)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

async function seatContext(eventSlug: string, link: ShareLink): Promise<SeatContext> {
  const [total, gifted] = await Promise.all([liveSeatsTotal(eventSlug), giftedElsewhere(link.kind === "student" ? link.registrationId : null, link.id)]);
  return { closedReason: seatsClosedReason({ switchOpen: seatsSwitchOpen(), liveSeatsTotal: total }), liveSeatsTotal: total, ownGiftedElsewhere: gifted };
}

/**
 * Write down any seat the link has earned and doesn't have a row for yet.
 * A seat waits for a name, except an unpaid student's first seat, which is
 * their own sign-up, unless a friend's link already named them (one free
 * seat per sign-up). Nothing new is written while seats are closed
 * (switched off or capped), for a shut link, or for a cancelled sign-up.
 * The unique index on (link, seat) makes this safe when two pages poll at
 * once; if the owner was named elsewhere a moment ago, the recipient index
 * refuses the insert and it is written again waiting for a name.
 * Pings staff for each new seat.
 */
async function recordEarnedSeats(eventSlug: string, link: ShareLink, p: LinkProgress, existing: ShareSeat[], ctx: SeatContext): Promise<ShareSeat[]> {
  if (link.registrationStatus === "cancelled" || link.rejectedAt || ctx.closedReason) return existing;
  const have = new Set(existing.map((x) => x.index));
  const missing = Array.from({ length: seatsEarned(p) }, (_, i) => i + 1).filter((i) => !have.has(i));
  const writable = missing.slice(0, seatsAllowedNow(missing.length, ctx.liveSeatsTotal));
  if (writable.length === 0) return existing;
  const rowsFor = (gifted: boolean) =>
    writable.map((index) => {
      const recipient = defaultRecipient({
        kind: link.kind,
        index,
        ownRegistrationId: link.registrationId,
        ownStatus: link.registrationStatus,
        ownAlreadyRecipient: gifted,
      });
      return {
        event_slug: eventSlug,
        link_id: link.id,
        seat_index: index,
        status: recipient ? "qualified" : "needs_recipient",
        recipient_registration_id: recipient,
        earned_at: p.earnedAt[index - 1] ?? new Date().toISOString(),
        devices: p.devices,
        paid: p.paid,
      };
    });
  const insert = (rows: ReturnType<typeof rowsFor>) =>
    createAdminClient().from("hackathon_share_seats").upsert(rows, { onConflict: "link_id,seat_index", ignoreDuplicates: true }).select(SEAT_COLUMNS);
  let { data, error } = await insert(rowsFor(ctx.ownGiftedElsewhere));
  if (error && isUniqueViolation(error) && !ctx.ownGiftedElsewhere) {
    // The owner already holds a free seat from another link: write theirs waiting for a friend's name.
    ({ data, error } = await insert(rowsFor(true)));
  }
  if (error) throw error;
  const added = (data ?? []).map((r) => toSeat(r as SeatDbRow));
  for (const seat of added) {
    notifyShareSeat({ event: "qualified", kind: link.kind, code: link.code, school: link.schoolName, devices: p.devices, paid: p.paid, seatIndex: seat.index });
  }
  // Another poll may have written some of them first: read back the full set.
  return added.length === writable.length ? [...existing, ...added] : seatsOf([link.id]);
}

type LinkState = {
  progress: LinkProgress;
  seats: ShareSeat[];
  ctx: SeatContext;
  /** Named recipients' sign-up status now (a friend may have paid anyway). */
  recipientStatus: Map<string, string>;
};

async function recipientStatuses(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await createAdminClient().from("hackathon_event_registrations").select("id, status").in("id", ids);
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.id as string, r.status as string]));
}

/** A link's numbers and seats, fresh, writing down any seat it has just earned. */
async function syncLink(eventSlug: string, link: ShareLink): Promise<LinkState> {
  const [activity, existing, ctx] = await Promise.all([loadActivity(eventSlug, [linkSource(link.kind, link.code)]), seatsOf([link.id]), seatContext(eventSlug, link)]);
  const progress = progressOf(link, activity);
  const seats = await recordEarnedSeats(eventSlug, link, progress, existing, ctx);
  const named = [...new Set(seats.map((x) => x.recipientRegistrationId).filter((id): id is string => !!id && id !== link.registrationId))];
  return { progress, seats, ctx, recipientStatus: await recipientStatuses(named) };
}

function toView(link: ShareLink, state: LinkState, self: { id: string; status: string } | null): ShareLinkView {
  const selfPaid = self ? hasPaid(self.status) : false;
  const phase = sharePhase();
  return {
    kind: link.kind,
    code: link.code,
    school: { name: link.schoolName, province: link.province },
    canChangeSchool: link.kind === "student" && phase === "open",
    selfPaid,
    verified: Boolean(link.verifiedAt),
    invited: Boolean(link.invitedAt),
    seats: seatProgressView({
      progress: state.progress,
      rows: state.seats.map((x) => ({ ...x, recipientStatus: x.recipientRegistrationId ? (state.recipientStatus.get(x.recipientRegistrationId) ?? null) : null })),
      ownRegistrationId: self?.id ?? null,
      selfPaid,
      phase,
      giftedToYou: state.ctx.ownGiftedElsewhere,
      seatsClosedReason: state.ctx.closedReason,
      linkRejected: Boolean(link.rejectedAt),
    }),
  };
}

/** What the share page shows for one link, fresh: its numbers and its seats. */
export async function linkView(eventSlug: string, link: ShareLink, self: { id: string; status: string } | null): Promise<ShareLinkView> {
  return toView(link, await syncLink(eventSlug, link), self);
}

export type NameResult = { ok: true; view: ShareLinkView } | { ok: false; reason: RecipientProblem | "invalid" | "not_allowed" | "taken" };

/**
 * Name who gets one of the link's seats: a paid student's friend, an unpaid
 * student's second seat, or a teacher's student. Allowed while the seat
 * waits for a name or for staff; it can be changed until staff confirm.
 */
export async function nameRecipient(
  eventSlug: string,
  link: ShareLink,
  self: { id: string; status: string } | null,
  seatIndex: number,
  rawCode: string,
): Promise<NameResult> {
  const code = parseShareCode(rawCode);
  if (!code) return { ok: false, reason: "invalid" };
  // A link staff shut gives no seats.
  if (link.rejectedAt) return { ok: false, reason: "not_allowed" };
  const state = await syncLink(eventSlug, link);
  const view = toView(link, state, self);
  const slot = view.seats.seats.find((x) => x.index === seatIndex);
  const seat = state.seats.find((x) => x.index === seatIndex);
  if (!slot || !seat || !canNameSeat(slot, view.seats.phase)) return { ok: false, reason: "not_allowed" };

  const matches = await registrationsByCode(eventSlug, code);
  const problem = recipientProblem(matches, self?.id ?? null);
  if (problem) return { ok: false, reason: problem };

  const now = new Date().toISOString();
  const { data, error } = await createAdminClient()
    .from("hackathon_share_seats")
    .update({ recipient_registration_id: matches[0].id, recipient_named_at: now, status: "qualified", updated_at: now })
    .eq("id", seat.id)
    .in("status", ["needs_recipient", "qualified"])
    .select(SEAT_COLUMNS);
  if (error) {
    // One free seat per sign-up: someone else already named this code.
    if (isUniqueViolation(error)) return { ok: false, reason: "taken" };
    throw error;
  }
  if (!data || data.length === 0) return { ok: false, reason: "not_allowed" };
  if (seat.recipientRegistrationId !== matches[0].id) {
    notifyShareSeat({
      event: "named",
      kind: link.kind,
      code: link.code,
      school: link.schoolName,
      devices: state.progress.devices,
      paid: state.progress.paid,
      seatIndex,
      recipientCode: code,
    });
  }
  const updated = toSeat(data[0] as SeatDbRow);
  const recipientStatus = new Map(state.recipientStatus).set(matches[0].id, matches[0].status);
  return { ok: true, view: toView(link, { ...state, recipientStatus, seats: state.seats.map((x) => (x.id === updated.id ? updated : x)) }, self) };
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export type AdminShareLink = ShareLink & {
  progress: LinkProgress;
  /** For the fraud check: distinct networks, devices in the last 24 hours (up to close), and the busiest hour. */
  traffic: { networks: number; last24h: number; peakHour: number };
  /** The seats this link has earned, by index. */
  seats: ShareSeat[];
  /** Writing this link's new seats failed (shown on its row, so one bad link can't blank the panel). */
  syncError: string | null;
  /** New seats are closed event-wide (ELEMENTAL_SEATS_OPEN=0 or the cap), the same for every link. */
  seatsClosedReason: SeatsClosedReason | null;
};

/**
 * Every link with its numbers and seats, for the admin page. Writes down any
 * seat a link has earned since anyone last looked, so nothing waits on a
 * student opening their page.
 */
export async function listShareLinksForAdmin(eventSlug: string): Promise<AdminShareLink[]> {
  const db = createAdminClient();
  const links = (
    await allRows<LinkRow>((from, to) => db.from("hackathon_share_links").select(LINK_COLUMNS).eq("event_slug", eventSlug).order("created_at").range(from, to))
  ).map(toLink);
  const [activity, seats] = await Promise.all([loadActivity(eventSlug, null), seatsOf(links.map((l) => l.id))]);
  const now = new Date(Math.min(Date.now(), elementalCountingEndsAt().getTime()));
  // Who is already a recipient, and on which links, so a link's first seat doesn't collide with a seat a friend gave.
  const recipientOn = new Map<string, Set<string>>();
  const noteRecipient = (x: ShareSeat) => {
    if (!x.recipientRegistrationId || x.status === "rejected") return;
    const set = recipientOn.get(x.recipientRegistrationId) ?? new Set<string>();
    set.add(x.linkId);
    recipientOn.set(x.recipientRegistrationId, set);
  };
  seats.forEach(noteRecipient);
  let live = seats.filter((x) => x.status !== "rejected").length;
  const switchOpen = seatsSwitchOpen();
  const out: AdminShareLink[] = [];
  for (const l of links) {
    const progress = progressOf(l, activity);
    const own = seats.filter((x) => x.linkId === l.id);
    const closedReason = seatsClosedReason({ switchOpen, liveSeatsTotal: live });
    const elsewhere = [...(l.registrationId ? (recipientOn.get(l.registrationId) ?? []) : [])].some((linkId) => linkId !== l.id);
    let linkSeats = own;
    let syncError: string | null = null;
    try {
      linkSeats = await recordEarnedSeats(eventSlug, l, progress, own, { closedReason, liveSeatsTotal: live, ownGiftedElsewhere: l.kind === "student" && elsewhere });
      for (const x of linkSeats) if (!own.some((o) => o.id === x.id)) {
        noteRecipient(x);
        if (x.status !== "rejected") live += 1;
      }
    } catch (error) {
      console.error("[admin share] could not write a link's seats", l.id, error);
      syncError = error instanceof Error ? error.message : "could not write new seats";
    }
    out.push({
      ...l,
      progress,
      traffic: trafficStats(activity.get(linkSource(l.kind, l.code))?.views ?? [], now),
      seats: [...linkSeats].sort((a, b) => a.index - b.index),
      syncError,
      seatsClosedReason: closedReason,
    });
  }
  return out;
}

export type DecideSeatResult =
  | { ok: true; becamePaid: boolean; registrationId: string | null }
  | { ok: false; reason: "not_found" | "closed" | "needs_recipient" | "recipient_paid" | "recipient_taken" | "teacher_not_verified" | "link_rejected" };

/**
 * Staff decision on one seat.
 * - confirm: the seat goes to its recipient; one seat's price comes off that
 *   sign-up, at ฿0 it is paid, and it is marked free_seat (so it never counts
 *   as paid for a link or the board) with a note.
 * - reject: the seat is turned down (fraud). It stays used up.
 */
export async function decideSeat(seatId: string, action: "confirm" | "reject", adminUserId: string): Promise<DecideSeatResult> {
  const db = createAdminClient();
  const { data: seatRow, error } = await db
    .from("hackathon_share_seats")
    .select("id, link_id, seat_index, status, recipient_registration_id, hackathon_share_links!link_id(kind, code, school_name, province, verified_at, rejected_at)")
    .eq("id", seatId)
    .maybeSingle();
  if (error) throw error;
  if (!seatRow) return { ok: false, reason: "not_found" };
  if (seatRow.status === "confirmed" || seatRow.status === "rejected") return { ok: false, reason: "closed" };
  const link = (Array.isArray(seatRow.hackathon_share_links) ? seatRow.hackathon_share_links[0] : seatRow.hackathon_share_links) as {
    kind: ShareKind;
    code: string;
    school_name: string;
    province: string | null;
    verified_at: string | null;
    rejected_at: string | null;
  } | null;
  if (!link) return { ok: false, reason: "not_found" };
  const now = new Date().toISOString();
  const decided = { decided_at: now, decided_by: `admin:${adminUserId}`, updated_at: now };

  if (action === "reject") {
    const { data: done, error: e } = await db
      .from("hackathon_share_seats")
      .update({ status: "rejected", ...decided })
      .eq("id", seatId)
      .in("status", ["needs_recipient", "qualified"])
      .select("id");
    if (e) throw e;
    if (!done || done.length === 0) return { ok: false, reason: "closed" };
    return { ok: true, becamePaid: false, registrationId: null };
  }

  // A teacher's seats wait for "verified with the school" (SEAT_RULE.teacherSeatsNeedVerified); a shut link gives none.
  const block = confirmBlock({ kind: link.kind, teacherVerified: Boolean(link.verified_at), linkRejected: Boolean(link.rejected_at) });
  if (block) return { ok: false, reason: block };

  const recipientId = seatRow.recipient_registration_id as string | null;
  if (seatRow.status !== "qualified" || !recipientId) return { ok: false, reason: "needs_recipient" };
  const { data: reg, error: regError } = await db
    .from("hackathon_event_registrations")
    .select("status, amount_baht, member_count, admin_note")
    .eq("id", recipientId)
    .maybeSingle();
  if (regError) throw regError;
  if (!reg) return { ok: false, reason: "needs_recipient" };
  if (reg.status !== "pending") return { ok: false, reason: "recipient_paid" };

  // Claim the seat first, so two staff clicking at once can't both give it.
  const { data: claimed, error: claimError } = await db
    .from("hackathon_share_seats")
    .update({ status: "confirmed", ...decided })
    .eq("id", seatId)
    .eq("status", "qualified")
    .select("id");
  if (claimError) {
    if (isUniqueViolation(claimError)) return { ok: false, reason: "recipient_taken" };
    throw claimError;
  }
  if (!claimed || claimed.length === 0) return { ok: false, reason: "closed" };

  const outcome = freeSeatOutcome(reg.amount_baht, reg.member_count);
  const where = link.province ? `${link.school_name}, ${link.province}` : link.school_name;
  const note = [reg.admin_note, `free seat ${seatRow.seat_index}: ${link.kind === "teacher" ? "t" : "share"}-${link.code} at ${where}`]
    .filter(Boolean)
    .join(" · ");
  const { data: updated, error: updateError } = await db
    .from("hackathon_event_registrations")
    .update({
      amount_baht: outcome.amountBaht,
      admin_note: note,
      // Free seats never count as paid for a link, a seat or the board.
      free_seat: true,
      ...(outcome.paid ? { status: "paid", paid_at: now, paid_by: `admin:${adminUserId}` } : {}),
      updated_at: now,
    })
    .eq("id", recipientId)
    .eq("status", "pending")
    .select("id");
  if (updateError || !updated || updated.length === 0) {
    // The sign-up paid in the meantime: put the seat back.
    await db.from("hackathon_share_seats").update({ status: "qualified", decided_at: null, decided_by: null, updated_at: now }).eq("id", seatId);
    if (updateError) throw updateError;
    return { ok: false, reason: "recipient_paid" };
  }
  return { ok: true, becamePaid: outcome.paid, registrationId: recipientId };
}

export type TeacherMark = "verified" | "invited";

/**
 * Staff mark (or unmark) a teacher: "verified" (checked with the school that
 * they teach there), then "invited" (Demo Day invite sent), which needs
 * "verified" first. Unverifying also clears the invite mark.
 */
export async function setTeacherMark(
  linkId: string,
  mark: TeacherMark,
  on: boolean,
  adminUserId: string,
): Promise<"ok" | "not_found" | "not_verified"> {
  const now = new Date().toISOString();
  const by = `admin:${adminUserId}`;
  let q = createAdminClient().from("hackathon_share_links").update(
    mark === "verified"
      ? { verified_at: on ? now : null, verified_by: on ? by : null, ...(on ? {} : { invited_at: null, invited_by: null }), updated_at: now }
      : { invited_at: on ? now : null, invited_by: on ? by : null, updated_at: now },
  );
  q = q.eq("id", linkId).eq("kind", "teacher");
  if (mark === "invited" && on) q = q.not("verified_at", "is", null);
  const { data, error } = await q.select("id");
  if (error) throw error;
  if ((data ?? []).length > 0) return "ok";
  if (mark === "invited" && on) {
    const { data: exists } = await createAdminClient().from("hackathon_share_links").select("id").eq("id", linkId).eq("kind", "teacher").maybeSingle();
    if (exists) return "not_verified";
  }
  return "not_found";
}

/**
 * Staff shut a link (fraud) or open it again. Shut: it earns no more seats,
 * and its seats still waiting for a name or a check are turned down. Opening
 * it again doesn't bring those seats back; it only lets new ones be earned.
 */
export async function setLinkRejected(linkId: string, rejected: boolean, adminUserId: string): Promise<"ok" | "not_found"> {
  const db = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("hackathon_share_links")
    .update({ rejected_at: rejected ? now : null, rejected_by: rejected ? `admin:${adminUserId}` : null, updated_at: now })
    .eq("id", linkId)
    .select("id");
  if (error) throw error;
  if ((data ?? []).length === 0) return "not_found";
  if (rejected) {
    const { error: seatError } = await db
      .from("hackathon_share_seats")
      .update({ status: "rejected", decided_at: now, decided_by: `admin:${adminUserId}`, updated_at: now })
      .eq("link_id", linkId)
      .in("status", ["needs_recipient", "qualified"]);
    if (seatError) throw seatError;
  }
  return "ok";
}

/** A sign-up as the admin fraud check sees it (staff only: names and phones). */
export type SharePerson = {
  name: string;
  status: string;
  /** The first member's school, as typed at sign-up. */
  school: string;
  /** The contact phone and every parent phone on the sign-up. */
  phones: string[];
  source: string | null;
  seats: number;
  /** Got a free seat: never counts as paid for a link. */
  freeSeat: boolean;
  /** Paid, but the slip came in after sign-up closed: doesn't count either. */
  paidAfterClose: boolean;
  /** The sign-up's team: with SEAT_RULE.countTeammates off, a payer on the sharer's own team doesn't count. */
  teamId: string | null;
};

type PersonRow = {
  id: string;
  status: string;
  source: string | null;
  member_count: number | null;
  contact_phone: string | null;
  free_seat: boolean | null;
  slip_path: string | null;
  created_at: string;
  team_name: string | null;
  team_id: string | null;
  hackathon_event_registration_members: { position: number; full_name: string; nickname: string | null; school: string; parent_phone: string | null }[] | null;
};

const PERSON_COLUMNS =
  "id, status, source, member_count, contact_phone, free_seat, slip_path, created_at, team_name, team_id, hackathon_event_registration_members(position, full_name, nickname, school, parent_phone)";

function toPerson(r: PersonRow, endsMs: number): SharePerson {
  const members = [...(r.hackathon_event_registration_members ?? [])].sort((a, b) => a.position - b.position);
  return {
    name: members[0]?.full_name || members[0]?.nickname || r.team_name || "?",
    status: r.status,
    school: members[0]?.school ?? "",
    phones: [r.contact_phone, ...members.map((m) => m.parent_phone)].filter((p): p is string => Boolean(p)),
    source: r.source,
    seats: r.member_count ?? 1,
    freeSeat: Boolean(r.free_seat),
    paidAfterClose: r.status === "paid" && Date.parse(paidAt({ slipPath: r.slip_path, createdAt: r.created_at })) > endsMs,
    teamId: r.team_id ?? null,
  };
}

/**
 * Everyone the admin share panel needs, read directly rather than from the
 * newest-500 sign-up list: each link's own sign-up, each seat's recipient,
 * and every paid sign-up that came through a link that earned a seat.
 */
export async function loadSharePeople(eventSlug: string, links: AdminShareLink[]): Promise<Map<string, SharePerson>> {
  const db = createAdminClient();
  const endsMs = elementalCountingEndsAt().getTime();
  const out = new Map<string, SharePerson>();
  const ids = [
    ...new Set(
      links.flatMap((l) => [l.registrationId, ...l.seats.map((x) => x.recipientRegistrationId)].filter((id): id is string => Boolean(id))),
    ),
  ];
  const sources = links.filter((l) => l.seats.length > 0).map((l) => linkSource(l.kind, l.code));
  const chunks = <T,>(list: T[], n: number) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));
  const batches: Promise<PersonRow[]>[] = [
    ...chunks(ids, 100).map((part) =>
      allRows<PersonRow>((from, to) => db.from("hackathon_event_registrations").select(PERSON_COLUMNS).in("id", part).order("id").range(from, to)),
    ),
    ...chunks(sources, 50).map((part) =>
      allRows<PersonRow>((from, to) =>
        db
          .from("hackathon_event_registrations")
          .select(PERSON_COLUMNS)
          .eq("event_slug", eventSlug)
          .eq("status", "paid")
          .in("source", part)
          .order("id")
          .range(from, to),
      ),
    ),
  ];
  for (const rows of await Promise.all(batches)) for (const r of rows) out.set(r.id, toPerson(r, endsMs));
  return out;
}
