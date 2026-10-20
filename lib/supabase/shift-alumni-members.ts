import { createAdminClient } from "@/utils/supabase/admin";

import type { AlumniMember, AlumniMemberStatus } from "@/lib/shift/alumniMember";

/**
 * Alumni records: which PassionSeed accounts may RSVP to SHIFT alumni
 * sessions, and whether the team has confirmed they finished SHIFT. Admin-only
 * table (minors), so everything goes through the service role.
 */

const MEMBER_COLUMNS = "user_id, nickname, cohort, status, application_id, created_at";

/** A paid SHIFT application already bound to this account via /shift/join. */
export interface LinkedApplication {
  id: string;
  nickname: string;
  cohort: string;
}

export async function getAlumniMember(userId: string): Promise<AlumniMember | null> {
  const { data, error } = await createAdminClient()
    .from("shift_alumni_members")
    .select(MEMBER_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as AlumniMember | null) ?? null;
}

/** The latest paid application linked to the account, if any. */
export async function findLinkedApplication(userId: string): Promise<LinkedApplication | null> {
  const { data, error } = await createAdminClient()
    .from("shift_applications")
    .select("id, nickname, cohort")
    .eq("user_id", userId)
    .not("paid_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as LinkedApplication | null) ?? null;
}

/**
 * First RSVP from an account: confirmed straight away when a paid application
 * is linked to it, pending otherwise. Takes the round from the application,
 * since that one is verified.
 */
export async function createAlumniMember(
  userId: string,
  input: { nickname: string; cohort: string },
): Promise<AlumniMember> {
  const application = await findLinkedApplication(userId);
  const { data, error } = await createAdminClient()
    .from("shift_alumni_members")
    .upsert(
      {
        user_id: userId,
        nickname: input.nickname,
        cohort: application?.cohort ?? input.cohort,
        status: application ? "confirmed" : "pending",
        application_id: application?.id ?? null,
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    )
    .select(MEMBER_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  // A double tap lost the race: the first insert won, read it back.
  return (data as AlumniMember | null) ?? (await getAlumniMember(userId))!;
}

/** Everyone who ever RSVP'd with an account, pending first, for the admin page. */
export async function listAlumniMembers(): Promise<(AlumniMember & { email: string | null; full_name: string | null })[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shift_alumni_members")
    .select(MEMBER_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const members = (data ?? []) as AlumniMember[];
  if (members.length === 0) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .in(
      "id",
      members.map((m) => m.user_id),
    );
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  const rank: Record<AlumniMemberStatus, number> = { pending: 0, confirmed: 1, declined: 2 };
  return members
    .map((m) => ({
      ...m,
      email: (byId.get(m.user_id)?.email as string | null) ?? null,
      full_name: (byId.get(m.user_id)?.full_name as string | null) ?? null,
    }))
    .sort((a, b) => rank[a.status] - rank[b.status]);
}

export async function reviewAlumniMember(
  userId: string,
  status: AlumniMemberStatus,
  reviewerId: string,
): Promise<void> {
  const { error } = await createAdminClient()
    .from("shift_alumni_members")
    .update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}
