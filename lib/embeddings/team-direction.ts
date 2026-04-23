import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { embedText, formatVectorLiteral, hashText } from "./bge";

export async function collectTeamText(teamId: string, client?: SupabaseClient): Promise<string> {
  const admin = client ?? createAdminClient();

  const { data: team } = await admin
    .from("hackathon_teams")
    .select("name")
    .eq("id", teamId)
    .single();
  if (!team) return "";

  const { data: teamSubs } = await admin
    .from("hackathon_phase_activity_team_submissions")
    .select("text_answer, hackathon_phase_activities(title, display_order)")
    .eq("team_id", teamId)
    .neq("status", "draft");

  const { data: members } = await admin
    .from("hackathon_team_members")
    .select("participant_id")
    .eq("team_id", teamId);

  const participantIds = (members ?? []).map((m) => m.participant_id);

  let individualSubs: any[] = [];
  if (participantIds.length > 0) {
    const { data } = await admin
      .from("hackathon_phase_activity_submissions")
      .select("text_answer, hackathon_phase_activities(title, display_order), hackathon_participants(name)")
      .in("participant_id", participantIds)
      .neq("status", "draft");
    individualSubs = data ?? [];
  }

  const validTeamSubs = (teamSubs ?? [])
    .filter((s: any) => s.text_answer?.trim())
    .sort((a: any, b: any) => (a.hackathon_phase_activities?.display_order ?? 0) - (b.hackathon_phase_activities?.display_order ?? 0));

  const validIndividualSubs = (individualSubs as any[])
    .filter((s: any) => s.text_answer?.trim())
    .sort((a: any, b: any) => (a.hackathon_phase_activities?.display_order ?? 0) - (b.hackathon_phase_activities?.display_order ?? 0));

  if (validTeamSubs.length === 0 && validIndividualSubs.length === 0) return "";

  const parts: string[] = [`## Team: ${team.name}`];

  for (const s of validTeamSubs) {
    const title = (s as any).hackathon_phase_activities?.title ?? "Activity";
    parts.push(`\n### ${title} (Team)\n${(s.text_answer as string).trim()}`);
  }

  for (const s of validIndividualSubs) {
    const title = (s as any).hackathon_phase_activities?.title ?? "Activity";
    const name = (s as any).hackathon_participants?.name ?? "Member";
    parts.push(`\n### ${title} (${name})\n${(s.text_answer as string).trim()}`);
  }

  return parts.join("\n").trim();
}

export async function upsertTeamDirectionEmbedding(teamId: string, adminClient?: SupabaseClient): Promise<void> {
  const admin = adminClient ?? createAdminClient();
  const trimmed = await collectTeamText(teamId, admin);
  if (!trimmed) return;

  const newHash = hashText(trimmed);

  const { data: existing } = await admin
    .from("hackathon_team_direction_embeddings")
    .select("id, text_hash")
    .eq("team_id", teamId)
    .maybeSingle();

  if (existing?.text_hash === newHash) return;

  const embedding = await embedText(trimmed);
  const payload = {
    team_id: teamId,
    source_text: trimmed,
    text_hash: newHash,
    embedding: formatVectorLiteral(embedding),
    generated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await admin
      .from("hackathon_team_direction_embeddings")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await admin.from("hackathon_team_direction_embeddings").insert(payload);
    if (error) throw error;
  }
}

export function fireAndForgetTeamDirectionEmbed(teamId: string, adminClient?: SupabaseClient): void {
  void upsertTeamDirectionEmbedding(teamId, adminClient).catch((err) => {
    console.error("[team-direction-embedding] background embed failed", {
      teamId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}
