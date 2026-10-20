import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

import type { BoardViewer, Round } from "@/lib/shift/alumniBoard";

/**
 * Shared pieces for the alumni board: who is looking, the current round and
 * display names. Board tables are admin-only under RLS (minors), so reads and
 * writes use the service role after the caller's own access checks.
 */

export const db = () => createAdminClient();

export const nowIso = () => new Date().toISOString();

/** Supabase returns "+00:00" offsets; filters get plain UTC ISO strings. */
export const utc = (iso: string) => new Date(iso).toISOString();

export type BoardAccess =
  | { kind: "signedOut" }
  /** Signed in but never joined the alumni (no RSVP yet). */
  | { kind: "notMember"; userId: string }
  | { kind: "declined"; userId: string }
  | { kind: "ok"; viewer: BoardViewer };

/**
 * Any alumni record works, pending included, so nobody waits for an admin to
 * start building; declined accounts stay out. Admins are mentors.
 */
export async function getBoardAccess(): Promise<BoardAccess> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "signedOut" };

  const [{ data: roles }, { data: member, error }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").limit(1),
    db().from("shift_alumni_members").select("nickname, status, team_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (error) throw error;

  if (roles?.length) {
    const name = member?.nickname ?? (await profileNames([user.id]))[user.id] ?? "Mentor";
    return { kind: "ok", viewer: { userId: user.id, name, role: "mentor", teamId: member?.team_id ?? null } };
  }
  if (!member) return { kind: "notMember", userId: user.id };
  if (member.status === "declined") return { kind: "declined", userId: user.id };
  return {
    kind: "ok",
    viewer: { userId: user.id, name: member.nickname, role: "student", teamId: member.team_id ?? null },
  };
}

/** The newest round, made on first use so the board works before an admin starts one. */
export async function currentRound(): Promise<Round> {
  const { data, error } = await db()
    .from("shift_alumni_rounds")
    .select("id, started_at")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as Round;
  const { data: created, error: insertError } = await db()
    .from("shift_alumni_rounds")
    .insert({})
    .select("id, started_at")
    .single();
  if (insertError) throw insertError;
  return created as Round;
}

/** Any action on the board counts as activity for the mentor's "quiet" flag. */
export async function touch(userId: string): Promise<void> {
  await db().from("shift_alumni_members").update({ last_active_at: nowIso() }).eq("user_id", userId);
}

async function profileNames(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { data } = await db().from("profiles").select("id, full_name").in("id", userIds);
  const out: Record<string, string> = {};
  for (const p of data ?? []) if (p.full_name) out[p.id as string] = p.full_name as string;
  return out;
}

/** Alumni nickname, else the profile name (mentors), else "Mentor". */
export async function displayNames(userIds: string[]): Promise<Record<string, string>> {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return {};
  const { data, error } = await db().from("shift_alumni_members").select("user_id, nickname").in("user_id", ids);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const m of data ?? []) out[m.user_id as string] = m.nickname as string;
  const missing = ids.filter((id) => !out[id]);
  const profiles = await profileNames(missing);
  for (const id of missing) out[id] = profiles[id] ?? "Mentor";
  return out;
}

/** Counts rows per user_id. */
export function countBy<T extends { user_id: string }>(rows: T[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.user_id] = (out[r.user_id] ?? 0) + 1;
  return out;
}
