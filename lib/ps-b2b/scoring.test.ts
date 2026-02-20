import { getDefaultICPWeights, scoreLead } from "@/lib/ps-b2b/scoring";
import type { EnrichedInstitutionLead } from "@/lib/ps-b2b/types";

function makeLead(overrides: Partial<EnrichedInstitutionLead>): EnrichedInstitutionLead {
  return {
    id: "lead-1",
    name: "Northbridge International School",
    website: "https://northbridge.example.edu",
    geography: "Bangkok, Thailand",
    studentCount: 1800,
    annualTuitionUsd: 32000,
    notes: "Strong college counseling team and growing career-readiness initiatives.",
    tags: ["college counseling", "career readiness", "ai program", "internships"],
    decisionMakers: [
      {
        fullName: "Jane Carter",
        role: "Director of College Counseling",
        email: "jane.carter@northbridge.example.edu",
        linkedinUrl: "https://linkedin.com/in/jane-carter",
      },
    ],
    inferredEmailPatterns: ["first.last@northbridge.example.edu"],
    innovationSignals: ["AI lab", "industry internship program"],
    urgencySignals: ["expanded counseling caseload"],
    alignmentSignals: ["college counseling", "career readiness"],
    redFlags: [],
    ...overrides,
  };
}

describe("scoreLead", () => {
  it("scores stronger leads above weaker ones with transparent breakdown", () => {
    const strongLead = makeLead({});
    const weakLead = makeLead({
      id: "lead-2",
      name: "Smalltown School",
      studentCount: 260,
      annualTuitionUsd: 3500,
      tags: ["arts"],
      decisionMakers: [],
      inferredEmailPatterns: [],
      innovationSignals: [],
      urgencySignals: [],
      alignmentSignals: [],
      redFlags: ["No clear decision-maker found."],
    });

    const model = getDefaultICPWeights();
    const strongScored = scoreLead(strongLead, model);
    const weakScored = scoreLead(weakLead, model);

    expect(strongScored.totalScore).toBeGreaterThan(weakScored.totalScore);
    expect(strongScored.totalScore).toBeGreaterThanOrEqual(60);
    expect(weakScored.totalScore).toBeLessThan(60);

    expect(strongScored.breakdown.budgetStrength.reasoning.length).toBeGreaterThan(0);
    expect(strongScored.breakdown.problemUrgency.reasoning.length).toBeGreaterThan(0);
    expect(strongScored.breakdown.innovationOpenness.reasoning.length).toBeGreaterThan(0);
    expect(strongScored.breakdown.alignment.reasoning.length).toBeGreaterThan(0);
    expect(strongScored.breakdown.easeOfAccess.reasoning.length).toBeGreaterThan(0);
  });

  it("keeps weighted contributions consistent with total score", () => {
    const scored = scoreLead(makeLead({}), getDefaultICPWeights());
    const sumWeighted =
      scored.breakdown.budgetStrength.weightedScore +
      scored.breakdown.problemUrgency.weightedScore +
      scored.breakdown.innovationOpenness.weightedScore +
      scored.breakdown.alignment.weightedScore +
      scored.breakdown.easeOfAccess.weightedScore;

    expect(Math.abs(sumWeighted - scored.totalScore)).toBeLessThan(0.001);
  });
});
