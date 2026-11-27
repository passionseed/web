import { createAdminClient } from "@/utils/supabase/admin";
import { INVITE_CODE_RE, type Registration } from "@/lib/hackathon/elemental/registration";
import {
  BUDDY_PASS_CODE_RE,
  buddyPassState,
  holdsBuddyPass,
  parseBuddyOwe,
  type BuddyOwe,
  type BuddyPassState,
} from "@/lib/hackathon/elemental/buddy-pass";
import type { AudienceRow } from "@/lib/hackathon/elemental/audience";
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
  /** 0 for the person who started the team, 1 for the next to sign up, and so on. Null when alone. */
  teamPosition: number | null;
  /** Signed in with Discord from this page, which links the sign-up to a PassionSeed account. */
  discordLinked: boolean;
  /** The bot put them in the hackathon Discord server with the event role. */
  discordJoined: boolean;
  /** The pass this sign-up holds, if it is a solo sign-up at the solo price. */
  buddyPass: PublicBuddyPass | null;
  /** First name of whoever's pass this sign-up used. */
  buddyOf: { name: string; owe: BuddyOwe } | null;
  /** Signed up on a friend's buddy pass (true even if that friend's sign-up can no longer be read). */
  onBuddyPass: boolean;
  createdAt: string;
};

/**
 * A pass as its holder sees it. The code is only here once the holder has
 * paid; before that the pass is "locked". The friend shows by first name only.
 */
export type PublicBuddyPass =
  | { state: "locked" }
  | { state: "available"; code: string }
  | { state: "claimed" | "paid"; code: string; friendName: string; owe: BuddyOwe };

/**
 * A pass as the sign-up form sees it, looked up by its code. The contacts
 * stay on the server (the route compares them); pages pass on the rest.
 */
export type BuddyPassLookup = {
  state: BuddyPassState;
  registrationId: string | null;
  senderName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
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
  /** Discord linked from the sign-up page, and whether the bot got them into the server. */
  discord: { username: string | null; joinedAt: string | null; error: string | null } | null;
  /** On a friend's sign-up: the registration whose buddy pass it used. */
  buddyPassFromId: string | null;
  buddyPassOwe: string | null;
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

type MemberName = { position: number; nickname: string | null; full_name: string };
const leadName = (members: MemberName[] | null | undefined) => {
  const m = [...(members ?? [])].sort((a, b) => a.position - b.position)[0];
  return m ? firstName(m) : "";
};

/** The friend's sign-up that holds a registration's pass, if any. */
async function loadBuddyClaim(registrationId: string) {
  const { data, error } = await createAdminClient()
    .from("hackathon_event_registrations")
    .select("status, buddy_pass_owe, hackathon_event_registration_members(position, nickname, full_name)")
    .eq("buddy_pass_from_registration_id", registrationId)
    .neq("status", "cancelled")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Look up a pass by its code, for the sign-up form and the API route. */
export async function getBuddyPass(eventSlug: string, code: string): Promise<BuddyPassLookup> {
  const none: BuddyPassLookup = { state: "invalid", registrationId: null, senderName: null, contactEmail: null, contactPhone: null };
  if (!BUDDY_PASS_CODE_RE.test(code)) return none;
  const { data, error } = await createAdminClient()
    .from("hackathon_event_registrations")
    .select(
      "id, status, member_count, amount_baht, team_id, buddy_pass_from_registration_id, contact_email, contact_phone, hackathon_event_registration_members(position, nickname, full_name)",
    )
    .eq("event_slug", eventSlug)
    .eq("buddy_pass_code", code)
    .maybeSingle();
  if (error) throw error;
  if (!data) return none;
  const sender = {
    status: data.status as RegistrationStatus,
    memberCount: data.member_count,
    amountBaht: data.amount_baht,
    teamId: data.team_id,
    fromRegistrationId: data.buddy_pass_from_registration_id,
  };
  const claimed = data.status === "paid" ? Boolean(await loadBuddyClaim(data.id)) : false;
  return {
    state: buddyPassState(sender, claimed),
    registrationId: data.id,
    senderName: leadName(data.hackathon_event_registration_members) || null,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
  };
}

/** Postgres unique violation: a second friend lost the race for a pass. */
export function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "23505";
}

/**
 * team_joined_at arrives with a migration, and production is the first
 * database to get it. Until then Postgres (42703) or PostgREST (PGRST204)
 * says the column is unknown, and the app reads and writes without it.
 */
function isMissingColumn(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "42703" || code === "PGRST204";
}

async function withJoinedAt<R extends { error: unknown }>(run: (joinedAt: boolean) => PromiseLike<R>): Promise<R> {
  const first = await run(true);
  return first.error && isMissingColumn(first.error) ? run(false) : first;
}

/**
 * When a sign-up joined its team: when it joined from its own page, or when
 * it was made (on the team's link). Order a team by this, so the person who
 * started it stays first when an older solo sign-up joins later.
 */
const joinedTeamAt = (r: { created_at: string; team_joined_at?: string | null }) => Date.parse(r.team_joined_at ?? r.created_at);

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

type TeamRow = {
  id: string;
  name: string;
  invite_code: string;
  hackathon_event_registrations:
    | {
        status: string;
        member_count: number;
        created_at: string;
        team_joined_at?: string | null;
        hackathon_event_registration_members: MemberName[] | null;
      }[]
    | null;
};

/** A team and its sign-ups that aren't cancelled, in the order they joined. */
async function loadTeam(
  filter: { inviteCode: string; eventSlug: string } | { id: string },
  maxSize: number,
): Promise<PublicTeam | null> {
  const db = createAdminClient();
  const { data: row, error } = await withJoinedAt((joinedAt) => {
    const query = db
      .from("hackathon_event_teams")
      .select(
        `id, name, invite_code, hackathon_event_registrations(${joinedAt ? "team_joined_at, " : ""}status, member_count, created_at, hackathon_event_registration_members(position, nickname, full_name))`,
      );
    return (
      "id" in filter
        ? query.eq("id", filter.id)
        : query.eq("invite_code", filter.inviteCode).eq("event_slug", filter.eventSlug)
    ).maybeSingle();
  });
  if (error) throw error;
  const data = row as unknown as TeamRow | null;
  if (!data) return null;

  const regs = (data.hackathon_event_registrations ?? [])
    .filter((r) => r.status !== "cancelled")
    .sort((a, b) => joinedTeamAt(a) - joinedTeamAt(b));
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
  buddy: { fromRegistrationId: string; owe: BuddyOwe } | null = null,
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
      buddy_pass_from_registration_id: buddy?.fromRegistrationId ?? null,
      buddy_pass_owe: buddy?.owe ?? null,
      no_refund_ack: input.noRefundAck,
      contact_after_consent: input.contactAfterConsent,
      source: input.source ?? null,
      heard_from: input.heardFrom ?? null,
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
      "id, status, team_id, team_name, member_count, amount_baht, created_at, linked_at, discord_joined_at, buddy_pass_code, buddy_pass_from_registration_id, buddy_pass_owe, hackathon_event_registration_members(position, nickname, full_name)",
    )
    .eq("pay_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const members = [...(data.hackathon_event_registration_members ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const teamPosition = data.team_id ? await positionInTeam(data.team_id, data.id) : null;
  return {
    id: data.id,
    status: data.status as RegistrationStatus,
    teamName: data.team_name,
    memberCount: data.member_count,
    amountBaht: data.amount_baht,
    memberNicknames: members.map(firstName),
    team: data.team_id ? await loadTeam({ id: data.team_id }, maxTeamSize) : null,
    isTeamStarter: teamPosition === 0,
    teamPosition,
    discordLinked: Boolean(data.linked_at),
    discordJoined: Boolean(data.discord_joined_at),
    buddyPass: await loadOwnBuddyPass(data),
    buddyOf: data.buddy_pass_from_registration_id
      ? await loadBuddySender(data.buddy_pass_from_registration_id, data.buddy_pass_owe)
      : null,
    onBuddyPass: Boolean(data.buddy_pass_from_registration_id),
    createdAt: data.created_at,
  };
}

async function loadOwnBuddyPass(r: {
  id: string;
  status: string;
  member_count: number;
  amount_baht: number;
  team_id: string | null;
  buddy_pass_code: string | null;
  buddy_pass_from_registration_id: string | null;
}): Promise<PublicBuddyPass | null> {
  const sender = {
    status: r.status as RegistrationStatus,
    memberCount: r.member_count,
    amountBaht: r.amount_baht,
    teamId: r.team_id,
    fromRegistrationId: r.buddy_pass_from_registration_id,
  };
  if (!r.buddy_pass_code || r.status === "cancelled" || !holdsBuddyPass(sender)) return null;
  // Never hand out the code before the holder has paid.
  if (r.status !== "paid") return { state: "locked" };
  const claim = await loadBuddyClaim(r.id);
  if (!claim) return { state: "available", code: r.buddy_pass_code };
  return {
    state: claim.status === "paid" ? "paid" : "claimed",
    code: r.buddy_pass_code,
    friendName: leadName(claim.hackathon_event_registration_members),
    owe: parseBuddyOwe(claim.buddy_pass_owe),
  };
}

async function loadBuddySender(id: string, owe: string | null): Promise<{ name: string; owe: BuddyOwe } | null> {
  const { data, error } = await createAdminClient()
    .from("hackathon_event_registrations")
    .select("hackathon_event_registration_members(position, nickname, full_name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { name: leadName(data.hackathon_event_registration_members), owe: parseBuddyOwe(owe) };
}

/** Where a sign-up falls in the order its team was joined (0 = started the team, or has been in it longest). */
async function positionInTeam(teamId: string, registrationId: string): Promise<number | null> {
  const db = createAdminClient();
  const { data, error } = await withJoinedAt((joinedAt) =>
    db
      .from("hackathon_event_registrations")
      .select(joinedAt ? "id, created_at, team_joined_at" : "id, created_at")
      .eq("team_id", teamId),
  );
  if (error) throw error;
  const rows = ((data ?? []) as unknown as { id: string; created_at: string; team_joined_at?: string | null }[]).sort(
    (a, b) => joinedTeamAt(a) - joinedTeamAt(b),
  );
  const i = rows.findIndex((r) => r.id === registrationId);
  return i === -1 ? null : i;
}

/**
 * Put a sign-up in a team, or take it out (team: null), from its own page.
 * The amount is saved only while the sign-up is still unpaid, so a slip that
 * passed a moment ago keeps what it paid.
 */
export async function setRegistrationTeam(
  registrationId: string,
  team: { id: string; name: string } | null,
  amountBaht: number,
): Promise<void> {
  const db = createAdminClient();
  const { error } = await withJoinedAt((joinedAt) =>
    db
      .from("hackathon_event_registrations")
      .update({
        team_id: team?.id ?? null,
        team_name: team?.name ?? null,
        ...(joinedAt ? { team_joined_at: team ? new Date().toISOString() : null } : {}),
      })
      .eq("id", registrationId)
      .neq("status", "cancelled"),
  );
  if (error) throw error;
  const { error: amountError } = await db
    .from("hackathon_event_registrations")
    .update({ amount_baht: amountBaht })
    .eq("id", registrationId)
    .eq("status", "pending");
  if (amountError) throw amountError;
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
    discord: r.linked_at
      ? { username: r.discord_username, joinedAt: r.discord_joined_at, error: r.discord_error }
      : null,
    buddyPassFromId: r.buddy_pass_from_registration_id ?? null,
    buddyPassOwe: r.buddy_pass_owe ?? null,
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

/**
 * Admin decision on a registration: mark paid, send back to pending, or cancel.
 * Returns true when this call turned an unpaid sign-up into a paid one.
 */
export async function setRegistrationStatus(
  id: string,
  status: RegistrationStatus,
  adminUserId: string,
  note?: string,
): Promise<boolean> {
  const db = createAdminClient();
  const { data: before } = await db
    .from("hackathon_event_registrations")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  const { error } = await db
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
  return status === "paid" && before?.status !== "paid";
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

/** What a "paid" Discord ping shows: first names, team, group size and amount. */
export async function getRegistrationForNotice(id: string): Promise<{
  status: RegistrationStatus;
  names: string[];
  memberCount: number;
  amountBaht: number;
  teamName: string | null;
} | null> {
  const { data, error } = await createAdminClient()
    .from("hackathon_event_registrations")
    .select("status, team_name, member_count, amount_baht, hackathon_event_registration_members(position, nickname, full_name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    status: data.status as RegistrationStatus,
    names: [...(data.hackathon_event_registration_members ?? [])]
      .sort((a, b) => a.position - b.position)
      .map(firstName),
    memberCount: data.member_count,
    amountBaht: data.amount_baht,
    teamName: data.team_name,
  };
}

/** Every sign-up with its members' ages, for the admin audience charts. Pages past Supabase's 1000-row cap. */
export async function listAudienceRows(eventSlug: string): Promise<AudienceRow[]> {
  const db = createAdminClient();
  const PAGE = 1000;
  const out: AudienceRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("hackathon_event_registrations")
      .select("id, status, source, heard_from, hackathon_event_registration_members(age)")
      .eq("event_slug", eventSlug)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) {
      const members = (r.hackathon_event_registration_members ?? []) as { age: number }[];
      out.push({ status: r.status, source: r.source, heardFrom: r.heard_from, ages: members.map((m) => m.age) });
    }
    if (!data || data.length < PAGE) return out;
  }
}
