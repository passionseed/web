import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/modelRegistry";

export interface TeamProfile {
  mission: string;
  targetMarket: string;
  techStack: string[];
  businessModel: string;
  keyHypotheses: string[];
  stage: "idea" | "validation" | "building" | "launched";
  milestones: { phase: string; summary: string }[];
}

const profileSchema = z.object({
  mission: z.string().describe("The core problem the team is solving, in one sentence"),
  targetMarket: z.string().describe("Who the team is serving"),
  techStack: z.array(z.string()).describe("Technologies, tools, or platforms mentioned"),
  businessModel: z.string().describe("How they plan to make money or sustain"),
  keyHypotheses: z.array(z.string()).describe("Key assumptions they're testing"),
  stage: z.enum(["idea", "validation", "building", "launched"]).describe("Current progress stage"),
  milestones: z.array(z.object({
    phase: z.string(),
    summary: z.string(),
  })).describe("Key milestones or achievements by phase"),
});

export async function extractTeamProfile(
  teamText: string,
  modelName?: string
): Promise<TeamProfile> {
  const { object } = await generateObject({
    model: getModel("MiniMax-M2.7-highspeed"),
    schema: profileSchema,
    prompt: `Extract a structured profile from this hackathon team's submissions.

Analyze the team's combined submissions and extract:
1. Mission: What problem are they solving?
2. Target Market: Who are they serving?
3. Tech Stack: What technologies are they using?
4. Business Model: How do they plan to sustain/make money?
5. Key Hypotheses: What assumptions are they testing?
6. Stage: idea (just concept), validation (testing assumptions), building (developing MVP), or launched (has users)?
7. Milestones: Key achievements or deliverables by phase

Team Submissions:
${teamText.slice(0, 8000)}

Be concise but specific. If information is missing, make reasonable inferences or use empty values.`,
  });

  return object;
}

export async function extractTeamProfilesBatch(
  teams: { teamId: string; teamText: string }[],
  modelName?: string
): Promise<Map<string, TeamProfile>> {
  if (teams.length === 0) return new Map();
  if (teams.length === 1) {
    const profile = await extractTeamProfile(teams[0].teamText, modelName);
    return new Map([[teams[0].teamId, profile]]);
  }

  const BATCH_SIZE = 5;
  const results = new Map<string, TeamProfile>();

  for (let i = 0; i < teams.length; i += BATCH_SIZE) {
    const batch = teams.slice(i, i + BATCH_SIZE);
    const context = batch
      .map((t, idx) => `TEAM ${idx + 1} (ID: ${t.teamId}):\n${t.teamText.slice(0, 2000)}`)
      .join("\n\n---\n\n");

    const { object } = await generateObject({
      model: getModel("MiniMax-M2.7-highspeed"),
      schema: z.object({
        profiles: z.array(z.object({
          team_id: z.string(),
          mission: z.string(),
          targetMarket: z.string(),
          techStack: z.array(z.string()),
          businessModel: z.string(),
          keyHypotheses: z.array(z.string()),
          stage: z.enum(["idea", "validation", "building", "launched"]),
          milestones: z.array(z.object({ phase: z.string(), summary: z.string() })),
        })).describe(`Profiles for ${batch.length} teams`),
      }),
      prompt: `Extract structured profiles for ${batch.length} hackathon teams.

${context}

Return a profile for EVERY team listed above. Use the team_id from the context.`,
    });

    for (const profile of object.profiles) {
      results.set(profile.team_id, profile);
    }
  }

  return results;
}

export function formatMissionText(profile: TeamProfile): string {
  return `Mission: ${profile.mission}. Target: ${profile.targetMarket}. Stage: ${profile.stage}.`;
}

export function formatTechText(profile: TeamProfile): string {
  return `Technologies: ${profile.techStack.join(", ")}. Business model: ${profile.businessModel}.`;
}

export function formatMarketText(profile: TeamProfile): string {
  return `Market: ${profile.targetMarket}. Model: ${profile.businessModel}. Hypotheses: ${profile.keyHypotheses.join("; ")}.`;
}
