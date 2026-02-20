import type { CcOutreachDraft, CcScoredLead } from "@/lib/cc-research/types";

function cleanWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function wordLimit(text: string, maxWords: number): string {
  const tokens = cleanWhitespace(text).split(" ").filter(Boolean);
  if (tokens.length <= maxWords) {
    return cleanWhitespace(text);
  }
  return `${tokens.slice(0, maxWords).join(" ")}...`;
}

function enforceTone(text: string): string {
  const trimmed = cleanWhitespace(text);
  if (/(would you be open|open to|happy to share|if useful)/i.test(trimmed)) {
    return wordLimit(trimmed, 120);
  }

  return wordLimit(`${trimmed} If useful, would you be open to a short call next week?`, 120);
}

function firstNameFromContacts(lead: CcScoredLead): string {
  const first = lead.decisionMakers?.[0]?.fullName?.split(" ")[0];
  return first && first.length >= 2 ? first : "there";
}

function pickSignalText(lead: CcScoredLead): string {
  return (
    lead.transferSignals[0] ||
    lead.careerTransitionSignals[0] ||
    lead.advisorSignals[0] ||
    "student readiness"
  );
}

export function createCcOutreachDraft(lead: CcScoredLead): CcOutreachDraft {
  const firstName = firstNameFromContacts(lead);
  const signalText = pickSignalText(lead);

  const subjectA = enforceTone(`How ${lead.institutionName} could improve transitions for ${signalText}`);
  const subjectB = enforceTone(`${lead.institutionName} + clearer career-transition pathways`);

  const email = enforceTone(
    `Hi ${firstName},\n\nI noticed ${lead.institutionName} has active ${signalText}. We help community-college teams help students move from readiness to career outcomes with low-friction advisor workflows.\n\nIf useful, happy to share a practical pilot outline that combines career planning signals, transfer pathways, and advisor handoff tools.\n\nWould you be open to a short call this week?`,
  );

  const linkedinMessage = enforceTone(
    `Hi ${firstName}, I saw ${lead.institutionName} mentions ${signalText}. We work with CC teams to improve transfer guidance and counselor time usage.\n\nIf useful, happy to share a few examples and hear how you currently manage student career planning workflows.`,
  );

  return {
    leadId: lead.id,
    subjectA,
    subjectB,
    email,
    linkedinMessage,
  };
}

export function createCcOutreachDrafts(leads: CcScoredLead[]): CcOutreachDraft[] {
  return leads.map(createCcOutreachDraft);
}
