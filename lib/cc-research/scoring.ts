import type {
  CcICPWeights,
  CcEnrichedLead,
  CcScoredLead,
  CcScoreBreakdown,
} from "@/lib/cc-research/types";

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

function buildBreakdown(
  score: number,
  weight: number,
  reasoning: string[],
) {
  const weightedScore = round2((clamp(score, 0, 100) * weight) / 100);
  return {
    score: clamp(Math.round(score), 0, 100),
    weight,
    weightedScore,
    reasoning,
  };
}

function normalizeWeights(weights: CcICPWeights): CcICPWeights {
  const total =
    weights.studentScale +
    weights.advisorStaffing +
    weights.careerTransitionLanguage +
    weights.transferSignals +
    weights.easeOfContact;

  if (total <= 0) {
    return {
      studentScale: 30,
      advisorStaffing: 20,
      careerTransitionLanguage: 25,
      transferSignals: 15,
      easeOfContact: 10,
    };
  }

  return {
    studentScale: round2((weights.studentScale / total) * 100),
    advisorStaffing: round2((weights.advisorStaffing / total) * 100),
    careerTransitionLanguage: round2((weights.careerTransitionLanguage / total) * 100),
    transferSignals: round2((weights.transferSignals / total) * 100),
    easeOfContact: round2((weights.easeOfContact / total) * 100),
  };
}

function scoreStudentScale(lead: CcEnrichedLead): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];

  const studentSignal = lead.studentCount !== undefined ? scaleTo100(lead.studentCount, 250, 16000) : 40;
  const tuitionSignal = lead.tuition !== undefined ? scaleTo100(lead.tuition, 3000, 45000) : 40;

  if (lead.studentCount !== undefined) {
    reasoning.push(`Student scale signal from ${lead.studentCount.toLocaleString()} students.`);
  } else {
    reasoning.push("Student count missing; using neutral baseline.");
  }

  if (lead.tuition !== undefined) {
    reasoning.push(`Tuition signal from ${lead.tuition.toLocaleString()} value.`);
  } else {
    reasoning.push("Tuition missing; using neutral baseline.");
  }

  return {
    score: clamp(Math.round((studentSignal * 0.68) + (tuitionSignal * 0.32)), 0, 100),
    reasoning,
  };
}

function scoreAdvisorStaffing(lead: CcEnrichedLead): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];
  let score = 25;

  if (lead.advisorSignals.length > 0) {
    const bump = Math.min(lead.advisorSignals.length * 10, 38);
    score += bump;
    reasoning.push(`Advisor signals: ${lead.advisorSignals.join(", ")}`);
  } else {
    reasoning.push("No explicit advisor staffing signals.");
  }

  const contacts = lead.decisionMakers.length;
  if (contacts > 0) {
    const contactBoost = Math.min(contacts * 7, 30);
    score += contactBoost;
    reasoning.push(`${contacts} named contact(s) provided.`);
  } else {
    reasoning.push("No contacts seeded yet.");
  }

  if (lead.roleSignals.length > 0) {
    reasoning.push(`Role signals: ${lead.roleSignals.join(", ")}`);
  }

  return {
    score: clamp(Math.round(score), 0, 100),
    reasoning,
  };
}

function scoreCareerTransition(lead: CcEnrichedLead): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];

  if (lead.careerTransitionSignals.length > 0) {
    const base = 58 + Math.min(lead.careerTransitionSignals.length, 4) * 10;
    reasoning.push(`Career-transition signals: ${lead.careerTransitionSignals.join(", ")}`);
    return {
      score: clamp(base, 0, 100),
      reasoning,
    };
  }

  reasoning.push("No direct career-transition language detected.");
  return {
    score: 38,
    reasoning,
  };
}

function scoreTransferSignals(lead: CcEnrichedLead): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];

  if (lead.transferSignals.length > 0) {
    const base = 52 + Math.min(lead.transferSignals.length, 4) * 11;
    reasoning.push(`Transfer-related signals: ${lead.transferSignals.join(", ")}`);
    return {
      score: clamp(base, 0, 100),
      reasoning,
    };
  }

  reasoning.push("No transfer signals detected.");
  return {
    score: 34,
    reasoning,
  };
}

function scoreEaseOfContact(lead: CcEnrichedLead): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];
  let score = 22;

  const directEmails = lead.decisionMakers.filter((dm) => Boolean(dm.email)).length;
  const linkedInProfiles = lead.decisionMakers.filter((dm) => Boolean(dm.linkedinUrl)).length;

  if (directEmails > 0) {
    score += Math.min(directEmails * 16, 36);
    reasoning.push(`${directEmails} direct email(s).`);
  } else {
    reasoning.push("No direct email on seed contacts.");
  }

  if (linkedInProfiles > 0) {
    score += Math.min(linkedInProfiles * 11, 25);
    reasoning.push(`${linkedInProfiles} LinkedIn profile(s).`);
  } else {
    reasoning.push("No LinkedIn profile found in seed.");
  }

  if (lead.inferredEmailPatterns.length > 0) {
    score += 9;
    reasoning.push(`Inferred pattern clues: ${lead.inferredEmailPatterns.join(", ")}`);
  }

  if (lead.redFlags.length > 2) {
    reasoning.push("Multiple red flags present; reducing confidence." );
  }

  return {
    score: clamp(Math.round(score), 0, 100),
    reasoning,
  };
}

export function defaultCcWeights(): CcICPWeights {
  return {
    studentScale: 30,
    advisorStaffing: 20,
    careerTransitionLanguage: 25,
    transferSignals: 15,
    easeOfContact: 10,
  };
}

export function scoreCcLead(lead: CcEnrichedLead, weights: CcICPWeights): CcScoredLead {
  const normalizedWeights = normalizeWeights(weights);

  const student = scoreStudentScale(lead);
  const advisor = scoreAdvisorStaffing(lead);
  const careerTransition = scoreCareerTransition(lead);
  const transfer = scoreTransferSignals(lead);
  const contact = scoreEaseOfContact(lead);

  const breakdown: CcScoreBreakdown = {
    studentScale: buildBreakdown(student.score, normalizedWeights.studentScale, student.reasoning),
    advisorStaffing: buildBreakdown(advisor.score, normalizedWeights.advisorStaffing, advisor.reasoning),
    careerTransitionLanguage: buildBreakdown(
      careerTransition.score,
      normalizedWeights.careerTransitionLanguage,
      careerTransition.reasoning,
    ),
    transferSignals: buildBreakdown(transfer.score, normalizedWeights.transferSignals, transfer.reasoning),
    easeOfContact: buildBreakdown(contact.score, normalizedWeights.easeOfContact, contact.reasoning),
  };

  const totalScore = round2(
    breakdown.studentScale.weightedScore +
      breakdown.advisorStaffing.weightedScore +
      breakdown.careerTransitionLanguage.weightedScore +
      breakdown.transferSignals.weightedScore +
      breakdown.easeOfContact.weightedScore,
  );

  const urgencyScore = Math.round(
    clamp((0.6 * transfer.score) + (0.4 * careerTransition.score), 0, 100),
  );

  const icpFitScore = Math.round(
    clamp(
      0.32 * student.score +
        0.2 * advisor.score +
        0.24 * careerTransition.score +
        0.12 * transfer.score +
        0.12 * contact.score,
      0,
      100,
    ),
  );

  const weightedScoreBand =
    totalScore >= 81
      ? "81-100"
      : totalScore >= 61
        ? "61-80"
        : totalScore >= 41
          ? "41-60"
          : "0-40";

  return {
    id: lead.id,
    institutionName: lead.institutionName,
    institutionWebsite: lead.institutionWebsite,
    geography: lead.geography,
    studentCount: lead.studentCount,
    tuition: lead.tuition,
    programTags: lead.programTags,
    notes: lead.notes,
    source: lead.source,
    decisionMakers: lead.decisionMakers,
    inferredEmailPatterns: lead.inferredEmailPatterns,
    careerTransitionSignals: lead.careerTransitionSignals,
    transferSignals: lead.transferSignals,
    advisorSignals: lead.advisorSignals,
    roleSignals: lead.roleSignals,
    redFlags: lead.redFlags,
    totalScore,
    urgencyScore,
    icpFitScore,
    weightedScoreBand,
    breakdown,
  };
}

export function scoreCcLeads(leads: CcEnrichedLead[], weights: CcICPWeights): CcScoredLead[] {
  return leads.map((lead) => scoreCcLead(lead, weights));
}

export function rankCcLeadsByScore(scored: CcScoredLead[]): CcScoredLead[] {
  return [...scored].sort((a, b) => {
    if (b.totalScore === a.totalScore) {
      return b.urgencyScore - a.urgencyScore;
    }
    return b.totalScore - a.totalScore;
  });
}
