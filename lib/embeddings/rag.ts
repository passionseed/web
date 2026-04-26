import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/modelRegistry";
import { searchTeamDirections } from "./search";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface RagResult {
  answer: string;
  citedTeams: { team_id: string; team_name: string; mission: string; relevance: string }[];
  followUpQuestions: string[];
}

export async function askTeamDirections(
  question: string,
  opts: {
    aspect?: "mission" | "tech" | "market" | "composite";
    topK?: number;
    modelName?: string;
    adminClient?: SupabaseClient;
  } = {}
): Promise<RagResult> {
  const topK = opts.topK ?? 8;

  const searchResults = await searchTeamDirections(question, {
    aspect: opts.aspect,
    limit: topK,
    adminClient: opts.adminClient,
  });

  const admin = opts.adminClient ?? (await import("@/utils/supabase/admin")).createAdminClient();
  const teamIds = searchResults.map((r) => r.team_id);

  const { data: snapshots } = await admin
    .from("hackathon_team_direction_snapshots")
    .select("team_id, profile, source_text")
    .eq("is_latest", true)
    .in("team_id", teamIds);

  const snapshotByTeam = new Map((snapshots ?? []).map((s: any) => [s.team_id, s]));

  const context = searchResults.map((result) => {
    const snapshot = snapshotByTeam.get(result.team_id);
    return `
Team: ${result.team_name}
Mission: ${snapshot?.profile?.mission ?? result.mission}
Tech: ${(snapshot?.profile?.tech_stack ?? []).join(", ")}
Market: ${snapshot?.profile?.target_market ?? ""}
Model: ${snapshot?.profile?.business_model ?? ""}
Submissions: ${(snapshot?.source_text ?? "").slice(0, 500)}
`;
  }).join("\n---\n");

  const { object } = await generateObject({
    model: getModel(opts.modelName),
    schema: z.object({
      answer: z.string().describe("Comprehensive answer to the question"),
      citedTeamIds: z.array(z.string()).describe("Team IDs cited in the answer"),
      followUpQuestions: z.array(z.string()).describe("3 follow-up questions the user might ask"),
    }),
    prompt: `Answer this question about hackathon teams using the provided context.

Question: ${question}

Context (top ${topK} relevant teams):
${context}

Instructions:
- Be specific and cite team names in your answer
- If the context doesn't fully answer the question, say so
- Highlight interesting patterns, similarities, or contrasts between teams
- Keep the answer concise but informative
- Suggest 3 natural follow-up questions`,
  });

  const citedTeams = object.citedTeamIds
    .map((id) => {
      const result = searchResults.find((r) => r.team_id === id);
      return result ? {
        team_id: id,
        team_name: result.team_name,
        mission: result.mission,
        relevance: `${(result.similarity * 100).toFixed(1)}% match`,
      } : null;
    })
    .filter(Boolean) as RagResult["citedTeams"];

  return {
    answer: object.answer,
    citedTeams,
    followUpQuestions: object.followUpQuestions,
  };
}
