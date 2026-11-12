import { type ApplicationLink, type DiscordIdentity, personOf, type ShiftPerson } from "@/lib/shift/canvas-people";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Canvas owners and teammates as staff know them: nickname from their SHIFT
 * application, and their Discord account and picture. Uses the service role
 * (it reads applications and Discord sign-ins), so callers must check access
 * first (canViewShiftCanvases).
 */
export async function shiftPeople(ids: string[], names: Map<string, string>): Promise<Map<string, ShiftPerson>> {
  if (ids.length === 0) return new Map();
  const db = createAdminClient();
  const [applications, profiles, identities] = await Promise.all([
    db
      .from("shift_applications")
      .select("user_id, nickname, discord_user_id, discord_username, created_at")
      .in("user_id", ids)
      .order("created_at", { ascending: false }),
    db.from("profiles").select("id, avatar_url").in("id", ids),
    // Discord display names are only on the sign-in record; one lookup per person on the page.
    Promise.all(
      ids.map(async (id) => {
        const { data } = await db.auth.admin.getUserById(id);
        const discord = data.user?.identities?.find((i) => i.provider === "discord");
        return [id, (discord?.identity_data ?? null) as DiscordIdentity | null] as const;
      }),
    ),
  ]);
  if (applications.error) throw applications.error;
  if (profiles.error) throw profiles.error;

  // Newest application first, so the first one seen per person is their latest.
  const latest = new Map<string, ApplicationLink>();
  for (const a of applications.data ?? []) if (!latest.has(a.user_id as string)) latest.set(a.user_id as string, a as ApplicationLink);
  const avatars = new Map((profiles.data ?? []).map((p) => [p.id as string, (p.avatar_url as string | null) ?? null]));
  const discord = new Map(identities);

  return new Map(
    ids.map((id) => [
      id,
      personOf({
        userId: id,
        name: names.get(id) ?? "Someone",
        application: latest.get(id) ?? null,
        profileAvatar: avatars.get(id) ?? null,
        identity: discord.get(id) ?? null,
      }),
    ]),
  );
}
