import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { embedTexts, formatVectorLiteral, hashText } from "./bge";
import { extractTeamProfile, formatMissionText, formatTechText, formatMarketText } from "./profile-extractor";
import type { TeamProfile } from "./profile-extractor";
import { getHackathonClient } from "./hackathon-client";

export async function collectTeamText(teamId: string): Promise<string> {
  const hackathon = getHackathonClient();

  const { data: team } = await hackathon
    .from("hackathon_teams")
    .select("name")
    .eq("id", teamId)
    .single();
  if (!team) return "";

  const { data: teamSubs } = await hackathon
    .from("hackathon_phase_activity_team_submissions")
    .select("text_answer, hackathon_phase_activities(title, display_order)")
    .eq("team_id", teamId)
    .neq("status", "draft");

  const { data: members } = await hackathon
    .from("hackathon_team_members")
    .select("participant_id")
    .eq("team_id", teamId);

  const participantIds = (members ?? []).map((m) => m.participant_id);

  let individualSubs: any[] = [];
  if (participantIds.length > 0) {
    const { data } = await hackathon
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
  await createTeamDirectionSnapshot(teamId, { adminClient });
}

export interface TeamDirectionSnapshot {
  id: string;
  team_id: string;
  profile: TeamProfile;
  mission_embedding: number[];
  tech_embedding: number[];
  market_embedding: number[];
  composite_embedding: number[];
  source_text: string;
  text_hash: string;
}

export async function createTeamDirectionSnapshot(
  teamId: string,
  opts: {
    adminClient?: SupabaseClient;
    profile?: TeamProfile;
  } = {}
): Promise<TeamDirectionSnapshot> {
  const admin = opts.adminClient ?? createAdminClient();

  const sourceText = await collectTeamText(teamId);
  if (!sourceText) {
    throw new Error(`No submission text found for team ${teamId}`);
  }

  const profile = opts.profile ?? await extractTeamProfile(sourceText);

  const missionText = formatMissionText(profile);
  const techText = formatTechText(profile);
  const marketText = formatMarketText(profile);

  const [missionEmbed, techEmbed, marketEmbed, compositeEmbed] = await embedTexts([
    missionText,
    techText,
    marketText,
    sourceText,
  ]);

  const textHash = hashText(sourceText);
  const { data: snapshot, error } = await admin
    .from("hackathon_team_direction_snapshots")
    .insert({
      team_id: teamId,
      profile: profile as any,
      mission_embedding: formatVectorLiteral(missionEmbed),
      tech_embedding: formatVectorLiteral(techEmbed),
      market_embedding: formatVectorLiteral(marketEmbed),
      composite_embedding: formatVectorLiteral(compositeEmbed),
      source_text: sourceText,
      text_hash: textHash,
      is_latest: true,
    })
    .select("*")
    .single();

  if (error) throw error;

  await admin
    .from("hackathon_team_direction_snapshots")
    .update({ is_latest: false })
    .eq("team_id", teamId)
    .neq("id", snapshot.id);

  await admin
    .from("hackathon_team_direction_embeddings")
    .upsert({
      team_id: teamId,
      source_text: sourceText,
      text_hash: textHash,
      embedding: formatVectorLiteral(compositeEmbed),
      generated_at: new Date().toISOString(),
    }, { onConflict: "team_id" });

  await updateSearchCache(teamId, profile, snapshot.id, admin);

  return {
    id: snapshot.id as string,
    team_id: teamId,
    profile,
    mission_embedding: missionEmbed,
    tech_embedding: techEmbed,
    market_embedding: marketEmbed,
    composite_embedding: compositeEmbed,
    source_text: sourceText,
    text_hash: textHash,
  };
}

async function updateSearchCache(
  teamId: string,
  profile: TeamProfile,
  snapshotId: string,
  admin: SupabaseClient
): Promise<void> {
  const { data: team } = await getHackathonClient()
    .from("hackathon_teams")
    .select("name")
    .eq("id", teamId)
    .single();

  const searchText = [
    team?.name,
    profile.mission,
    profile.targetMarket,
    ...profile.techStack,
    profile.businessModel,
    ...profile.keyHypotheses,
  ].filter(Boolean).join(" ");

  await admin
    .from("team_direction_search_cache")
    .upsert({
      team_id: teamId,
      team_name: team?.name ?? "Unknown",
      mission: profile.mission,
      target_market: profile.targetMarket,
      tech_stack: profile.techStack,
      business_model: profile.businessModel,
      stage: profile.stage,
      latest_snapshot_id: snapshotId,
      search_text: searchText,
      updated_at: new Date().toISOString(),
    }, { onConflict: "team_id" });
}

export function fireAndForgetTeamDirectionEmbed(teamId: string, adminClient?: SupabaseClient): void {
  console.warn("fireAndForgetTeamDirectionEmbed is deprecated. Use enqueueEmbedJob from lib/embeddings/jobs.ts");
  import("./jobs").then(({ enqueueEmbedJob }) => {
    enqueueEmbedJob(teamId, "submission", adminClient).catch((err) => {
      console.error("[team-direction-embedding] failed to enqueue job", { teamId, error: err });
    });
  });
}
