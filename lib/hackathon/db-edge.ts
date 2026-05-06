import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type HackathonMatchingEvent = {
  id: string;
  name: string;
  status: "draft" | "live" | "ranking_locked" | "matched" | "failed";
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

export async function getSessionParticipant(token: string): Promise<unknown> {
  const now = new Date().toISOString();
  const { data } = await getClient()
    .from("hackathon_sessions")
    .select("expires_at, hackathon_participants(id, name, email, phone, university, role, track, grade_level, experience_level, referral_source, bio, team_name, created_at)")
    .eq("token", token)
    .gt("expires_at", now)
    .single();

  if (!data) return null;
  return data.hackathon_participants;
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

export async function getParticipantTeam(participantId: string): Promise<HackathonTeamWithMembers | null> {
  const supabase = getClient();

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

  const { data: memberRows } = await supabase
    .from("hackathon_team_members")
    .select("participant_id, joined_at")
    .eq("team_id", team.id);

  if (!memberRows || memberRows.length === 0) {
    return { ...team, members: [] } as HackathonTeamWithMembers;
  }

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
