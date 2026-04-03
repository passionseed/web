import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(
    process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type TeamFinderEntry = {
  id: string;
  participant_id: string;
  preferences: string[];
  created_at: string;
  updated_at: string;
};

export type TeamFinderParticipant = {
  id: string;
  name: string;
  preferences: string[];
};

export async function getTeamFinderEntry(
  participantId: string
): Promise<TeamFinderEntry | null> {
  const { data } = await getClient()
    .from("hackathon_team_finder")
    .select("*")
    .eq("participant_id", participantId)
    .single();
  return data ?? null;
}

export async function upsertTeamFinderEntry(
  participantId: string,
  preferences: string[]
): Promise<TeamFinderEntry> {
  const { data, error } = await getClient()
    .from("hackathon_team_finder")
    .upsert(
      { participant_id: participantId, preferences },
      { onConflict: "participant_id" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as TeamFinderEntry;
}

export async function listTeamFinderParticipants(): Promise<TeamFinderParticipant[]> {
  const client = getClient();

  const { data: entries, error: entriesError } = await client
    .from("hackathon_team_finder")
    .select("participant_id, preferences")
    .order("created_at", { ascending: true });
  if (entriesError) throw entriesError;
  if (!entries || entries.length === 0) return [];

  const ids = entries.map((e: { participant_id: string }) => e.participant_id);

  const { data: participants, error: participantsError } = await client
    .from("hackathon_participants")
    .select("id, name")
    .in("id", ids);
  if (participantsError) throw participantsError;

  const nameById = Object.fromEntries(
    (participants ?? []).map((p: { id: string; name: string }) => [p.id, p.name])
  );

  return entries.map((e: { participant_id: string; preferences: string[] }) => ({
    id: e.participant_id,
    name: nameById[e.participant_id] ?? "",
    preferences: e.preferences,
  }));
}

export async function resetAllPreferences(): Promise<void> {
  const { error } = await getClient()
    .from("hackathon_team_finder")
    .update({ preferences: [] })
    .neq("participant_id", "00000000-0000-0000-0000-000000000000"); // match all rows
  if (error) throw error;
}

export async function listTeamFinderParticipantsExcluding(
  excludeParticipantId: string
): Promise<TeamFinderParticipant[]> {
  const all = await listTeamFinderParticipants();
  return all.filter((p) => p.id !== excludeParticipantId);
}
