import { createOutreachDraft } from "@/lib/ps-b2b/outreach";
import { getDefaultICPWeights, scoreLead } from "@/lib/ps-b2b/scoring";
import type { EnrichedInstitutionLead } from "@/lib/ps-b2b/types";

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const lead: EnrichedInstitutionLead = {
  id: "lead-outreach-1",
  name: "Riverside Preparatory Academy",
  website: "https://riversideprep.example.edu",
  geography: "Bangkok, Thailand",
  studentCount: 1200,
  annualTuitionUsd: 21000,
  notes: "Strong outcomes focus with expanding university advising and internship prep.",
  tags: ["college counseling", "career readiness", "university advising"],
  decisionMakers: [
    {
      fullName: "Emma Reid",
      role: "Head of University Guidance",
      email: "emma.reid@riversideprep.example.edu",
      linkedinUrl: "https://linkedin.com/in/emmareid",
    },
  ],
  inferredEmailPatterns: ["first.last@riversideprep.example.edu"],
  innovationSignals: ["career pathways pilot"],
  urgencySignals: ["advising team stretched during application season"],
  alignmentSignals: ["college counseling", "career readiness"],
  redFlags: [],
};

describe("createOutreachDraft", () => {
  it("generates constraint-safe outreach copy", async () => {
    const scoredLead = scoreLead(lead, getDefaultICPWeights());
    const draft = await createOutreachDraft(scoredLead, { useAI: false });

    expect(draft.subjectA.length).toBeGreaterThan(5);
    expect(draft.subjectB.length).toBeGreaterThan(5);
    expect(draft.subjectA).not.toEqual(draft.subjectB);

    expect(wordCount(draft.email)).toBeLessThanOrEqual(120);
    expect(wordCount(draft.linkedinMessage)).toBeLessThanOrEqual(120);

    expect(draft.email.toLowerCase()).toMatch(/would you be open|open to|if useful|happy to share/);
    expect(draft.linkedinMessage.toLowerCase()).toMatch(/would you be open|open to|if useful|happy to share/);
  });
});
