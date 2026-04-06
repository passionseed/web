import { createClient } from "@supabase/supabase-js";
import { SESSION_EXPIRY_DAYS } from "./auth";
import {
  buildHackathonTeams,
  canCreateValidTeams,
  type HackathonMatchingParticipant,
} from "./team-matching";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export function getHackathonAdminClient() {
  return getClient();
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
  is_admin?: boolean;
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
  special_invite?: boolean;
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

export async function getSessionParticipant(token: string, client?: ReturnType<typeof createClient>): Promise<HackathonParticipant | null> {
  const now = new Date().toISOString();
  const { data } = await (client ?? getClient())
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

export type HackathonMatchingEventStatus =
  | "draft"
  | "live"
  | "ranking_locked"
  | "matched"
  | "failed";

export type HackathonMatchingEvent = {
  id: string;
  name: string;
  status: HackathonMatchingEventStatus;
  min_team_size: number;
  max_team_size: number;
  ranking_deadline: string | null;
  matched_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HackathonMatchingCandidate = {
  id: string;
  name: string;
  university: string;
  track: string;
  bio: string;
  problem_preferences: string[];
  team_role_preference: string | null;
};

export type HackathonParticipantMatchingState = {
  metParticipantIds: string[];
  rankedParticipantIds: string[];
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

  // Fetch leader and joiner tracks to enforce same-track rule
  const [{ data: leader }, { data: joiner }] = await Promise.all([
    supabase
      .from("hackathon_participants")
      .select("track")
      .eq("id", team.owner_id)
      .single(),
    supabase
      .from("hackathon_participants")
      .select("track")
      .eq("id", participantId)
      .single(),
  ]);

  if (!leader || !joiner) throw new Error("Could not verify participant tracks");

  const leaderIsHighschool = leader.track.includes("มัธยม");
  const joinerIsHighschool = joiner.track.includes("มัธยม");

  if (leaderIsHighschool !== joinerIsHighschool) {
    const teamType = leaderIsHighschool ? "มัธยม" : "มหาวิทยาลัย";
    throw new Error(`ทีมนี้รับเฉพาะผู้เข้าร่วมระดับ${teamType} เท่านั้น`);
  }

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

export async function getLatestHackathonMatchingEvent(): Promise<HackathonMatchingEvent | null> {
  const { data, error } = await getClient()
    .from("hackathon_matching_events")
    .select("*")
    .neq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as HackathonMatchingEvent;
}

export async function getHackathonMatchingEvent(
  eventId: string
): Promise<HackathonMatchingEvent | null> {
  const { data, error } = await getClient()
    .from("hackathon_matching_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error || !data) return null;
  return data as HackathonMatchingEvent;
}

export async function listHackathonMatchingCandidates(
  excludeParticipantId?: string
): Promise<HackathonMatchingCandidate[]> {
  const supabase = getClient();

  const { data: teamMembers, error: teamMemberError } = await supabase
    .from("hackathon_team_members")
    .select("participant_id");

  if (teamMemberError) throw teamMemberError;

  const assignedIds = new Set((teamMembers || []).map((row) => row.participant_id));
  if (excludeParticipantId) {
    assignedIds.add(excludeParticipantId);
  }

  const { data: participants, error: participantError } = await supabase
    .from("hackathon_participants")
    .select("id, name, university, track, bio")
    .order("name", { ascending: true });
  if (participantError) throw participantError;

  const unassignedParticipants = (participants || []).filter(
    (participant) => !assignedIds.has(participant.id)
  );
  const participantIds = unassignedParticipants.map((participant) => participant.id);
  if (participantIds.length === 0) return [];

  const { data: questionnaires, error: questionnaireError } = await supabase
    .from("hackathon_pre_questionnaires")
    .select("participant_id, problem_preferences, team_role_preference")
    .in("participant_id", participantIds);

  if (questionnaireError) throw questionnaireError;

  const questionnaireMap = new Map(
    (questionnaires || []).map((questionnaire) => [
      questionnaire.participant_id,
      questionnaire,
    ])
  );

  return unassignedParticipants.map((participant) => {
    const questionnaire = questionnaireMap.get(participant.id);
    return {
      id: participant.id,
      name: participant.name,
      university: participant.university,
      track: participant.track,
      bio: participant.bio,
      problem_preferences: questionnaire?.problem_preferences ?? [],
      team_role_preference: questionnaire?.team_role_preference ?? null,
    };
  });
}

export async function getParticipantHackathonMatchingState(
  eventId: string,
  participantId: string
): Promise<HackathonParticipantMatchingState> {
  const supabase = getClient();

  const [{ data: metRows, error: metError }, { data: rankingRows, error: rankingError }] =
    await Promise.all([
      supabase
        .from("hackathon_matching_met_connections")
        .select("met_participant_id")
        .eq("event_id", eventId)
        .eq("participant_id", participantId),
      supabase
        .from("hackathon_matching_rankings")
        .select("ranked_participant_id, rank_order")
        .eq("event_id", eventId)
        .eq("participant_id", participantId)
        .order("rank_order", { ascending: true }),
    ]);

  if (metError) throw metError;
  if (rankingError) throw rankingError;

  return {
    metParticipantIds: (metRows || []).map((row) => row.met_participant_id),
    rankedParticipantIds: (rankingRows || []).map((row) => row.ranked_participant_id),
  };
}

export async function replaceParticipantHackathonMetConnections(
  eventId: string,
  participantId: string,
  metParticipantIds: string[]
) {
  const uniqueIds = [...new Set(metParticipantIds)].filter((id) => id !== participantId);
  const supabase = getClient();

  const { error: deleteError } = await supabase
    .from("hackathon_matching_met_connections")
    .delete()
    .eq("event_id", eventId)
    .eq("participant_id", participantId);

  if (deleteError) throw deleteError;

  if (uniqueIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("hackathon_matching_met_connections")
    .insert(
      uniqueIds.map((metParticipantId) => ({
        event_id: eventId,
        participant_id: participantId,
        met_participant_id: metParticipantId,
      }))
    );

  if (insertError) throw insertError;
}

export async function replaceParticipantHackathonRankings(
  eventId: string,
  participantId: string,
  rankedParticipantIds: string[]
) {
  const uniqueRankedIds = [...new Set(rankedParticipantIds)].filter(
    (id) => id !== participantId
  );
  const { metParticipantIds } = await getParticipantHackathonMatchingState(
    eventId,
    participantId
  );
  const allowedIds = new Set(metParticipantIds);

  if (uniqueRankedIds.some((id) => !allowedIds.has(id))) {
    throw new Error("Rankings must be limited to people you marked as met");
  }

  const supabase = getClient();
  const { error: deleteError } = await supabase
    .from("hackathon_matching_rankings")
    .delete()
    .eq("event_id", eventId)
    .eq("participant_id", participantId);

  if (deleteError) throw deleteError;

  if (uniqueRankedIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("hackathon_matching_rankings")
    .insert(
      uniqueRankedIds.map((rankedParticipantId, index) => ({
        event_id: eventId,
        participant_id: participantId,
        ranked_participant_id: rankedParticipantId,
        rank_order: index + 1,
      }))
    );

  if (insertError) throw insertError;
}

export async function runHackathonAutomaticTeamMatching(eventId: string) {
  const supabase = getClient();
  const event = await getHackathonMatchingEvent(eventId);

  if (!event) {
    throw new Error("Matching event not found");
  }

  if (event.status === "draft") {
    throw new Error("Matching event is not active");
  }

  const eligibleCandidates = await listHackathonMatchingCandidates();
  if (eligibleCandidates.length === 0) {
    throw new Error("No eligible participants to match");
  }

  if (!canCreateValidTeams(eligibleCandidates.length)) {
    throw new Error("Not enough unteamed participants to create valid teams");
  }

  const participantIds = eligibleCandidates.map((candidate) => candidate.id);
  const { data: rankingRows, error: rankingError } = await supabase
    .from("hackathon_matching_rankings")
    .select("participant_id, ranked_participant_id, rank_order")
    .eq("event_id", eventId)
    .in("participant_id", participantIds)
    .order("rank_order", { ascending: true });

  if (rankingError) throw rankingError;

  const rankingMap = new Map<string, string[]>();
  for (const row of rankingRows || []) {
    const existing = rankingMap.get(row.participant_id) ?? [];
    existing.push(row.ranked_participant_id);
    rankingMap.set(row.participant_id, existing);
  }

  const matchingParticipants: HackathonMatchingParticipant[] = eligibleCandidates.map(
    (candidate) => ({
      id: candidate.id,
      name: candidate.name,
      rankedParticipantIds: rankingMap.get(candidate.id) ?? [],
      problemPreferences: candidate.problem_preferences,
      teamRolePreference: candidate.team_role_preference,
    })
  );

  const runInput = {
    eventId,
    participants: matchingParticipants,
  };

  const matchedTeams = buildHackathonTeams(matchingParticipants);
  const createdTeams: HackathonTeamWithMembers[] = [];

  for (let index = 0; index < matchedTeams.length; index += 1) {
    const matchedTeam = matchedTeams[index];
    const [ownerId, ...memberIds] = matchedTeam.memberIds;
    const createdTeam = await createTeam(ownerId, `${event.name} Team ${index + 1}`);

    if (memberIds.length > 0) {
      const { error: insertMemberError } = await supabase
        .from("hackathon_team_members")
        .insert(
          memberIds.map((participantId) => ({
            team_id: createdTeam.id,
            participant_id: participantId,
          }))
        );

      if (insertMemberError) throw insertMemberError;
    }

    const hydratedTeam = await getParticipantTeam(ownerId);
    if (hydratedTeam) createdTeams.push(hydratedTeam);
  }

  const { data: runRow, error: runError } = await supabase
    .from("hackathon_matching_runs")
    .insert({
      event_id: eventId,
      status: "running",
      input_snapshot: runInput,
    })
    .select("id")
    .single();

  if (runError) throw runError;

  try {
    const { error: updateEventError } = await supabase
      .from("hackathon_matching_events")
      .update({
        status: "matched",
        matched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    if (updateEventError) throw updateEventError;

    const { error: finalizeRunError } = await supabase
      .from("hackathon_matching_runs")
      .update({
        status: "matched",
        result_snapshot: {
          matchedTeams,
          createdTeams,
        },
      })
      .eq("id", runRow.id);

    if (finalizeRunError) throw finalizeRunError;

    return {
      event,
      matchedTeams,
      createdTeams,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to finalize matching";

    await supabase
      .from("hackathon_matching_events")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    await supabase
      .from("hackathon_matching_runs")
      .update({
        status: "failed",
        error_message: message,
      })
      .eq("id", runRow.id);

    throw error;
  }
}

export async function updateParticipant(
  id: string,
  fields: {
    name?: string;
    phone?: string;
    university?: string;
    track?: string;
    grade_level?: string;
    experience_level?: number;
    bio?: string;
  }
) {
  const { data, error } = await getClient()
    .from("hackathon_participants")
    .update(fields)
    .eq("id", id)
    .select("id, name, email, phone, university, role, track, grade_level, experience_level, referral_source, bio, team_name, created_at")
    .single();
  if (error) throw error;
  return data as HackathonParticipant;
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
