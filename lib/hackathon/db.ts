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
  university: string;
  role: string;
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
  password_hash: string;
  university: string;
  role: string;
  team_name?: string;
}) {
  const { data, error } = await getClient()
    .from("hackathon_participants")
    .insert({
      ...params,
      email: params.email.toLowerCase(),
      team_name: params.team_name || null,
    })
    .select("id, name, email, university, role, team_name, created_at")
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
    .select("expires_at, hackathon_participants(id, name, email, university, role, team_name, created_at)")
    .eq("token", token)
    .gt("expires_at", now)
    .single();

  if (!data) return null;
  return data.hackathon_participants as HackathonParticipant;
}

export async function deleteSession(token: string) {
  await getClient().from("hackathon_sessions").delete().eq("token", token);
}
