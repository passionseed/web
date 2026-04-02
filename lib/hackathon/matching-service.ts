import { createClient } from "@supabase/supabase-js";
import {
  buildHackathonTeams,
  type HackathonMatchingParticipant,
} from "./team-matching";
import { createTeam, type HackathonTeam } from "./db";

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
  experience_level: number;
  problem_preferences: string[];
  team_role_preference: string | null;
};

export type HackathonParticipantMatchingState = {
  event: HackathonMatchingEvent | null;
  hasTeam: boolean;
  isEditable: boolean;
  candidates: HackathonMatchingCandidate[];
  metParticipantIds: string[];
  rankings: string[];
};

type QuestionnaireRow = {
  participant_id: string;
  problem_preferences: string[] | null;
  team_role_preference: string | null;
};

type ParticipantRow = {
  id: string;
  name: string;
  university: string;
  track: string;
  experience_level: number;
};

async function getQuestionnaireMap(participantIds: string[]) {
  if (participantIds.length === 0) return new Map<string, QuestionnaireRow>();

  const { data, error } = await getClient()
    .from("hackathon_pre_questionnaires")
    .select("participant_id, problem_preferences, team_role_preference")
    .in("participant_id", participantIds);

  if (error) throw error;

  return new Map(
    (data ?? []).map((row) => [row.participant_id, row as QuestionnaireRow])
  );
}

async function getTeamMemberIds() {
  const { data, error } = await getClient()
    .from("hackathon_team_members")
    .select("participant_id");

  if (error) throw error;

  return new Set((data ?? []).map((row) => row.participant_id));
}

async function getParticipantRows() {
  const { data, error } = await getClient()
    .from("hackathon_participants")
    .select("id, name, university, track, experience_level")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []) as ParticipantRow[];
}

export async function getLatestMatchingEvent(): Promise<HackathonMatchingEvent | null> {
  const { data, error } = await getClient()
    .from("hackathon_matching_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as HackathonMatchingEvent | null) ?? null;
}

export async function getActiveMatchingEvent(): Promise<HackathonMatchingEvent | null> {
  const { data, error } = await getClient()
    .from("hackathon_matching_events")
    .select("*")
    .in("status", ["live", "ranking_locked"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as HackathonMatchingEvent | null) ?? null;
}

export async function createMatchingEvent(params: {
  name: string;
  minTeamSize?: number;
  maxTeamSize?: number;
  rankingDeadline?: string | null;
}) {
  const activeEvent = await getActiveMatchingEvent();
  if (activeEvent) return activeEvent;

  const { data, error } = await getClient()
    .from("hackathon_matching_events")
    .insert({
      name: params.name,
      status: "live",
      min_team_size: params.minTeamSize ?? 3,
      max_team_size: params.maxTeamSize ?? 5,
      ranking_deadline: params.rankingDeadline ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as HackathonMatchingEvent;
}

export async function getParticipantMatchingState(
  participantId: string
): Promise<HackathonParticipantMatchingState> {
  const [event, teamMemberIds, participants] = await Promise.all([
    getActiveMatchingEvent(),
    getTeamMemberIds(),
    getParticipantRows(),
  ]);

  const hasTeam = teamMemberIds.has(participantId);
  if (!event) {
    return {
      event: null,
      hasTeam,
      isEditable: false,
      candidates: [],
      metParticipantIds: [],
      rankings: [],
    };
  }

  const candidateRows = participants.filter(
    (candidate) => candidate.id !== participantId && !teamMemberIds.has(candidate.id)
  );
  const questionnaires = await getQuestionnaireMap(
    candidateRows.map((candidate) => candidate.id)
  );

  const [metRows, rankingRows] = await Promise.all([
    getClient()
      .from("hackathon_matching_met_connections")
      .select("met_participant_id")
      .eq("event_id", event.id)
      .eq("participant_id", participantId),
    getClient()
      .from("hackathon_matching_rankings")
      .select("ranked_participant_id, rank_order")
      .eq("event_id", event.id)
      .eq("participant_id", participantId)
      .order("rank_order", { ascending: true }),
  ]);

  if (metRows.error) throw metRows.error;
  if (rankingRows.error) throw rankingRows.error;

  return {
    event,
    hasTeam,
    isEditable: event.status === "live" && !hasTeam,
    candidates: candidateRows.map((candidate) => {
      const questionnaire = questionnaires.get(candidate.id);
      return {
        ...candidate,
        problem_preferences: questionnaire?.problem_preferences ?? [],
        team_role_preference: questionnaire?.team_role_preference ?? null,
      };
    }),
    metParticipantIds: (metRows.data ?? []).map((row) => row.met_participant_id),
    rankings: (rankingRows.data ?? []).map((row) => row.ranked_participant_id),
  };
}

function ensureEventEditable(event: HackathonMatchingEvent | null) {
  if (!event) {
    throw new Error("No active matching event");
  }
  if (event.status !== "live") {
    throw new Error("Matching event is locked");
  }
}

function ensureMatchingEventId(event: HackathonMatchingEvent, eventId: string) {
  if (event.id !== eventId) {
    throw new Error("Matching event is no longer current");
  }
}

async function ensureParticipantIsUnteamed(participantId: string) {
  const memberIds = await getTeamMemberIds();
  if (memberIds.has(participantId)) {
    throw new Error("Participant already has a team");
  }
}

export async function saveMetConnections(params: {
  eventId: string;
  participantId: string;
  metParticipantIds: string[];
}) {
  const event = await getActiveMatchingEvent();
  ensureEventEditable(event);
  ensureMatchingEventId(event, params.eventId);
  await ensureParticipantIsUnteamed(params.participantId);

  const dedupedIds = [...new Set(params.metParticipantIds)].filter(Boolean);
  if (dedupedIds.some((id) => id === params.participantId)) {
    throw new Error("Cannot add yourself to met list");
  }

  const teamMemberIds = await getTeamMemberIds();
  const validCandidates = new Set(
    (await getParticipantRows())
      .filter(
        (participant) =>
          participant.id !== params.participantId && !teamMemberIds.has(participant.id)
      )
      .map((participant) => participant.id)
  );

  for (const metParticipantId of dedupedIds) {
    if (!validCandidates.has(metParticipantId)) {
      throw new Error("Met list contains invalid participant");
    }
  }

  await getClient()
    .from("hackathon_matching_met_connections")
    .delete()
    .eq("event_id", params.eventId)
    .eq("participant_id", params.participantId);

  await getClient()
    .from("hackathon_matching_rankings")
    .delete()
    .eq("event_id", params.eventId)
    .eq("participant_id", params.participantId);

  if (dedupedIds.length === 0) return;

  const { error } = await getClient()
    .from("hackathon_matching_met_connections")
    .insert(
      dedupedIds.map((metParticipantId) => ({
        event_id: params.eventId,
        participant_id: params.participantId,
        met_participant_id: metParticipantId,
      }))
    );

  if (error) throw error;
}

export async function saveRankings(params: {
  eventId: string;
  participantId: string;
  rankedParticipantIds: string[];
}) {
  const event = await getActiveMatchingEvent();
  ensureEventEditable(event);
  ensureMatchingEventId(event, params.eventId);
  await ensureParticipantIsUnteamed(params.participantId);

  const dedupedIds = [...new Set(params.rankedParticipantIds)].filter(Boolean);
  if (dedupedIds.some((id) => id === params.participantId)) {
    throw new Error("Cannot rank yourself");
  }

  const { data: metRows, error: metError } = await getClient()
    .from("hackathon_matching_met_connections")
    .select("met_participant_id")
    .eq("event_id", params.eventId)
    .eq("participant_id", params.participantId);

  if (metError) throw metError;

  const metIds = new Set((metRows ?? []).map((row) => row.met_participant_id));
  for (const rankedParticipantId of dedupedIds) {
    if (!metIds.has(rankedParticipantId)) {
      throw new Error("Rankings must come from your met list");
    }
  }

  await getClient()
    .from("hackathon_matching_rankings")
    .delete()
    .eq("event_id", params.eventId)
    .eq("participant_id", params.participantId);

  if (dedupedIds.length === 0) return;

  const { error } = await getClient()
    .from("hackathon_matching_rankings")
    .insert(
      dedupedIds.map((rankedParticipantId, index) => ({
        event_id: params.eventId,
        participant_id: params.participantId,
        ranked_participant_id: rankedParticipantId,
        rank_order: index + 1,
      }))
    );

  if (error) throw error;
}

async function buildMatchingInput(
  event: HackathonMatchingEvent
): Promise<{
  participants: HackathonMatchingParticipant[];
  minTeamSize: number;
  maxTeamSize: number;
}> {
  const [teamMemberIds, participants, questionnaires, rankingRows] = await Promise.all([
    getTeamMemberIds(),
    getParticipantRows(),
    getClient()
      .from("hackathon_pre_questionnaires")
      .select("participant_id, problem_preferences, team_role_preference"),
    getClient()
      .from("hackathon_matching_rankings")
      .select("participant_id, ranked_participant_id, rank_order")
      .eq("event_id", event.id)
      .order("rank_order", { ascending: true }),
  ]);

  if (questionnaires.error) throw questionnaires.error;
  if (rankingRows.error) throw rankingRows.error;

  const candidateRows = participants.filter(
    (participant) => !teamMemberIds.has(participant.id)
  );
  const questionnaireMap = new Map(
    (questionnaires.data ?? []).map((row) => [row.participant_id, row as QuestionnaireRow])
  );
  const rankingMap = new Map<string, string[]>();

  for (const row of rankingRows.data ?? []) {
    const rankedIds = rankingMap.get(row.participant_id) ?? [];
    rankedIds.push(row.ranked_participant_id);
    rankingMap.set(row.participant_id, rankedIds);
  }

  const matchingParticipants: HackathonMatchingParticipant[] = candidateRows.map(
    (participant) => {
      const questionnaire = questionnaireMap.get(participant.id);
      return {
        id: participant.id,
        name: participant.name,
        problemPreferences: questionnaire?.problem_preferences ?? [],
        teamRolePreference: questionnaire?.team_role_preference ?? null,
        rankedParticipantIds: rankingMap.get(participant.id) ?? [],
      };
    }
  );

  return {
    participants: matchingParticipants,
    minTeamSize: event.min_team_size,
    maxTeamSize: event.max_team_size,
  };
}

async function createAutoTeam(
  event: HackathonMatchingEvent,
  memberIds: string[],
  index: number
): Promise<HackathonTeam> {
  const [ownerId, ...remainingMemberIds] = memberIds;
  const team = await createTeam(ownerId, `${event.name} Team ${index}`);

  if (remainingMemberIds.length === 0) return team;

  const { error } = await getClient()
    .from("hackathon_team_members")
    .insert(
      remainingMemberIds.map((participantId) => ({
        team_id: team.id,
        participant_id: participantId,
      }))
    );

  if (error) throw error;
  return team;
}

export async function runMatchingEvent(eventId: string) {
  const client = getClient();
  const { data: eventData, error: eventError } = await client
    .from("hackathon_matching_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (eventError || !eventData) {
    throw new Error("Matching event not found");
  }

  const event = eventData as HackathonMatchingEvent;

  const { data: runRow, error: runError } = await client
    .from("hackathon_matching_runs")
    .insert({
      event_id: event.id,
      status: "running",
    })
    .select("id")
    .single();

  if (runError) throw runError;

  try {
    await client
      .from("hackathon_matching_events")
      .update({
        status: "ranking_locked",
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    const input = await buildMatchingInput({ ...event, status: "ranking_locked" });
    const resultTeams = buildHackathonTeams(input.participants);

    const createdTeams: Array<{ teamId: string; memberIds: string[] }> = [];
    for (const [index, team] of resultTeams.entries()) {
      const createdTeam = await createAutoTeam(event, team.memberIds, index + 1);
      createdTeams.push({ teamId: createdTeam.id, memberIds: team.memberIds });
    }

    if (createdTeams.length > 0) {
      await client
        .from("hackathon_team_matching_waitlist")
        .update({ status: "cancelled" })
        .in(
          "participant_id",
          createdTeams.flatMap((team) => team.memberIds)
        )
        .eq("status", "waiting");
    }

    await client
      .from("hackathon_matching_events")
      .update({
        status: "matched",
        matched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    await client
      .from("hackathon_matching_runs")
      .update({
        status: "matched",
        input_snapshot: input,
        result_snapshot: {
          teams: createdTeams,
        },
      })
      .eq("id", runRow.id);

    return {
      eventId: event.id,
      teamCount: createdTeams.length,
      assignedParticipantCount: createdTeams.reduce(
        (count, team) => count + team.memberIds.length,
        0
      ),
      teams: createdTeams,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to run matching event";

    await client
      .from("hackathon_matching_events")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    await client
      .from("hackathon_matching_runs")
      .update({
        status: "failed",
        error_message: errorMessage,
      })
      .eq("id", runRow.id);

    throw error;
  }
}
