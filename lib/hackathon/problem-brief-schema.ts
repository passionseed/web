import { z } from "zod";

const localizedTextInputSchema = z.union([
  z.string(),
  z.object({
    en: z.string(),
    th: z.string().optional(),
  }),
]);

const sourceInputSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  publisher: z.string().optional(),
  year: z.union([z.string(), z.number()]).optional(),
});

const statisticInputSchema = z.object({
  stat: localizedTextInputSchema,
  source: z.string().optional(),
  year: z.union([z.string(), z.number()]).optional(),
  sources: z.array(sourceInputSchema).optional(),
});

const affectedPopulationInputSchema = z.object({
  group: localizedTextInputSchema,
  size: localizedTextInputSchema,
  painPoints: z.array(localizedTextInputSchema).optional(),
});

const stakeholderInputSchema = z.object({
  role: localizedTextInputSchema.optional(),
  stakeholder: localizedTextInputSchema.optional(),
  needs: z.array(localizedTextInputSchema).optional(),
  painPoints: z.array(localizedTextInputSchema).optional(),
  influence: localizedTextInputSchema.optional(),
  interest: localizedTextInputSchema.optional(),
});

const rootCauseInputSchema = z.object({
  cause: localizedTextInputSchema,
  explanation: localizedTextInputSchema,
  systemic: z.boolean(),
});

const existingSolutionInputSchema = z.object({
  name: localizedTextInputSchema,
  approach: localizedTextInputSchema,
  strengths: z.array(localizedTextInputSchema).optional(),
  weaknesses: z.array(localizedTextInputSchema).optional(),
  region: localizedTextInputSchema,
});

const opportunityAreaInputSchema = z.object({
  area: localizedTextInputSchema,
  description: localizedTextInputSchema,
  potentialImpact: localizedTextInputSchema.optional(),
  feasibility: localizedTextInputSchema,
});

const resourceInputSchema = z.object({
  title: z.string().min(1),
  type: z.string().min(1),
  url: z.string().url(),
  description: z.string().min(1),
});

const deepResearchInputSchema = z.object({
  title: localizedTextInputSchema,
  summary: localizedTextInputSchema,
  evidence: z.array(
    z.object({
      claim: localizedTextInputSchema,
      sources: z.array(sourceInputSchema).min(1),
    }),
  ).min(1),
});

const gradingDimensionInputSchema = z.object({
  score: z.number().int().min(0).max(10),
  justification: localizedTextInputSchema,
});

export const problemBriefInputSchema = z.object({
  problemId: z.string().min(1),
  title: localizedTextInputSchema,
  track: z.string().min(1),
  trackNum: z.string().min(1),
  color: z.string().min(1),
  hook: localizedTextInputSchema,
  challenge: localizedTextInputSchema,
  tangibleEquivalent: localizedTextInputSchema.optional(),
  tags: z.array(z.string()).default([]),
  grading: z.object({
    severity: gradingDimensionInputSchema,
    difficulty: gradingDimensionInputSchema,
    impact: gradingDimensionInputSchema,
    urgency: gradingDimensionInputSchema,
  }),
  statistics: z.array(statisticInputSchema).default([]),
  affectedPopulations: z.array(affectedPopulationInputSchema).default([]),
  stakeholderMap: z.object({
    primary: z.array(stakeholderInputSchema).default([]),
    secondary: z.array(stakeholderInputSchema).default([]),
  }),
  rootCauses: z.array(rootCauseInputSchema).default([]),
  existingSolutions: z.array(existingSolutionInputSchema).default([]),
  opportunityAreas: z.array(opportunityAreaInputSchema).default([]),
  resources: z.array(resourceInputSchema).default([]),
  keyInsights: z.array(localizedTextInputSchema).default([]),
  deepResearch: z.array(deepResearchInputSchema).optional(),
});

export type LocalizedText = {
  en: string;
  th: string;
};

export type ProblemBriefSource = {
  label: string;
  url: string;
  publisher?: string;
  year?: string;
};

export type ProblemBrief = {
  problemId: string;
  title: LocalizedText;
  track: string;
  trackNum: string;
  color: string;
  hook: LocalizedText;
  challenge: LocalizedText;
  tangibleEquivalent?: LocalizedText;
  tags: string[];
  grading: {
    severity: { score: number; justification: LocalizedText };
    difficulty: { score: number; justification: LocalizedText };
    impact: { score: number; justification: LocalizedText };
    urgency: { score: number; justification: LocalizedText };
  };
  statistics: Array<{
    stat: LocalizedText;
    year?: string;
    sources: ProblemBriefSource[];
  }>;
  affectedPopulations: Array<{
    group: LocalizedText;
    size: LocalizedText;
    painPoints: LocalizedText[];
  }>;
  stakeholderMap: {
    primary: Array<{
      role: LocalizedText;
      needs: LocalizedText[];
      painPoints: LocalizedText[];
      influence?: LocalizedText;
      interest?: LocalizedText;
    }>;
    secondary: Array<{
      role: LocalizedText;
      needs: LocalizedText[];
      painPoints: LocalizedText[];
      influence?: LocalizedText;
      interest?: LocalizedText;
    }>;
  };
  rootCauses: Array<{
    cause: LocalizedText;
    explanation: LocalizedText;
    systemic: boolean;
  }>;
  existingSolutions: Array<{
    name: LocalizedText;
    approach: LocalizedText;
    strengths: LocalizedText[];
    weaknesses: LocalizedText[];
    region: LocalizedText;
  }>;
  opportunityAreas: Array<{
    area: LocalizedText;
    description: LocalizedText;
    potentialImpact?: LocalizedText;
    feasibility: LocalizedText;
  }>;
  resources: Array<{
    title: string;
    type: string;
    url: string;
    description: string;
  }>;
  keyInsights: LocalizedText[];
  deepResearch?: Array<{
    title: LocalizedText;
    summary: LocalizedText;
    evidence: Array<{
      claim: LocalizedText;
      sources: ProblemBriefSource[];
    }>;
  }>;
};

function cleanText(input: string | undefined | null, fallback = ""): string {
  const value = (input || "")
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .trim();

  return value || fallback;
}

function normalizeLocalizedText(input: z.infer<typeof localizedTextInputSchema>, fallback = ""): LocalizedText {
  if (typeof input === "string") {
    const value = cleanText(input, fallback);
    return { en: value, th: value };
  }

  const en = cleanText(input.en, fallback);
  return {
    en,
    th: cleanText(input.th, en),
  };
}

function normalizeLocalizedList(items: Array<z.infer<typeof localizedTextInputSchema>> | undefined): LocalizedText[] {
  return (items || []).map((item) => normalizeLocalizedText(item)).filter((item) => item.en);
}

function normalizeSource(source: z.infer<typeof sourceInputSchema>): ProblemBriefSource {
  return {
    label: cleanText(source.label),
    url: cleanText(source.url),
    publisher: cleanText(source.publisher),
    year: source.year === undefined ? undefined : String(source.year),
  };
}

function normalizeSearchKey(value: string | undefined): string {
  return (value || "").toLowerCase().replace(/[^a-z0-9ก-๙]+/g, " ").trim();
}

function inferSourcesFromResources(
  sourceLabel: string | undefined,
  resources: ProblemBrief["resources"],
): ProblemBriefSource[] {
  const searchKey = normalizeSearchKey(sourceLabel);
  if (!searchKey) {
    return [];
  }

  return resources
    .filter((resource) => {
      const titleKey = normalizeSearchKey(resource.title);
      return titleKey.includes(searchKey) || searchKey.includes(titleKey);
    })
    .map((resource) => ({
      label: resource.title,
      url: resource.url,
    }));
}

export function getLocalizedText(
  text: LocalizedText | string | null | undefined,
  lang: "en" | "th",
): string {
  if (!text) {
    return "";
  }

  if (typeof text === "string") {
    return text;
  }

  return text[lang] || text.en || text.th || "";
}

export function parseProblemBrief(input: unknown): ProblemBrief {
  const parsed = problemBriefInputSchema.parse(input);
  const resources = parsed.resources.map((resource) => ({
    title: cleanText(resource.title),
    type: cleanText(resource.type),
    url: cleanText(resource.url),
    description: cleanText(resource.description),
  }));

  return {
    problemId: cleanText(parsed.problemId),
    title: normalizeLocalizedText(parsed.title),
    track: cleanText(parsed.track),
    trackNum: cleanText(parsed.trackNum),
    color: cleanText(parsed.color),
    hook: normalizeLocalizedText(parsed.hook),
    challenge: normalizeLocalizedText(parsed.challenge),
    tangibleEquivalent: parsed.tangibleEquivalent
      ? normalizeLocalizedText(parsed.tangibleEquivalent)
      : undefined,
    tags: parsed.tags.map((tag) => cleanText(tag)).filter(Boolean),
    grading: {
      severity: {
        score: parsed.grading.severity.score,
        justification: normalizeLocalizedText(parsed.grading.severity.justification),
      },
      difficulty: {
        score: parsed.grading.difficulty.score,
        justification: normalizeLocalizedText(parsed.grading.difficulty.justification),
      },
      impact: {
        score: parsed.grading.impact.score,
        justification: normalizeLocalizedText(parsed.grading.impact.justification),
      },
      urgency: {
        score: parsed.grading.urgency.score,
        justification: normalizeLocalizedText(parsed.grading.urgency.justification),
      },
    },
    statistics: parsed.statistics.map((statistic) => ({
      stat: normalizeLocalizedText(statistic.stat),
      year: statistic.year === undefined ? undefined : String(statistic.year),
      sources: statistic.sources?.map(normalizeSource) || inferSourcesFromResources(statistic.source, resources),
    })),
    affectedPopulations: parsed.affectedPopulations.map((population) => ({
      group: normalizeLocalizedText(population.group),
      size: normalizeLocalizedText(population.size),
      painPoints: normalizeLocalizedList(population.painPoints),
    })),
    stakeholderMap: {
      primary: parsed.stakeholderMap.primary.map((stakeholder) => ({
        role: normalizeLocalizedText(stakeholder.role || stakeholder.stakeholder || "Unknown stakeholder"),
        needs: normalizeLocalizedList(stakeholder.needs),
        painPoints: normalizeLocalizedList(stakeholder.painPoints),
        influence: stakeholder.influence ? normalizeLocalizedText(stakeholder.influence) : undefined,
        interest: stakeholder.interest ? normalizeLocalizedText(stakeholder.interest) : undefined,
      })),
      secondary: parsed.stakeholderMap.secondary.map((stakeholder) => ({
        role: normalizeLocalizedText(stakeholder.role || stakeholder.stakeholder || "Unknown stakeholder"),
        needs: normalizeLocalizedList(stakeholder.needs),
        painPoints: normalizeLocalizedList(stakeholder.painPoints),
        influence: stakeholder.influence ? normalizeLocalizedText(stakeholder.influence) : undefined,
        interest: stakeholder.interest ? normalizeLocalizedText(stakeholder.interest) : undefined,
      })),
    },
    rootCauses: parsed.rootCauses.map((rootCause) => ({
      cause: normalizeLocalizedText(rootCause.cause),
      explanation: normalizeLocalizedText(rootCause.explanation),
      systemic: rootCause.systemic,
    })),
    existingSolutions: parsed.existingSolutions.map((solution) => ({
      name: normalizeLocalizedText(solution.name),
      approach: normalizeLocalizedText(solution.approach),
      strengths: normalizeLocalizedList(solution.strengths),
      weaknesses: normalizeLocalizedList(solution.weaknesses),
      region: normalizeLocalizedText(solution.region),
    })),
    opportunityAreas: parsed.opportunityAreas.map((opportunity) => ({
      area: normalizeLocalizedText(opportunity.area),
      description: normalizeLocalizedText(opportunity.description),
      potentialImpact: opportunity.potentialImpact ? normalizeLocalizedText(opportunity.potentialImpact) : undefined,
      feasibility: normalizeLocalizedText(opportunity.feasibility),
    })),
    resources,
    keyInsights: normalizeLocalizedList(parsed.keyInsights),
    deepResearch: parsed.deepResearch?.map((section) => ({
      title: normalizeLocalizedText(section.title),
      summary: normalizeLocalizedText(section.summary),
      evidence: section.evidence.map((item) => ({
        claim: normalizeLocalizedText(item.claim),
        sources: item.sources.map(normalizeSource),
      })),
    })),
  };
}
