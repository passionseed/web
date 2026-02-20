import type { Phase1WorkflowInput, RawInstitutionLead, CRMFeedbackEvent } from "@/lib/ps-b2b/types";

interface BuildPayloadInput {
  geographiesInput: string;
  keywordsInput: string;
  minStudentCount: string;
  minAnnualTuitionUsd: string;
  topN: string;
  includeOutreach: boolean;
  useAIOutreach: boolean;
  leads: RawInstitutionLead[];
  feedbackEvents: CRMFeedbackEvent[];
}

export function splitCommaList(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function parseJsonArrayInput<T>(input: string): { value: T[]; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) return { value: [] };

  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      return { value: [], error: "Invalid JSON: expected an array" };
    }
    return { value: parsed as T[] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Parse error";
    return { value: [], error: `Invalid JSON: ${message}` };
  }
}

function toOptionalInt(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function buildPhase1Payload(input: BuildPayloadInput): Phase1WorkflowInput {
  const topNParsed = toOptionalInt(input.topN);

  return {
    filters: {
      geographies: splitCommaList(input.geographiesInput),
      keywords: splitCommaList(input.keywordsInput),
      minStudentCount: toOptionalInt(input.minStudentCount),
      minAnnualTuitionUsd: toOptionalNumber(input.minAnnualTuitionUsd),
    },
    seedLeads: input.leads,
    topN: topNParsed !== undefined ? Math.max(1, Math.min(topNParsed, 100)) : 10,
    includeOutreach: input.includeOutreach,
    useAIOutreach: input.useAIOutreach,
    feedbackEvents: input.feedbackEvents.length ? input.feedbackEvents : undefined,
  };
}
