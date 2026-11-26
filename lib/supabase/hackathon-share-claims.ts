import { freeSeatOutcome, SHARE, shareCode } from "@/lib/hackathon/elemental/share";
import { createAdminClient } from "@/utils/supabase/admin";

import { isPayToken, type RegistrationStatus } from "./hackathon-event-registrations";

/**
 * Free seats for sharing the poster in a school group (hackathon_share_claims).
 * Service role only: the share page holds a pay token, the admin page calls
 * requireAdmin() first.
 */

export type ShareClaimStatus = "held" | "sent" | "won" | "released";

export type ShareClaim = {
  id: string;
  registrationId: string;
  code: string;
  schoolKey: string;
  schoolName: string;
  province: string | null;
  status: ShareClaimStatus;
  heldUntil: string;
  sentAt: string | null;
  decidedAt: string | null;
  createdAt: string;
};

type Row = {
  id: string;
  registration_id: string;
  code: string;
  school_key: string;
  school_name: string;
  province: string | null;
  status: ShareClaimStatus;
  held_until: string;
  sent_at: string | null;
  decided_at: string | null;
  created_at: string;
};

const COLUMNS = "id, registration_id, code, school_key, school_name, province, status, held_until, sent_at, decided_at, created_at";

const toClaim = (r: Row): ShareClaim => ({
  id: r.id,
  registrationId: r.registration_id,
  code: r.code,
  schoolKey: r.school_key,
  schoolName: r.school_name,
  province: r.province,
  status: r.status,
  heldUntil: r.held_until,
  sentAt: r.sent_at,
  decidedAt: r.decided_at,
  createdAt: r.created_at,
});

/** What the share page needs about a sign-up, found by its pay token. */
export type ShareContext = {
  id: string;
  status: RegistrationStatus;
  amountBaht: number;
  memberCount: number;
  /** The school typed at sign-up, to start the search with. */
  school: string | null;
};

export async function getShareContext(token: string): Promise<ShareContext | null> {
  if (!isPayToken(token)) return null;
  const { data, error } = await createAdminClient()
    .from("hackathon_event_registrations")
    .select("id, status, amount_baht, member_count, hackathon_event_registration_members(position, school)")
    .eq("pay_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const first = [...(data.hackathon_event_registration_members ?? [])].sort((a, b) => a.position - b.position)[0];
  return {
    id: data.id,
    status: data.status as RegistrationStatus,
    amountBaht: data.amount_baht,
    memberCount: data.member_count,
    school: first?.school ?? null,
  };
}

/** Holds older than 24 hours with no screenshot sent go back to the pool. */
export async function releaseExpiredHolds(eventSlug: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("hackathon_share_claims")
    .update({ status: "released", updated_at: new Date().toISOString() })
    .eq("event_slug", eventSlug)
    .eq("status", "held")
    .lt("held_until", new Date().toISOString());
  if (error) throw error;
}

/** The sign-up's current claim (held, sent or won), if any. */
export async function getLiveClaim(registrationId: string): Promise<ShareClaim | null> {
  const { data, error } = await createAdminClient()
    .from("hackathon_share_claims")
    .select(COLUMNS)
    .eq("registration_id", registrationId)
    .neq("status", "released")
    .maybeSingle();
  if (error) throw error;
  return data ? toClaim(data as Row) : null;
}

/** Free seats not yet held, sent or won. */
export async function seatsLeft(eventSlug: string): Promise<number> {
  const { count, error } = await createAdminClient()
    .from("hackathon_share_claims")
    .select("id", { count: "exact", head: true })
    .eq("event_slug", eventSlug)
    .neq("status", "released");
  if (error) throw error;
  return Math.max(0, SHARE.seats - (count ?? 0));
}

/** Which of these schools someone already holds or won. */
export async function takenSchools(eventSlug: string, keys: string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const { data, error } = await createAdminClient()
    .from("hackathon_share_claims")
    .select("school_key")
    .eq("event_slug", eventSlug)
    .neq("status", "released")
    .in("school_key", keys);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.school_key as string));
}

export type ClaimResult =
  | { ok: true; claim: ShareClaim }
  | { ok: false; reason: "taken" | "full" | "already" };

/** Hold a school for this sign-up. The unique indexes make "one per school" hold even when two people click at once. */
export async function claimSchool(
  eventSlug: string,
  registrationId: string,
  school: { key: string; name: string; province: string | null },
): Promise<ClaimResult> {
  await releaseExpiredHolds(eventSlug);
  if ((await seatsLeft(eventSlug)) <= 0) return { ok: false, reason: "full" };
  const heldUntil = new Date(Date.now() + SHARE.holdHours * 3600_000).toISOString();
  const { data, error } = await createAdminClient()
    .from("hackathon_share_claims")
    .insert({
      event_slug: eventSlug,
      registration_id: registrationId,
      code: shareCode(registrationId),
      school_key: school.key,
      school_name: school.name,
      province: school.province,
      held_until: heldUntil,
    })
    .select(COLUMNS)
    .single();
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, reason: error.message.includes("registration_live") ? "already" : "taken" };
    }
    throw error;
  }
  return { ok: true, claim: toClaim(data as Row) };
}

/** The sharer says the screenshot is sent: the hold stops running out while an admin checks. */
export async function markClaimSent(registrationId: string): Promise<ShareClaim | null> {
  const now = new Date().toISOString();
  const { data, error } = await createAdminClient()
    .from("hackathon_share_claims")
    .update({ status: "sent", sent_at: now, updated_at: now })
    .eq("registration_id", registrationId)
    .eq("status", "held")
    .gte("held_until", now)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data ? toClaim(data as Row) : null;
}

/** The sharer picked the wrong school: let it go while it's only held. */
export async function releaseOwnHold(registrationId: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("hackathon_share_claims")
    .update({ status: "released", updated_at: new Date().toISOString() })
    .eq("registration_id", registrationId)
    .eq("status", "held")
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** Whether a poster code belongs to someone who has claimed a school (any status). */
export async function shareCodeExists(code: string): Promise<boolean> {
  const { count, error } = await createAdminClient()
    .from("hackathon_share_claims")
    .select("id", { count: "exact", head: true })
    .eq("code", code);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Every claim for the admin page, newest first. */
export async function listShareClaims(eventSlug: string): Promise<ShareClaim[]> {
  const { data, error } = await createAdminClient()
    .from("hackathon_share_claims")
    .select(COLUMNS)
    .eq("event_slug", eventSlug)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((r) => toClaim(r as Row));
}

export type DecideResult =
  | { ok: true; becamePaid: boolean; registrationId: string }
  | { ok: false; reason: "not_found" | "closed" | "full" | "not_pending" };

/**
 * Admin decision on a claim.
 * - approve: the claim is won, and one seat's price comes off the sign-up.
 *   At ฿0 the sign-up is paid, with "free seat" in its note so free seats
 *   can be counted apart. Only a sign-up that hasn't paid can get one.
 * - reject: the school goes back to the pool.
 */
export async function decideShareClaim(
  id: string,
  action: "approve" | "reject",
  adminUserId: string,
): Promise<DecideResult> {
  const db = createAdminClient();
  const { data: claim, error } = await db
    .from("hackathon_share_claims")
    .select("id, event_slug, registration_id, school_name, province, status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!claim) return { ok: false, reason: "not_found" };
  if (claim.status !== "held" && claim.status !== "sent") return { ok: false, reason: "closed" };
  const now = new Date().toISOString();
  const decided = { decided_at: now, decided_by: `admin:${adminUserId}`, updated_at: now };

  if (action === "reject") {
    const { error: e } = await db.from("hackathon_share_claims").update({ status: "released", ...decided }).eq("id", id);
    if (e) throw e;
    return { ok: true, becamePaid: false, registrationId: claim.registration_id };
  }

  const { count, error: countError } = await db
    .from("hackathon_share_claims")
    .select("id", { count: "exact", head: true })
    .eq("event_slug", claim.event_slug)
    .eq("status", "won");
  if (countError) throw countError;
  if ((count ?? 0) >= SHARE.seats) return { ok: false, reason: "full" };

  const { data: reg, error: regError } = await db
    .from("hackathon_event_registrations")
    .select("status, amount_baht, member_count, admin_note")
    .eq("id", claim.registration_id)
    .maybeSingle();
  if (regError) throw regError;
  if (!reg) return { ok: false, reason: "not_found" };
  // A slip waiting for a check means they have paid: no free seat on top (no refunds).
  if (reg.status !== "pending") return { ok: false, reason: "not_pending" };

  const outcome = freeSeatOutcome(reg.amount_baht, reg.member_count);
  const where = claim.province ? `${claim.school_name}, ${claim.province}` : claim.school_name;
  const note = [reg.admin_note, `free seat: shared in ${where}`].filter(Boolean).join(" · ");
  const { data: updated, error: updateError } = await db
    .from("hackathon_event_registrations")
    .update({
      amount_baht: outcome.amountBaht,
      admin_note: note,
      ...(outcome.paid ? { status: "paid", paid_at: now, paid_by: `admin:${adminUserId}` } : {}),
      updated_at: now,
    })
    .eq("id", claim.registration_id)
    .eq("status", "pending")
    .select("id");
  if (updateError) throw updateError;
  if (!updated || updated.length === 0) return { ok: false, reason: "not_pending" };

  const { error: wonError } = await db.from("hackathon_share_claims").update({ status: "won", ...decided }).eq("id", id);
  if (wonError) throw wonError;
  return { ok: true, becamePaid: outcome.paid, registrationId: claim.registration_id };
}
