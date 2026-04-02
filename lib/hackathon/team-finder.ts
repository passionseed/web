import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  const { data, error } = await getClient()
    .from("hackathon_team_finder")
    .select("preferences, hackathon_participants(id, name)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  type Row = { preferences: string[]; hackathon_participants: { id: string; name: string } | null };
  return ((data as unknown) as Row[] ?? []).map((row) => ({
    id: row.hackathon_participants?.id ?? "",
    name: row.hackathon_participants?.name ?? "",
    preferences: row.preferences,
  }));
}

export async function listTeamFinderParticipantsExcluding(
  excludeParticipantId: string
): Promise<TeamFinderParticipant[]> {
  const all = await listTeamFinderParticipants();
  return all.filter((p) => p.id !== excludeParticipantId);
}
