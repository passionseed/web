import { createAdminClient } from "@/utils/supabase/admin";
import { INVITE_CODE_RE, type Registration } from "@/lib/hackathon/elemental/registration";
import type { RegistrationTotalsRow } from "@/lib/hackathon/elemental/seats";

/**
 * Paid hackathon sign-ups (hackathon_event_registrations). Every call uses
 * the service role: the public pages hold only a pay_token, and the admin
 * pages call requireAdmin() first.
 */

export const SLIP_BUCKET = "hackathon-slips";

export type RegistrationStatus = "pending" | "review" | "paid" | "cancelled";

export type PublicRegistration = {
  id: string;
  status: RegistrationStatus;
  teamName: string | null;
  memberCount: number;
  amountBaht: number;
  memberNicknames: string[];
  team: PublicTeam | null;
  /** Whether this sign-up started its team (the first one on it), so it may rename the team. */
  isTeamStarter: boolean;
  createdAt: string;
};

/** What an invite link shows: the team's name and who is in it (first names only). */
export type PublicTeam = {
  id: string;
  name: string;
  inviteCode: string;
  roster: { name: string; paid: boolean }[];
  /** Seats left before the team reaches ELEMENTAL.maxGroupSize. */
  spotsLeft: number;
};

export type AdminRegistration = {
  id: string;
  status: RegistrationStatus;
  teamName: string | null;
  memberCount: number;
  amountBaht: number;
  contactEmail: string;
  contactPhone: string;
  contactLineId: string | null;
  wantsTeamMatching: boolean;
  contactAfterConsent: boolean;
  source: string | null;
  slipUrl: string | null;
  slipCheck: unknown;
  paidAt: string | null;
  paidBy: string | null;
  adminNote: string | null;
  createdAt: string;
  members: {
    position: number;
    fullName: string;
    nickname: string | null;
    age: number;
    school: string;
    parentName: string | null;
    parentPhone: string | null;
    parentConsent: boolean;
  }[];
};

const TOKEN_RE = /^[0-9a-f]{32}$/;

export function isPayToken(token: string): boolean {
  return TOKEN_RE.test(token);
}

const firstName = (m: { nickname: string | null; full_name: string }) =>
  m.nickname || m.full_name.split(" ")[0];

/** Start a team. Returns its id and invite code. */
export async function createTeam(eventSlug: string, name: string): Promise<{ id: string; inviteCode: string }> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("hackathon_event_teams")
    .insert({ event_slug: eventSlug, name })
    .select("id, invite_code")
    .single();
  if (error || !data) throw error ?? new Error("team insert failed");
  return { id: data.id, inviteCode: data.invite_code };
}

/** A team and its sign-ups that aren't cancelled. */
async function loadTeam(
  filter: { inviteCode: string; eventSlug: string } | { id: string },
  maxSize: number,
): Promise<PublicTeam | null> {
  const db = createAdminClient();
  let query = db
    .from("hackathon_event_teams")
    .select(
      "id, name, invite_code, hackathon_event_registrations(status, member_count, created_at, hackathon_event_registration_members(position, nickname, full_name))",
    );
  query = "id" in filter
    ? query.eq("id", filter.id)
    : query.eq("invite_code", filter.inviteCode).eq("event_slug", filter.eventSlug);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const regs = (data.hackathon_event_registrations ?? [])
    .filter((r) => r.status !== "cancelled")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const roster = regs.flatMap((r) =>
    [...(r.hackathon_event_registration_members ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((m) => ({ name: firstName(m), paid: r.status === "paid" })),
  );
  const seats = regs.reduce((n, r) => n + r.member_count, 0);
  return {
    id: data.id,
    name: data.name,
    inviteCode: data.invite_code,
    roster,
    spotsLeft: Math.max(0, maxSize - seats),
  };
}

export async function getTeamByInviteCode(
  eventSlug: string,
  inviteCode: string,
  maxSize: number,
): Promise<PublicTeam | null> {
  if (!INVITE_CODE_RE.test(inviteCode)) return null;
  return loadTeam({ inviteCode, eventSlug }, maxSize);
}

/** Save a new sign-up and its members. Returns the pay token. */
export async function createRegistration(
  eventSlug: string,
  input: Registration,
  amountBaht: number,
  team: { id: string; name: string } | null = null,
): Promise<{ id: string; payToken: string }> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("hackathon_event_registrations")
    .insert({
      event_slug: eventSlug,
      team_id: team?.id ?? null,
      team_name: team?.name ?? input.teamName ?? null,
      member_count: input.members.length,
      amount_baht: amountBaht,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
      contact_line_id: input.contactLineId ?? null,
      // A person alone is matched with a team unless they say otherwise.
      wants_team_matching: input.members.length === 1 && !team ? input.wantsTeamMatching : false,
      no_refund_ack: input.noRefundAck,
      contact_after_consent: input.contactAfterConsent,
      source: input.source ?? null,
      utm: input.utm ?? null,
    })
    .select("id, pay_token")
    .single();
  if (error || !data) throw error ?? new Error("insert failed");

  const { error: memberError } = await db.from("hackathon_event_registration_members").insert(
    input.members.map((m, i) => ({
      registration_id: data.id,
      position: i + 1,
      full_name: m.fullName,
      nickname: m.nickname ?? null,
      age: m.age,
      school: m.school,
      parent_name: m.parentName ?? null,
      parent_phone: m.parentPhone ?? null,
      parent_consent: m.parentConsent,
    })),
  );
  if (memberError) {
    await db.from("hackathon_event_registrations").delete().eq("id", data.id);
    throw memberError;
  }
  return { id: data.id, payToken: data.pay_token };
}

export async function getRegistrationByToken(
  token: string,
  maxTeamSize = 5,
): Promise<PublicRegistration | null> {
  if (!isPayToken(token)) return null;
  const db = createAdminClient();
  const { data, error } = await db
    .from("hackathon_event_registrations")
    .select(
      "id, status, team_id, team_name, member_count, amount_baht, created_at, hackathon_event_registration_members(position, nickname, full_name)",
    )
    .eq("pay_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const members = [...(data.hackathon_event_registration_members ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  return {
    id: data.id,
    status: data.status as RegistrationStatus,
    teamName: data.team_name,
    memberCount: data.member_count,
    amountBaht: data.amount_baht,
    memberNicknames: members.map(firstName),
    team: data.team_id ? await loadTeam({ id: data.team_id }, maxTeamSize) : null,
    isTeamStarter: data.team_id ? (await teamStarterId(data.team_id)) === data.id : false,
    createdAt: data.created_at,
  };
}

/** The first sign-up on a team: the person who started it. */
async function teamStarterId(teamId: string): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("hackathon_event_registrations")
    .select("id")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/** Rename a team, and the copy of its name on each of its sign-ups. */
export async function renameTeam(teamId: string, name: string): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.from("hackathon_event_teams").update({ name }).eq("id", teamId);
  if (error) throw error;
  const { error: regError } = await db
    .from("hackathon_event_registrations")
    .update({ team_name: name })
    .eq("team_id", teamId);
  if (regError) throw regError;
}

export async function uploadSlip(file: File, path: string): Promise<void> {
  const { error } = await createAdminClient()
    .storage.from(SLIP_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
}

/**
 * Record the outcome of a slip check. Only a registration that isn't paid
 * yet changes, so two uploads at once can't both win. Returns false when
 * the slip's transaction is already on another registration (unique index).
 */
/**
 * Claim a slip's bank reference for one registration (payment_slip_refs).
 * - "ours": first time we've seen it, or this registration already holds it
 * - "taken": another registration used this slip
 * - "unknown": the check itself failed; never confirm a seat on that
 */
export async function claimSlipRef(
  transRef: string,
  registrationId: string,
  source: string,
  provider: string,
): Promise<"ours" | "taken" | "unknown"> {
  try {
    const db = createAdminClient();
    const { error: insertError } = await db
      .from("payment_slip_refs")
      .upsert(
        { trans_ref: transRef, source, registration_id: registrationId, provider },
        { onConflict: "trans_ref", ignoreDuplicates: true },
      );
    if (insertError) throw insertError;
    const { data, error } = await db
      .from("payment_slip_refs")
      .select("registration_id")
      .eq("trans_ref", transRef)
      .maybeSingle();
    if (error) throw error;
    if (!data) return "unknown";
    return data.registration_id === registrationId ? "ours" : "taken";
  } catch (error) {
    console.error("[hackathon slip] slip reference check failed", error instanceof Error ? error.message : error);
    return "unknown";
  }
}

export async function recordSlip(
  registrationId: string,
  update: {
    status: "pending" | "review" | "paid";
    slipPath: string;
    slipCheck: unknown;
    transRef?: string;
    /** Which checker confirmed the payment: "rdcw" or "slipok". */
    paidBy?: string;
  },
): Promise<"saved" | "already_paid" | "duplicate"> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("hackathon_event_registrations")
    .update({
      status: update.status,
      slip_path: update.slipPath,
      slip_check: update.slipCheck as object,
      slip_trans_ref: update.transRef ?? null,
      paid_at: update.status === "paid" ? new Date().toISOString() : null,
      paid_by: update.status === "paid" ? (update.paidBy ?? "slipok") : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", registrationId)
    .neq("status", "paid")
    .select("id");
  if (error) {
    if ((error as { code?: string }).code === "23505") return "duplicate";
    throw error;
  }
  return data && data.length > 0 ? "saved" : "already_paid";
}

export async function listRegistrations(eventSlug: string): Promise<AdminRegistration[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("hackathon_event_registrations")
    .select("*, hackathon_event_registration_members(*)")
    .eq("event_slug", eventSlug)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;

  const paths = (data ?? []).map((r) => r.slip_path).filter((p): p is string => Boolean(p));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await db.storage.from(SLIP_BUCKET).createSignedUrls(paths, 60 * 60);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    teamName: r.team_name,
    memberCount: r.member_count,
    amountBaht: r.amount_baht,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    contactLineId: r.contact_line_id,
    wantsTeamMatching: r.wants_team_matching,
    contactAfterConsent: r.contact_after_consent,
    source: r.source,
    slipUrl: r.slip_path ? (signed.get(r.slip_path) ?? null) : null,
    slipCheck: r.slip_check,
    paidAt: r.paid_at,
    paidBy: r.paid_by,
    adminNote: r.admin_note,
    createdAt: r.created_at,
    members: [...(r.hackathon_event_registration_members ?? [])]
      .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
      .map((m: Record<string, unknown>) => ({
        position: m.position as number,
        fullName: m.full_name as string,
        nickname: (m.nickname as string | null) ?? null,
        age: m.age as number,
        school: m.school as string,
        parentName: (m.parent_name as string | null) ?? null,
        parentPhone: (m.parent_phone as string | null) ?? null,
        parentConsent: Boolean(m.parent_consent),
      })),
  }));
}

/** Admin decision on a registration: mark paid, send back to pending, or cancel. */
export async function setRegistrationStatus(
  id: string,
  status: RegistrationStatus,
  adminUserId: string,
  note?: string,
): Promise<void> {
  const { error } = await createAdminClient()
    .from("hackathon_event_registrations")
    .update({
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
      paid_by: status === "paid" ? `admin:${adminUserId}` : null,
      ...(note !== undefined ? { admin_note: note } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Totals-only rows for the Elemental progress page: status, group size,
 * tracked link and two timestamps (sign-up and payment) for the per-day pace.
 * No names, contacts or slips leave the database.
 */
export async function listRegistrationTotals(eventSlug: string): Promise<RegistrationTotalsRow[]> {
  const db = createAdminClient();
  const PAGE = 1000;
  const out: RegistrationTotalsRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("hackathon_event_registrations")
      .select("id, status, member_count, source, created_at, paid_at")
      .eq("event_slug", eventSlug)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) {
      out.push({
        status: r.status as RegistrationStatus,
        memberCount: r.member_count,
        source: r.source,
        createdAt: r.created_at ?? null,
        paidAt: r.paid_at ?? null,
      });
    }
    if (!data || data.length < PAGE) return out;
  }
}
