import type {
  DimensionBreakdown,
  EnrichedInstitutionLead,
  ICPWeights,
  ScoredLead,
  ScoreBreakdown,
} from "@/lib/ps-b2b/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function scaleTo100(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 100;
  return ((value - min) / (max - min)) * 100;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getDefaultICPWeights(): ICPWeights {
  return {
    budgetStrength: 25,
    problemUrgency: 25,
    innovationOpenness: 20,
    alignment: 20,
    easeOfAccess: 10,
  };
}

function budgetStrengthScore(lead: EnrichedInstitutionLead): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];

  const tuitionScore =
    lead.annualTuitionUsd !== undefined
      ? scaleTo100(lead.annualTuitionUsd, 4000, 45000)
      : 45;
  if (lead.annualTuitionUsd !== undefined) {
    reasoning.push(`Tuition signal from $${lead.annualTuitionUsd.toLocaleString()} annual tuition.`);
  } else {
    reasoning.push("Tuition missing; using conservative neutral score.");
  }

  const studentScore =
    lead.studentCount !== undefined
      ? scaleTo100(lead.studentCount, 250, 2500)
      : 45;
  if (lead.studentCount !== undefined) {
    reasoning.push(`Scale signal from ${lead.studentCount.toLocaleString()} students.`);
  } else {
    reasoning.push("Student count missing; using conservative neutral score.");
  }

  const score = clamp(Math.round((tuitionScore * 0.65) + (studentScore * 0.35)), 0, 100);
  return { score, reasoning };
}

function problemUrgencyScore(lead: EnrichedInstitutionLead): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];
  let score = 35;

  const urgencySignalBoost = Math.min(lead.urgencySignals.length, 3) * 12;
  score += urgencySignalBoost;
  if (urgencySignalBoost > 0) {
    reasoning.push(`Urgency language detected: ${lead.urgencySignals.join(", ")}.`);
  } else {
    reasoning.push("No explicit urgency phrases detected.");
  }

  if (lead.studentCount && lead.counselingProgramSize && lead.counselingProgramSize > 0) {
    const ratio = lead.studentCount / lead.counselingProgramSize;
    if (ratio >= 250) {
      score += 30;
      reasoning.push(`High counselor load (${Math.round(ratio)} students per counselor).`);
    } else if (ratio >= 180) {
      score += 20;
      reasoning.push(`Elevated counselor load (${Math.round(ratio)} students per counselor).`);
    } else if (ratio >= 130) {
      score += 10;
      reasoning.push(`Moderate counselor load (${Math.round(ratio)} students per counselor).`);
    } else {
      reasoning.push(`Manageable counselor load (${Math.round(ratio)} students per counselor).`);
    }
  } else {
    reasoning.push("Counseling team size unavailable; urgency inferred from text only.");
  }

  return { score: clamp(Math.round(score), 0, 100), reasoning };
}

function innovationOpennessScore(lead: EnrichedInstitutionLead): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];
  const signalCount = lead.innovationSignals.length;
  const score = clamp(Math.round(35 + (signalCount * 15)), 0, 100);

  if (signalCount > 0) {
    reasoning.push(`Innovation signals present: ${lead.innovationSignals.join(", ")}.`);
  } else {
    reasoning.push("No explicit innovation program signals found.");
  }

  return { score, reasoning };
}

function alignmentScore(lead: EnrichedInstitutionLead): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];
  const matchCount = lead.alignmentSignals.length;
  const score = clamp(Math.round(30 + (Math.min(matchCount, 5) * 13)), 0, 100);

  if (matchCount > 0) {
    reasoning.push(`ICP-aligned terms detected: ${lead.alignmentSignals.join(", ")}.`);
  } else {
    reasoning.push("No direct ICP-aligned terms detected in lead profile.");
  }

  return { score, reasoning };
}

function easeOfAccessScore(lead: EnrichedInstitutionLead): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];
  let score = 20;

  if (lead.decisionMakers.length > 0) {
    score += 25;
    reasoning.push(`${lead.decisionMakers.length} decision-maker contact(s) identified.`);
  } else {
    reasoning.push("No decision-maker contacts identified.");
  }

  const hasEmail = lead.decisionMakers.some((dm) => Boolean(dm.email));
  const hasLinkedIn = lead.decisionMakers.some((dm) => Boolean(dm.linkedinUrl));
  if (hasEmail) {
    score += 25;
    reasoning.push("At least one direct email available.");
  } else {
    reasoning.push("No direct email available.");
  }

  if (hasLinkedIn) {
    score += 15;
    reasoning.push("LinkedIn profile(s) available.");
  } else {
    reasoning.push("No LinkedIn profile attached.");
  }

  if (lead.inferredEmailPatterns.length > 0) {
    score += 10;
    reasoning.push(`Email pattern inferred: ${lead.inferredEmailPatterns.join(", ")}.`);
  }

  if (lead.website) {
    score += 5;
    reasoning.push("Institution website available for direct research.");
  }

  return { score: clamp(Math.round(score), 0, 100), reasoning };
}

function createBreakdown(weight: number, result: { score: number; reasoning: string[] }): DimensionBreakdown {
  return {
    score: result.score,
    weight,
    weightedScore: round2((result.score * weight) / 100),
    reasoning: result.reasoning,
  };
}

export function scoreLead(lead: EnrichedInstitutionLead, weights: ICPWeights): ScoredLead {
  const budgetStrength = createBreakdown(weights.budgetStrength, budgetStrengthScore(lead));
  const problemUrgency = createBreakdown(weights.problemUrgency, problemUrgencyScore(lead));
  const innovationOpenness = createBreakdown(weights.innovationOpenness, innovationOpennessScore(lead));
  const alignment = createBreakdown(weights.alignment, alignmentScore(lead));
  const easeOfAccess = createBreakdown(weights.easeOfAccess, easeOfAccessScore(lead));

  const breakdown: ScoreBreakdown = {
    budgetStrength,
    problemUrgency,
    innovationOpenness,
    alignment,
    easeOfAccess,
  };

  const totalScore = round2(
    budgetStrength.weightedScore +
      problemUrgency.weightedScore +
      innovationOpenness.weightedScore +
      alignment.weightedScore +
      easeOfAccess.weightedScore,
  );

  return {
    ...lead,
    totalScore,
    breakdown,
  };
}

export function scoreLeads(leads: EnrichedInstitutionLead[], weights: ICPWeights): ScoredLead[] {
  return leads.map((lead) => scoreLead(lead, weights));
}
