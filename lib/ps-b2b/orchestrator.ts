import { discoverLeads } from "@/lib/ps-b2b/discovery";
import { enrichLeads } from "@/lib/ps-b2b/enrichment";
import { applyFeedbackLearning } from "@/lib/ps-b2b/feedback";
import { createOutreachDraft } from "@/lib/ps-b2b/outreach";
import { getDefaultICPWeights, scoreLeads } from "@/lib/ps-b2b/scoring";
import type { Phase1WorkflowInput, Phase1WorkflowOutput } from "@/lib/ps-b2b/types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function runPhase1Workflow(input: Phase1WorkflowInput): Promise<Phase1WorkflowOutput> {
  const includeOutreach = input.includeOutreach ?? true;
  const requestedTopN = input.topN ?? 10;
  const topN = Math.max(1, Math.min(requestedTopN, 100));
  const modelWeights = input.currentWeights || getDefaultICPWeights();

  const discovered = discoverLeads(input.seedLeads, input.filters);
  const enriched = enrichLeads(discovered);
  const scored = scoreLeads(enriched, modelWeights).sort((a, b) => b.totalScore - a.totalScore);
  const topLeads = scored.slice(0, topN);

  const outreachByLeadId = new Map<string, Awaited<ReturnType<typeof createOutreachDraft>>>();
  if (includeOutreach) {
    const drafts = await Promise.all(
      topLeads.map((lead) => createOutreachDraft(lead, { useAI: input.useAIOutreach })),
    );
    for (const draft of drafts) outreachByLeadId.set(draft.leadId, draft);
  }

  const topLeadsWithOutreach = topLeads.map((lead) => ({
    ...lead,
    outreach: outreachByLeadId.get(lead.id),
  }));

  const feedbackLearning =
    input.feedbackEvents && input.feedbackEvents.length > 0
      ? applyFeedbackLearning(modelWeights, input.feedbackEvents)
      : undefined;

  const averageScore = scored.length
    ? round2(scored.reduce((sum, lead) => sum + lead.totalScore, 0) / scored.length)
    : 0;

  return {
    modelWeights,
    pipelineStats: {
      discoveredCount: discovered.length,
      scoredCount: scored.length,
      topCount: topLeadsWithOutreach.length,
      averageScore,
    },
    leads: scored,
    topLeads: topLeadsWithOutreach,
    feedbackLearning,
  };
}
