import type { SupabaseClient, User } from "@supabase/supabase-js";

import { extractDiscordIdentity } from "@/lib/projectseed/discord";
import { joinShiftGuild, type GuildJoinResult } from "@/lib/shift/discordGuild";
import { cleanHandle } from "@/lib/shift/handles";
import { createAdminClient } from "@/utils/supabase/admin";
import type { ShiftApplicationRow } from "@/types/shift";

/**
 * Server side of the /shift/join link. A paid applicant signs in with Discord
 * and, in one pass, gets bound to:
 *   1. their PassionSeed account (shift_applications.user_id)
 *   2. the admin tracker (shift_students), so admins know who is who
 *   3. the camp cohort with the same name, when one exists
 *   4. the SHIFT Discord server, with roles
 * Every step is idempotent so reopening the link is always safe.
 */

export type ShiftJoinError = "invalid" | "no_discord" | "taken";

type Admin = SupabaseClient;

export async function findShiftApplicationByToken(
  token: string,
  supabase: Admin = createAdminClient(),
): Promise<ShiftApplicationRow | null> {
  const { data } = await supabase
    .from("shift_applications")
    .select("*")
    .eq("join_token", token)
    .maybeSingle();
  return (data as ShiftApplicationRow | null) ?? null;
}

/** A link only works for a row an admin has marked paid. */
export function isJoinable(app: ShiftApplicationRow | null): app is ShiftApplicationRow {
  return Boolean(app?.paid_at);
}

/** Called from /auth/callback right after the Discord OAuth exchange. */
export async function completeShiftJoin(input: {
  token: string;
  user: User;
  providerToken: string | null | undefined;
}): Promise<ShiftJoinError | null> {
  const supabase = createAdminClient();
  const app = await findShiftApplicationByToken(input.token, supabase);
  if (!isJoinable(app)) return "invalid";
  if (app.user_id && app.user_id !== input.user.id) return "taken";

  const discord = extractDiscordIdentity(input.user);
  if (!discord) return "no_discord";

  const { data, error } = await supabase
    .from("shift_applications")
    .update({
      user_id: input.user.id,
      discord_user_id: discord.userId,
      discord_username: discord.username,
      linked_at: app.linked_at ?? new Date().toISOString(),
    })
    .eq("id", app.id)
    // Compare-and-set: two people opening the same link at once cannot both
    // claim it, because only an unclaimed (or already theirs) row matches.
    .or(`user_id.is.null,user_id.eq.${input.user.id}`)
    .select()
    .maybeSingle();
  if (error) {
    console.error("[shift-join] failed to link application:", error.message);
    return "invalid";
  }
  if (!data) return "taken";
  const linked = data as ShiftApplicationRow;

  await upsertTrackerMember(supabase, linked);
  await enrollCampCohort(supabase, linked);
  const accessToken = (await discordTokenOwner(input.providerToken)) === discord.userId ? input.providerToken : null;
  await syncShiftDiscord(linked, accessToken, supabase);
  return null;
}

/**
 * The Discord user an OAuth token belongs to. The bot only acts on a token
 * that provably belongs to the Discord account stored on the application.
 */
async function discordTokenOwner(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const res = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return ((await res.json()) as { id?: string }).id ?? null;
  } catch {
    return null;
  }
}

/** Adds the student to the server (or just grants roles) and records the
 *  outcome on the application so the admin page shows it. */
export async function syncShiftDiscord(
  app: ShiftApplicationRow,
  accessToken?: string | null,
  supabase: Admin = createAdminClient(),
): Promise<GuildJoinResult> {
  if (!app.discord_user_id) {
    return { ok: false, state: "error", message: "Discord not linked" };
  }

  const result = await joinShiftGuild({
    discordUserId: app.discord_user_id,
    cohortName: app.cohort,
    accessToken,
    nickname: app.nickname,
  });

  const update = result.ok
    ? { discord_joined_at: app.discord_joined_at ?? new Date().toISOString(), discord_error: null }
    : { discord_error: result.state === "not_member" ? "not_in_server" : result.message };
  const { error } = await supabase.from("shift_applications").update(update).eq("id", app.id);
  if (error) console.error("[shift-join] failed to record Discord state:", error.message);

  return result;
}

/**
 * One tracker row per application. Reuses a row an admin already added by
 * hand ("Add to tracker" matches on IG) instead of creating a duplicate.
 */
async function upsertTrackerMember(supabase: Admin, app: ShiftApplicationRow) {
  const fields = {
    application_id: app.id,
    full_name: app.full_name,
    ig_handle: cleanHandle(app.ig_handle),
    discord_handle: app.discord_username ?? cleanHandle(app.discord_handle),
    user_id: app.user_id,
    discord_user_id: app.discord_user_id,
  };

  const existing = await findTrackerRow(supabase, app.id, fields.ig_handle);
  const { error } = existing
    ? await supabase.from("shift_students").update(fields).eq("id", existing.id)
    : await supabase.from("shift_students").insert(fields);
  if (error) console.error("[shift-join] failed to upsert tracker member:", error.message);
}

async function findTrackerRow(
  supabase: Admin,
  applicationId: string,
  igHandle: string | null,
): Promise<{ id: string } | null> {
  const { data: byApplication } = await supabase
    .from("shift_students")
    .select("id")
    .eq("application_id", applicationId)
    .maybeSingle();
  if (byApplication || !igHandle) return byApplication;

  const { data: byHandle } = await supabase
    .from("shift_students")
    .select("id, ig_handle")
    .is("application_id", null);
  const wanted = igHandle.toLowerCase();
  return (byHandle ?? []).find((row) => cleanHandle(row.ig_handle)?.toLowerCase() === wanted) ?? null;
}

interface CampCohort {
  id: string;
  name: string;
  classroom_id: string;
  community_id: string;
  map_id: string;
}

/** The camp cohort named exactly like the round ("SHIFT[2]"). Dates are not
 *  used: hand-made camp cohorts can span more than one round. */
function campCohortForRound(cohorts: CampCohort[], roundName: string): CampCohort | null {
  return cohorts.find((c) => c.name === roundName) ?? null;
}

async function loadCampCohorts(supabase: Admin): Promise<CampCohort[]> {
  const { data } = await supabase
    .from("shift_camp_cohorts")
    .select("id, name, classroom_id, community_id, map_id")
    .order("starts_on", { ascending: false });
  return (data ?? []) as CampCohort[];
}

/**
 * Enrolls every linked, paid student in their round's camp cohort. Run after
 * a camp cohort is created, so students who linked Discord before the camp
 * existed still get daily updates. Idempotent.
 */
export async function enrollLinkedStudents(supabase: Admin = createAdminClient()): Promise<number> {
  const [cohorts, { data: apps }] = await Promise.all([
    loadCampCohorts(supabase),
    supabase.from("shift_applications").select("*").not("user_id", "is", null).not("paid_at", "is", null),
  ]);
  let enrolled = 0;
  for (const app of (apps ?? []) as ShiftApplicationRow[]) {
    if (await enrollCampCohort(supabase, app, cohorts)) enrolled += 1;
  }
  return enrolled;
}

/**
 * Mirrors the admin `enroll` camp action. Best effort: no matching camp
 * cohort just means the camp is not set up yet.
 */
async function enrollCampCohort(
  supabase: Admin,
  app: ShiftApplicationRow,
  cohorts?: CampCohort[],
): Promise<boolean> {
  if (!app.user_id) return false;
  const cohort = campCohortForRound(cohorts ?? (await loadCampCohorts(supabase)), app.cohort);
  if (!cohort) return false;

  const userId = app.user_id;
  const results = await Promise.all([
    supabase
      .from("shift_camp_enrollments")
      .upsert({ cohort_id: cohort.id, user_id: userId, role: "participant" }, {
        onConflict: "cohort_id,user_id",
        ignoreDuplicates: true,
      }),
    supabase
      .from("classroom_memberships")
      .upsert({ classroom_id: cohort.classroom_id, user_id: userId, role: "student" }, {
        onConflict: "classroom_id,user_id",
        ignoreDuplicates: true,
      }),
    supabase
      .from("user_communities")
      .upsert({ community_id: cohort.community_id, user_id: userId, role: "member" }, {
        onConflict: "user_id,community_id",
        ignoreDuplicates: true,
      }),
    supabase
      .from("user_map_enrollments")
      .upsert({ user_id: userId, map_id: cohort.map_id }, {
        onConflict: "user_id,map_id",
        ignoreDuplicates: true,
      }),
  ]);
  const failed = results.filter(({ error }) => error);
  for (const { error } of failed) {
    console.error("[shift-join] camp enrollment step failed:", error?.message);
  }
  return failed.length === 0;
}
