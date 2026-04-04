import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function isInviteEnabled(): Promise<boolean> {
  const { data } = await getClient()
    .from("hackathon_feature_flags")
    .select("enabled")
    .eq("key", "team_invite")
    .single();
  return data?.enabled ?? false;
}

export async function setInviteEnabled(enabled: boolean): Promise<void> {
  await getClient()
    .from("hackathon_feature_flags")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("key", "team_invite");
}

export async function getExistingInvite(teamId: string) {
  const { data } = await getClient()
    .from("hackathon_team_invites")
    .select("*")
    .eq("team_id", teamId)
    .eq("used", false)
    .single();
  return data ?? null;
}

export async function teamAlreadyUsedInvite(teamId: string): Promise<boolean> {
  const { data } = await getClient()
    .from("hackathon_team_invites")
    .select("id")
    .eq("team_id", teamId)
    .eq("used", true)
    .single();
  return !!data;
}

export async function createInvite(teamId: string) {
  const token = crypto.randomBytes(24).toString("hex");
  const { data, error } = await getClient()
    .from("hackathon_team_invites")
    .insert({ team_id: teamId, token })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTeamInvites(teamId: string) {
  await getClient()
    .from("hackathon_team_invites")
    .delete()
    .eq("team_id", teamId);
}

export type InviteWithTeam = {
  id: string;
  team_id: string;
  token: string;
  used: boolean;
  team: { id: string; name: string; member_count: number };
};

export async function getInviteByToken(token: string): Promise<InviteWithTeam | null> {
  const { data: invite } = await getClient()
    .from("hackathon_team_invites")
    .select("*")
    .eq("token", token)
    .eq("used", false)
    .single();

  if (!invite) return null;

  const { data: members } = await getClient()
    .from("hackathon_team_members")
    .select("participant_id")
    .eq("team_id", invite.team_id);

  const { data: team } = await getClient()
    .from("hackathon_teams")
    .select("id, name")
    .eq("id", invite.team_id)
    .single();

  if (!team) return null;

  return {
    ...invite,
    team: { id: team.id, name: team.name, member_count: members?.length ?? 0 },
  };
}

/** Atomically claims the invite. Returns false if already used (race condition guard). */
export async function claimInvite(token: string): Promise<boolean> {
  const { data } = await getClient()
    .from("hackathon_team_invites")
    .update({ used: true })
    .eq("token", token)
    .eq("used", false)
    .select("id");
  return Array.isArray(data) && data.length > 0;
}

export async function isInvitedMember(participantId: string): Promise<boolean> {
  const { data } = await getClient()
    .from("hackathon_team_invites")
    .select("id")
    .eq("used_by", participantId)
    .single();
  return !!data;
}
