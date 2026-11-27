import "server-only";

import { freeSeatOutcome, linkSource, shareCode, type ShareKind } from "@/lib/hackathon/elemental/share";
import { newTeacherCode, newTeacherToken } from "@/lib/hackathon/elemental/share-codes";
import {
  canChangeSchool,
  canNameRecipient,
  codeIdRange,
  hasPaid,
  linkProgress,
  parseShareCode,
  pickSeatWinner,
  recipientProblem,
  seatRecipientId,
  seatView,
  type PaidEvent,
  type Progress,
  type RecipientProblem,
  type SeatRow,
  type SeatStatus,
  type ShareLinkView,
  type ViewEvent,
} from "@/lib/hackathon/elemental/share-rules";
import { createAdminClient } from "@/utils/supabase/admin";

import { isPayToken, isUniqueViolation, type RegistrationStatus } from "./hackathon-event-registrations";

/**
 * Elemental share links and the one free seat per school
 * (hackathon_share_links, hackathon_school_seats; rules in
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
  invitedAt: string | null;
  status: "live" | "rejected";
  createdAt: string;
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
  invited_at: string | null;
  status: "live" | "rejected";
  created_at: string;
};

const LINK_COLUMNS =
  "id, kind, code, registration_id, school_key, school_name, province, token, teacher_name, teacher_contact, teacher_phone, invited_at, status, created_at";

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
  invitedAt: r.invited_at,
  status: r.status,
  createdAt: r.created_at,
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
};

export async function getShareContext(token: string): Promise<ShareContext | null> {
  if (!isPayToken(token)) return null;
  const { data, error } = await createAdminClient()
    .from("hackathon_event_registrations")
    .select("id, status, hackathon_event_registration_members(position, school)")
    .eq("pay_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const first = [...(data.hackathon_event_registration_members ?? [])].sort((a, b) => a.position - b.position)[0];
  return { id: data.id, status: data.status as RegistrationStatus, school: first?.school ?? null };
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

export type SetSchoolResult = { ok: true; link: ShareLink } | { ok: false; reason: "locked" | "code_taken" };

/** A student picks their school, which makes their link; or changes it while the link has barely started. */
export async function setStudentSchool(
  eventSlug: string,
  self: { id: string; status: string },
  school: School,
): Promise<SetSchoolResult> {
  const db = createAdminClient();
  const existing = await getStudentLink(self.id);
  if (existing) {
    if (existing.schoolKey === school.key) return { ok: true, link: existing };
    const view = await linkView(eventSlug, existing, self);
    if (!view.canChangeSchool) return { ok: false, reason: "locked" };
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

type Activity = Map<string, { views: ViewEvent[]; paid: PaidEvent[] }>;

/** Device views and paid sign-ups per tracked source. `sources` null: every link of the event. */
async function loadActivity(eventSlug: string, sources: string[] | null): Promise<Activity> {
  const out: Activity = new Map();
  if (sources && sources.length === 0) return out;
  const db = createAdminClient();
  const [views, regs] = await Promise.all([
    allRows<{ source: string; ip_hash: string; created_at: string }>((from, to) => {
      let q = db.from("hackathon_link_views").select("source, ip_hash, created_at").eq("event_slug", eventSlug);
      if (sources) q = q.in("source", sources);
      return q.order("id").range(from, to);
    }),
    allRows<{ source: string; member_count: number | null; paid_at: string | null; updated_at: string }>((from, to) => {
      let q = db
        .from("hackathon_event_registrations")
        .select("source, member_count, paid_at, updated_at")
        .eq("event_slug", eventSlug)
        .eq("status", "paid");
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
  for (const r of regs) slot(r.source).paid.push({ seats: r.member_count ?? 1, at: r.paid_at ?? r.updated_at });
  return out;
}

export type LinkProgress = Progress & { qualifiedAt: string | null };

function progressOf(link: ShareLink, activity: Activity): LinkProgress {
  const a = activity.get(linkSource(link.kind, link.code));
  return linkProgress(a?.views ?? [], a?.paid ?? []);
}

/* ------------------------------------------------------------------ */
/* Seats                                                               */
/* ------------------------------------------------------------------ */

export type SchoolSeat = SeatRow & {
  schoolKey: string;
  qualifiedAt: string;
  devices: number;
  paid: number;
  decidedAt: string | null;
};

type SeatDbRow = {
  id: string;
  school_key: string;
  link_id: string;
  status: SeatStatus;
  qualified_at: string;
  devices: number;
  paid: number;
  recipient_registration_id: string | null;
  decided_at: string | null;
};

const SEAT_COLUMNS = "id, school_key, link_id, status, qualified_at, devices, paid, recipient_registration_id, decided_at";

const toSeat = (r: SeatDbRow): SchoolSeat => ({
  id: r.id,
  schoolKey: r.school_key,
  linkId: r.link_id,
  status: r.status,
  qualifiedAt: r.qualified_at,
  devices: r.devices,
  paid: r.paid,
  recipientRegistrationId: r.recipient_registration_id,
  decidedAt: r.decided_at,
});

async function liveSeat(eventSlug: string, schoolKey: string): Promise<SchoolSeat | null> {
  const { data, error } = await createAdminClient()
    .from("hackathon_school_seats")
    .select(SEAT_COLUMNS)
    .eq("event_slug", eventSlug)
    .eq("school_key", schoolKey)
    .neq("status", "rejected")
    .maybeSingle();
  if (error) throw error;
  return data ? toSeat(data as SeatDbRow) : null;
}

/** Give a school's seat to the first link there that qualified, if nobody holds it yet. */
async function awardSeat(eventSlug: string, schoolKey: string, links: ShareLink[], progress: Map<string, LinkProgress>): Promise<SchoolSeat | null> {
  const winner = pickSeatWinner(
    links.map((l) => ({ linkId: l.id, qualifiedAt: progress.get(l.id)?.qualifiedAt ?? null, createdAt: l.createdAt, rejected: l.status === "rejected" })),
  );
  if (!winner) return null;
  const p = progress.get(winner.linkId)!;
  const { data, error } = await createAdminClient()
    .from("hackathon_school_seats")
    .insert({ event_slug: eventSlug, school_key: schoolKey, link_id: winner.linkId, qualified_at: winner.qualifiedAt, devices: p.devices, paid: p.paid })
    .select(SEAT_COLUMNS)
    .single();
  if (error) {
    // Someone else's page awarded it a moment ago: read what they wrote.
    if (isUniqueViolation(error)) return liveSeat(eventSlug, schoolKey);
    throw error;
  }
  return toSeat(data as SeatDbRow);
}

/** Every link at one school with its numbers, and the school's seat (awarding it if a link has just qualified). */
async function syncSchool(eventSlug: string, schoolKey: string): Promise<{ seat: SchoolSeat | null; progress: Map<string, LinkProgress> }> {
  const { data, error } = await createAdminClient()
    .from("hackathon_share_links")
    .select(LINK_COLUMNS)
    .eq("event_slug", eventSlug)
    .eq("school_key", schoolKey);
  if (error) throw error;
  const links = (data ?? []).map((r) => toLink(r as LinkRow));
  const [activity, existing] = await Promise.all([
    loadActivity(eventSlug, links.map((l) => linkSource(l.kind, l.code))),
    liveSeat(eventSlug, schoolKey),
  ]);
  const progress = new Map(links.map((l) => [l.id, progressOf(l, activity)]));
  const seat = existing ?? (await awardSeat(eventSlug, schoolKey, links, progress));
  return { seat, progress };
}

function toView(link: ShareLink, p: Progress, seat: SeatRow | null, self: { id: string; status: string } | null): ShareLinkView {
  const selfPaid = self ? hasPaid(self.status) : false;
  const view = seatView({
    linkId: link.id,
    kind: link.kind,
    linkRejected: link.status === "rejected",
    ownRegistrationId: self?.id ?? null,
    selfPaid,
    seat,
  });
  return {
    kind: link.kind,
    code: link.code,
    school: { name: link.schoolName, province: link.province },
    progress: { devices: p.devices, paid: p.paid },
    seat: view,
    canChangeSchool: link.kind === "student" && canChangeSchool(p, view),
    selfPaid,
    invited: Boolean(link.invitedAt),
  };
}

/** What the share page shows for one link, fresh: its numbers and its school's seat. */
export async function linkView(eventSlug: string, link: ShareLink, self: { id: string; status: string } | null): Promise<ShareLinkView> {
  const { seat, progress } = await syncSchool(eventSlug, link.schoolKey);
  return toView(link, progress.get(link.id) ?? { devices: 0, paid: 0 }, seat, self);
}

/** Which of these schools already have their seat taken (qualified or confirmed). */
export async function schoolsWithSeat(eventSlug: string, keys: string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const { data, error } = await createAdminClient()
    .from("hackathon_school_seats")
    .select("school_key")
    .eq("event_slug", eventSlug)
    .neq("status", "rejected")
    .in("school_key", keys);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.school_key as string));
}

export type NameResult = { ok: true; view: ShareLinkView } | { ok: false; reason: RecipientProblem | "invalid" | "not_allowed" | "taken" };

/**
 * A paid student names a friend, or a teacher names a student, to get the
 * school's seat. Only while staff haven't confirmed it; can be changed until then.
 */
export async function nameRecipient(
  eventSlug: string,
  link: ShareLink,
  self: { id: string; status: string } | null,
  rawCode: string,
): Promise<NameResult> {
  const code = parseShareCode(rawCode);
  if (!code) return { ok: false, reason: "invalid" };
  const { seat, progress } = await syncSchool(eventSlug, link.schoolKey);
  const view = toView(link, progress.get(link.id) ?? { devices: 0, paid: 0 }, seat, self);
  if (!seat || !canNameRecipient(link.kind, view.selfPaid, view.seat)) return { ok: false, reason: "not_allowed" };

  const matches = await registrationsByCode(eventSlug, code);
  const problem = recipientProblem(matches, self?.id ?? null);
  if (problem) return { ok: false, reason: problem };

  const now = new Date().toISOString();
  const { data, error } = await createAdminClient()
    .from("hackathon_school_seats")
    .update({ recipient_registration_id: matches[0].id, recipient_named_at: now, updated_at: now })
    .eq("id", seat.id)
    .eq("link_id", link.id)
    .eq("status", "qualified")
    .select(SEAT_COLUMNS);
  if (error) {
    // One free seat per sign-up: someone else already named this code.
    if (isUniqueViolation(error)) return { ok: false, reason: "taken" };
    throw error;
  }
  if (!data || data.length === 0) return { ok: false, reason: "not_allowed" };
  return { ok: true, view: toView(link, progress.get(link.id)!, toSeat(data[0] as SeatDbRow), self) };
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export type AdminShareLink = ShareLink & {
  progress: LinkProgress;
  /** The seat this link holds, if it qualified first at its school. */
  seat: SchoolSeat | null;
  /** Another link at the same school holds the seat. */
  schoolTaken: boolean;
};

/**
 * Every link with its numbers, for the admin page. Awards any seat a link
 * has earned since anyone last looked, so nothing waits on a student
 * opening their page.
 */
export async function listShareLinksForAdmin(eventSlug: string): Promise<AdminShareLink[]> {
  const db = createAdminClient();
  const [links, seats] = await Promise.all([
    allRows<LinkRow>((from, to) => db.from("hackathon_share_links").select(LINK_COLUMNS).eq("event_slug", eventSlug).order("created_at").range(from, to)).then((rows) => rows.map(toLink)),
    allRows<SeatDbRow>((from, to) => db.from("hackathon_school_seats").select(SEAT_COLUMNS).eq("event_slug", eventSlug).neq("status", "rejected").order("created_at").range(from, to)).then((rows) => rows.map(toSeat)),
  ]);
  const activity = await loadActivity(eventSlug, null);
  const progress = new Map(links.map((l) => [l.id, progressOf(l, activity)]));
  const seatBySchool = new Map(seats.map((s) => [s.schoolKey, s]));

  const bySchool = new Map<string, ShareLink[]>();
  for (const l of links) bySchool.set(l.schoolKey, [...(bySchool.get(l.schoolKey) ?? []), l]);
  for (const [school, list] of bySchool) {
    if (seatBySchool.has(school)) continue;
    const seat = await awardSeat(eventSlug, school, list, progress);
    if (seat) seatBySchool.set(school, seat);
  }

  return links.map((l) => {
    const seat = seatBySchool.get(l.schoolKey) ?? null;
    return { ...l, progress: progress.get(l.id)!, seat: seat?.linkId === l.id ? seat : null, schoolTaken: !!seat && seat.linkId !== l.id };
  });
}

export type DecideSeatResult =
  | { ok: true; becamePaid: boolean; registrationId: string | null }
  | { ok: false; reason: "not_found" | "closed" | "needs_recipient" | "recipient_paid" | "recipient_taken" };

/**
 * Staff decision on a school's seat.
 * - confirm: the seat goes to the named sign-up (or an unpaid student's
 *   own); one seat's price comes off it, and at ฿0 it is paid, with
 *   "free seat" in its note so free seats can be counted apart.
 * - reject: the link is turned down and the school's seat opens again for
 *   the next link there to qualify.
 */
export async function decideSeat(seatId: string, action: "confirm" | "reject", adminUserId: string): Promise<DecideSeatResult> {
  const db = createAdminClient();
  const { data: seatRow, error } = await db
    .from("hackathon_school_seats")
    .select("id, link_id, status, recipient_registration_id, hackathon_share_links(kind, code, registration_id, school_name, province)")
    .eq("id", seatId)
    .maybeSingle();
  if (error) throw error;
  if (!seatRow) return { ok: false, reason: "not_found" };
  if (seatRow.status !== "qualified") return { ok: false, reason: "closed" };
  const link = (Array.isArray(seatRow.hackathon_share_links) ? seatRow.hackathon_share_links[0] : seatRow.hackathon_share_links) as {
    kind: ShareKind;
    code: string;
    registration_id: string | null;
    school_name: string;
    province: string | null;
  } | null;
  if (!link) return { ok: false, reason: "not_found" };
  const now = new Date().toISOString();
  const decided = { decided_at: now, decided_by: `admin:${adminUserId}`, updated_at: now };

  if (action === "reject") {
    const { data: done, error: e } = await db
      .from("hackathon_school_seats")
      .update({ status: "rejected", ...decided })
      .eq("id", seatId)
      .eq("status", "qualified")
      .select("id");
    if (e) throw e;
    if (!done || done.length === 0) return { ok: false, reason: "closed" };
    const { error: linkError } = await db.from("hackathon_share_links").update({ status: "rejected", updated_at: now }).eq("id", seatRow.link_id);
    if (linkError) throw linkError;
    return { ok: true, becamePaid: false, registrationId: null };
  }

  let ownStatus: string | null = null;
  if (link.kind === "student" && link.registration_id) {
    const { data: own, error: ownError } = await db.from("hackathon_event_registrations").select("status").eq("id", link.registration_id).maybeSingle();
    if (ownError) throw ownError;
    ownStatus = own?.status ?? null;
  }
  const recipientId = seatRecipientId({
    kind: link.kind,
    ownRegistrationId: link.registration_id,
    ownStatus,
    namedRecipientId: seatRow.recipient_registration_id,
  });
  if (!recipientId) return { ok: false, reason: "needs_recipient" };

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
    .from("hackathon_school_seats")
    .update({ status: "confirmed", recipient_registration_id: recipientId, ...decided })
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
  const note = [reg.admin_note, `free seat: school link ${link.kind === "teacher" ? "t" : "share"}-${link.code} at ${where}`]
    .filter(Boolean)
    .join(" · ");
  const { data: updated, error: updateError } = await db
    .from("hackathon_event_registrations")
    .update({
      amount_baht: outcome.amountBaht,
      admin_note: note,
      ...(outcome.paid ? { status: "paid", paid_at: now, paid_by: `admin:${adminUserId}` } : {}),
      updated_at: now,
    })
    .eq("id", recipientId)
    .eq("status", "pending")
    .select("id");
  if (updateError || !updated || updated.length === 0) {
    // The sign-up paid in the meantime: put the seat back as it was.
    await db
      .from("hackathon_school_seats")
      .update({ status: "qualified", recipient_registration_id: seatRow.recipient_registration_id, decided_at: null, decided_by: null, updated_at: now })
      .eq("id", seatId);
    if (updateError) throw updateError;
    return { ok: false, reason: "recipient_paid" };
  }
  return { ok: true, becamePaid: outcome.paid, registrationId: recipientId };
}

/** Staff mark (or unmark) that a teacher's Demo Day invite was sent. */
export async function setTeacherInvited(linkId: string, invited: boolean, adminUserId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { data, error } = await createAdminClient()
    .from("hackathon_share_links")
    .update({ invited_at: invited ? now : null, invited_by: invited ? `admin:${adminUserId}` : null, updated_at: now })
    .eq("id", linkId)
    .eq("kind", "teacher")
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}
