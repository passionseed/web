import { generateObject } from "ai";
import { getModel } from "@/lib/ai/modelRegistry";
import { parseProblemBrief, type ProblemBrief } from "@/lib/hackathon/problem-brief-schema";
import {
  generatedProblemBriefSchema,
  problemBriefResearchPlanSchema,
  type GeneratedProblemBrief,
  type ProblemBriefResearchPlan,
} from "@/lib/hackathon/problem-brief-generator-schema";

function assertSourcedStatistics(brief: ProblemBrief) {
  const unsourcedStat = brief.statistics.find((item) => item.sources.length === 0);
  if (unsourcedStat) {
    throw new Error(`Generated statistic is missing a source link: ${unsourcedStat.stat.en}`);
  }
}

function buildResearchPlannerPrompt(seed: ProblemBrief, sourceDossier: string): string {
  return [
    `Problem: ${seed.problemId} - ${seed.title.en}`,
    `Track: ${seed.track}`,
    `Challenge: ${seed.challenge.en}`,
    "",
    "You are the research scout sub-agent for PassionSeed hackathon briefs.",
    "Plan the evidence work. Focus on Thai context first, then adjacent global evidence if it sharpens the brief.",
    "Do not invent claims, sources, or programs outside the dossier.",
    "",
    "Source dossier:",
    sourceDossier,
    "",
    "Return only the structured research plan.",
  ].join("\n");
}

function buildBriefWriterPrompt(
  seed: ProblemBrief,
  researchPlan: ProblemBriefResearchPlan,
  sourceDossier: string,
): string {
  return [
    `Problem: ${seed.problemId} - ${seed.title.en}`,
    `Track: ${seed.track}`,
    `Challenge: ${seed.challenge.en}`,
    "",
    "You are the synthesis writer sub-agent for PassionSeed hackathon briefs.",
    "Write the fullest possible challenge brief, but every research claim must trace to a real source link from the dossier.",
    "Keep English and Thai fields both populated. Thai should read naturally, not machine-literal.",
    "If a claim cannot be supported with a source URL from the dossier, omit it.",
    "Preserve the page-friendly structure and add a strong deepResearch section.",
    "",
    "Research plan:",
    JSON.stringify(researchPlan, null, 2),
    "",
    "Source dossier:",
    sourceDossier,
    "",
    "Return only the structured JSON object.",
  ].join("\n");
}

export async function planProblemBriefResearch(params: {
  seed: ProblemBrief;
  sourceDossier: string;
}): Promise<ProblemBriefResearchPlan> {
  const { object } = await generateObject({
    model: getModel("google/gemini-2.5-flash"),
    schema: problemBriefResearchPlanSchema,
    prompt: buildResearchPlannerPrompt(params.seed, params.sourceDossier),
    temperature: 0.15,
  });

  return problemBriefResearchPlanSchema.parse(object);
}

export async function generateProblemBriefFromDossier(params: {
  seed: ProblemBrief;
  sourceDossier: string;
}): Promise<ProblemBrief> {
  const researchPlan = await planProblemBriefResearch(params);

  const { object } = await generateObject({
    model: getModel("google/gemini-2.5-flash"),
    schema: generatedProblemBriefSchema,
    prompt: buildBriefWriterPrompt(params.seed, researchPlan, params.sourceDossier),
    temperature: 0.2,
  });

  const generated = generatedProblemBriefSchema.parse(object) as GeneratedProblemBrief;
  const normalized = parseProblemBrief(generated);
  assertSourcedStatistics(normalized);
  return normalized;
}
