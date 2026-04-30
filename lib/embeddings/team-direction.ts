import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { embedTexts, formatVectorLiteral, hashText } from "./bge";
import { extractTeamProfile, formatMissionText, formatTechText, formatMarketText } from "./profile-extractor";
import type { TeamProfile } from "./profile-extractor";
import { getHackathonClient } from "./hackathon-client";

export async function collectTeamText(teamId: string): Promise<string> {
  const hackathon = getHackathonClient();
  const log = (msg: string) => console.log(`[collectTeamText][${teamId}] ${msg}`);

  const { data: team } = await hackathon
    .from("hackathon_teams")
    .select("name")
    .eq("id", teamId)
    .single();
  if (!team) { log("❌ Team not found"); return ""; }
  log(`Team: "${team.name}"`);

  const { data: teamSubs } = await hackathon
    .from("hackathon_phase_activity_team_submissions")
    .select("text_answer, status, hackathon_phase_activities(title, display_order)")
    .eq("team_id", teamId)
    .neq("status", "draft");

  // Also check the alternate team submissions table
  const { data: altTeamSubs } = await hackathon
    .from("hackathon_activity_team_submissions")
    .select("id, team_id, status, payload")
    .eq("team_id", teamId)
    .neq("status", "draft");

  const { data: members } = await hackathon
    .from("hackathon_team_members")
    .select("participant_id")
    .eq("team_id", teamId);

  const participantIds = (members ?? []).map((m) => m.participant_id);
  log(`Members: ${participantIds.length}`);

  let individualSubs: any[] = [];
  if (participantIds.length > 0) {
    const { data } = await hackathon
      .from("hackathon_phase_activity_submissions")
      .select("text_answer, status, hackathon_phase_activities(title, display_order), hackathon_participants(name)")
      .in("participant_id", participantIds)
      .neq("status", "draft");
    individualSubs = data ?? [];
  }

  log(`Raw team subs: ${(teamSubs ?? []).length} (non-draft)`);
  for (const s of teamSubs ?? []) {
    const title = (s as any).hackathon_phase_activities?.title ?? "?";
    const hasText = Boolean((s as any).text_answer?.trim());
    log(`  [team] "${title}" status=${(s as any).status} hasText=${hasText} len=${((s as any).text_answer ?? "").length}`);
  }

  log(`Alt team subs (hackathon_activity_team_submissions): ${(altTeamSubs ?? []).length}`);
  for (const s of altTeamSubs ?? []) {
    const payload = (s as any).payload;
    const payloadText = typeof payload === "string" ? payload : (payload?.text ?? payload?.answer ?? JSON.stringify(payload));
    log(`  [alt-team] status=${(s as any).status} payloadType=${typeof payload} len=${(payloadText ?? "").length}`);
  }

  log(`Raw individual subs: ${individualSubs.length} (non-draft)`);
  for (const s of individualSubs) {
    const title = (s as any).hackathon_phase_activities?.title ?? "?";
    const name = (s as any).hackathon_participants?.name ?? "?";
    const hasText = Boolean((s as any).text_answer?.trim());
    log(`  [indiv] "${title}" by ${name} status=${(s as any).status} hasText=${hasText} len=${((s as any).text_answer ?? "").length}`);
  }

  // Activities that are rubric/checklist responses, not directional content
  const SKIP_ACTIVITIES = ["research", "decision gate"];

  const validTeamSubs = (teamSubs ?? [])
    .filter((s: any) => s.text_answer?.trim())
    .filter((s: any) => !SKIP_ACTIVITIES.includes((s.hackathon_phase_activities?.title ?? "").toLowerCase()))
    .sort((a: any, b: any) => (a.hackathon_phase_activities?.display_order ?? 0) - (b.hackathon_phase_activities?.display_order ?? 0));

  // Extract text from alt team submissions (payload JSONB)
  const altTeamTexts: { title: string; text: string }[] = [];
  for (const s of altTeamSubs ?? []) {
    const payload = (s as any).payload;
    let text = "";
    if (typeof payload === "string") text = payload;
    else if (payload) {
      // payload can be { text: "..." }, { answer: "..." }, or { sections: [...] }
      text = payload.text ?? payload.answer ?? payload.content ?? "";
      if (!text && payload.sections && Array.isArray(payload.sections)) {
        text = payload.sections.map((sec: any) => sec.content ?? sec.text ?? "").filter(Boolean).join("\n\n");
      }
      if (!text) text = JSON.stringify(payload);
    }
    if (text?.trim()) altTeamTexts.push({ title: "Team Activity", text: text.trim() });
  }

  const validIndividualSubs = (individualSubs as any[])
    .filter((s: any) => s.text_answer?.trim())
    .filter((s: any) => !SKIP_ACTIVITIES.includes((s.hackathon_phase_activities?.title ?? "").toLowerCase()))
    .sort((a: any, b: any) => (a.hackathon_phase_activities?.display_order ?? 0) - (b.hackathon_phase_activities?.display_order ?? 0));

  log(`Valid (with text): ${validTeamSubs.length} team, ${altTeamTexts.length} alt-team, ${validIndividualSubs.length} individual`);

  if (validTeamSubs.length === 0 && altTeamTexts.length === 0 && validIndividualSubs.length === 0) {
    log("❌ No text submissions found — returning empty");
    return "";
  }

  const parts: string[] = [];

  for (const s of validTeamSubs) {
    const title = (s as any).hackathon_phase_activities?.title ?? "Activity";
    parts.push(`### ${title} (Team)\n${(s.text_answer as string).trim()}`);
  }

  for (const s of altTeamTexts) {
    parts.push(`### ${s.title} (Team)\n${s.text}`);
  }

  for (const s of validIndividualSubs) {
    const title = (s as any).hackathon_phase_activities?.title ?? "Activity";
    parts.push(`### ${title} (Individual)\n${(s.text_answer as string).trim()}`);
  }

  const result = parts.join("\n").trim();
  log(`✅ Final text: ${result.length} chars, ${parts.length - 1} sections`);
  log(`--- BEGIN TEXT ---\n${result}\n--- END TEXT ---`);
  return result;
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
