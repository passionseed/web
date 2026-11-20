import { createAdminClient } from "@/utils/supabase/admin";
import type { Registration } from "@/lib/hackathon/elemental/registration";

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

/** Save a new sign-up and its members. Returns the pay token. */
export async function createRegistration(
  eventSlug: string,
  input: Registration,
  amountBaht: number,
): Promise<{ id: string; payToken: string }> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("hackathon_event_registrations")
    .insert({
      event_slug: eventSlug,
      team_name: input.teamName ?? null,
      member_count: input.members.length,
      amount_baht: amountBaht,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
      contact_line_id: input.contactLineId ?? null,
      // A person alone is matched with a team unless they say otherwise.
      wants_team_matching: input.members.length === 1 ? input.wantsTeamMatching : false,
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

export async function getRegistrationByToken(token: string): Promise<PublicRegistration | null> {
  if (!isPayToken(token)) return null;
  const db = createAdminClient();
  const { data, error } = await db
    .from("hackathon_event_registrations")
    .select(
      "id, status, team_name, member_count, amount_baht, hackathon_event_registration_members(position, nickname, full_name)",
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
    memberNicknames: members.map((m) => m.nickname || m.full_name.split(" ")[0]),
  };
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
export async function recordSlip(
  registrationId: string,
  update: {
    status: "pending" | "review" | "paid";
    slipPath: string;
    slipCheck: unknown;
    transRef?: string;
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
      paid_by: update.status === "paid" ? "slipok" : null,
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
