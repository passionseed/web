import { createClient } from "@supabase/supabase-js";
import { SESSION_EXPIRY_DAYS } from "./auth";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type HackathonParticipant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  university: string;
  role: string;
  track: string;
  grade_level: string;
  experience_level: number;
  referral_source: string;
  bio: string;
  team_name: string | null;
  created_at: string;
};

export async function findParticipantByEmail(email: string) {
  const { data } = await getClient()
    .from("hackathon_participants")
    .select("*")
    .eq("email", email.toLowerCase())
    .single();
  return data;
}

export async function createParticipant(params: {
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  university: string;
  role: string;
  track: string;
  grade_level: string;
  experience_level: number;
  referral_source: string;
  bio: string;
  team_name?: string;
}) {
  const { data, error } = await getClient()
    .from("hackathon_participants")
    .insert({
      ...params,
      email: params.email.toLowerCase(),
      team_name: params.team_name || null,
    })
    .select("id, name, email, phone, university, role, track, grade_level, experience_level, referral_source, bio, team_name, created_at")
    .single();
  if (error) throw error;
  return data as HackathonParticipant;
}

export async function createSession(participantId: string, token: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  const { error } = await getClient().from("hackathon_sessions").insert({
    participant_id: participantId,
    token,
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw error;
}

export async function getSessionParticipant(token: string): Promise<HackathonParticipant | null> {
  const now = new Date().toISOString();
  const { data } = await getClient()
    .from("hackathon_sessions")
    .select("expires_at, hackathon_participants(id, name, email, phone, university, role, track, grade_level, experience_level, referral_source, bio, team_name, created_at)")
    .eq("token", token)
    .gt("expires_at", now)
    .single();

  if (!data) return null;
  return data.hackathon_participants as unknown as HackathonParticipant;
}

export async function deleteSession(token: string) {
  await getClient().from("hackathon_sessions").delete().eq("token", token);
}

/** True when the participant has submitted the hackathon onboarding (pre-questionnaire). */
export async function hasCompletedHackathonOnboarding(
  participantId: string
): Promise<boolean> {
  const { data } = await getClient()
    .from("hackathon_pre_questionnaires")
    .select("participant_id")
    .eq("participant_id", participantId)
    .maybeSingle();
  return data != null;
}

export type HackathonTeam = {
  id: string;
  name: string;
  lobby_code: string;
  owner_id: string;
  created_at: string;
};

export type HackathonTeamMember = {
  participant_id: string;
  joined_at: string;
  hackathon_participants: {
    name: string;
    university: string;
    track: string;
  };
};

export type HackathonTeamWithMembers = HackathonTeam & {
  members: HackathonTeamMember[];
};

function generateLobbyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createTeam(ownerId: string, name: string): Promise<HackathonTeam> {
  const supabase = getClient();
  // Try a few times in case of lobby_code collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const lobby_code = generateLobbyCode();
    const { data, error } = await supabase
      .from("hackathon_teams")
      .insert({ name, lobby_code, owner_id: ownerId })
      .select("*")
      .single();
    if (!error && data) {
      // Add owner as a member too
      await supabase.from("hackathon_team_members").insert({
        team_id: data.id,
        participant_id: ownerId,
      });
      return data as HackathonTeam;
    }
    if (error?.code !== "23505") throw error; // only retry on unique violation
  }
  throw new Error("Failed to generate unique lobby code");
}

export async function joinTeam(lobbyCode: string, participantId: string): Promise<HackathonTeam> {
  const supabase = getClient();
  const { data: team, error: findError } = await supabase
    .from("hackathon_teams")
    .select("*")
    .eq("lobby_code", lobbyCode.toUpperCase())
    .single();
  if (findError || !team) throw new Error("Invalid lobby code");

  const { error: joinError } = await supabase
    .from("hackathon_team_members")
    .insert({ team_id: team.id, participant_id: participantId });
  if (joinError) {
    if (joinError.code === "23505") throw new Error("Already in this team");
    throw joinError;
  }
  return team as HackathonTeam;
}

export async function getParticipantTeam(participantId: string): Promise<HackathonTeamWithMembers | null> {
  const supabase = getClient();

  // Find if participant is in any team
  const { data: membership, error: membershipError } = await supabase
    .from("hackathon_team_members")
    .select("team_id")
    .eq("participant_id", participantId)
    .single();

  if (membershipError || !membership) return null;

  const { data: team, error: teamError } = await supabase
    .from("hackathon_teams")
    .select("*")
    .eq("id", membership.team_id)
    .single();

  if (teamError || !team) return null;

  // Get members first
  const { data: memberRows } = await supabase
    .from("hackathon_team_members")
    .select("participant_id, joined_at")
    .eq("team_id", team.id);

  if (!memberRows || memberRows.length === 0) {
    return { ...team, members: [] } as HackathonTeamWithMembers;
  }

  // Fetch participant details for each member
  const memberIds = memberRows.map((r) => r.participant_id);
  const { data: participantDetails } = await supabase
    .from("hackathon_participants")
    .select("id, name, university, track")
    .in("id", memberIds);

  const memberMap = new Map((participantDetails || []).map((p) => [p.id, p]));

  const members: HackathonTeamMember[] = memberRows.map((row) => ({
    participant_id: row.participant_id,
    joined_at: row.joined_at,
    hackathon_participants: memberMap.get(row.participant_id) ?? { name: "Unknown", university: "", track: "" },
  }));

  return { ...team, members } as HackathonTeamWithMembers;
}

export async function updateParticipantPassword(participantId: string, passwordHash: string) {
  const { error } = await getClient()
    .from("hackathon_participants")
    .update({ password_hash: passwordHash })
    .eq("id", participantId);
  if (error) throw error;
}

export async function createPasswordResetToken(participantId: string, token: string) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

  const { error } = await getClient().from("hackathon_password_resets").insert({
    participant_id: participantId,
    token,
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw error;
}

export async function getPasswordResetToken(token: string) {
  const now = new Date().toISOString();
  const { data } = await getClient()
    .from("hackathon_password_resets")
    .select("*, hackathon_participants(id, email)")
    .eq("token", token)
    .eq("used", false)
    .gt("expires_at", now)
    .single();

  return data;
}

export async function markPasswordResetTokenAsUsed(token: string) {
  const { error } = await getClient()
    .from("hackathon_password_resets")
    .update({ used: true })
    .eq("token", token);
  if (error) throw error;
}
