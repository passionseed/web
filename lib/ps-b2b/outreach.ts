import { z } from "zod";
import type { OutreachDraft, ScoredLead } from "@/lib/ps-b2b/types";

const BUZZWORDS = [
  "revolutionary",
  "synergy",
  "disrupt",
  "cutting-edge",
  "world-class",
  "best-in-class",
];

const outreachSchema = z.object({
  subjectA: z.string().min(3),
  subjectB: z.string().min(3),
  email: z.string().min(20),
  linkedinMessage: z.string().min(20),
});

function cleanWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function countWords(text: string): number {
  return cleanWhitespace(text).split(" ").filter(Boolean).length;
}

function trimToWordLimit(text: string, maxWords: number): string {
  const words = cleanWhitespace(text).split(" ").filter(Boolean);
  if (words.length <= maxWords) return cleanWhitespace(text);
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function removeBuzzwords(text: string): string {
  let normalized = text;
  for (const buzzword of BUZZWORDS) {
    const regex = new RegExp(`\\b${buzzword.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "ig");
    normalized = normalized.replace(regex, "");
  }
  return cleanWhitespace(normalized);
}

function ensureSoftCTA(text: string, maxWords: number): string {
  const ctaRegex = /would you be open|open to|if useful|happy to share/i;
  if (ctaRegex.test(text)) return trimToWordLimit(text, maxWords);

  const suffix = "If useful, would you be open to a short call next week?";
  return trimToWordLimit(`${text} ${suffix}`, maxWords);
}

function enforceMessageRules(text: string): string {
  return ensureSoftCTA(trimToWordLimit(removeBuzzwords(text), 120), 120);
}

function firstNameFromLead(lead: ScoredLead): string {
  const first = lead.decisionMakers[0]?.fullName?.split(" ")[0];
  return first && first.length >= 2 ? first : "there";
}

function buildTemplateDraft(lead: ScoredLead): OutreachDraft {
  const primarySignal = lead.alignmentSignals[0] || "student outcomes";
  const introName = firstNameFromLead(lead);

  const subjectA = `${lead.name}: improving ${primarySignal}`;
  const subjectB = `${lead.name} and stronger university outcomes`;

  const emailRaw = `Hi ${introName}, I noticed ${lead.name} is investing in ${primarySignal}. PassionSeed helps counseling teams give students clearer next-step pathways while reducing advisor workload during peak application periods. Teams usually use it for progress visibility, practical guidance, and stronger student follow-through. If useful, happy to share a short example from a similar institution. Would you be open to a 15-minute intro next week?`;

  const linkedinRaw = `Hi ${introName}, saw your work at ${lead.name} around ${primarySignal}. We help schools strengthen counseling outcomes without adding process overhead for advisors. If useful, happy to share a short example and learn how your team currently supports student readiness. Would you be open to connecting for a quick chat?`;

  return {
    leadId: lead.id,
    subjectA: cleanWhitespace(subjectA),
    subjectB: cleanWhitespace(subjectB),
    email: enforceMessageRules(emailRaw),
    linkedinMessage: enforceMessageRules(linkedinRaw),
    usedAI: false,
  };
}

function hasAnyAIKey(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.ANTHROPIC_API_KEY,
  );
}

async function buildAIDraft(lead: ScoredLead): Promise<OutreachDraft | null> {
  if (!hasAnyAIKey()) return null;

  const decisionMaker = lead.decisionMakers[0];
  const prompt = [
    "Write B2B outreach copy for an education institution lead.",
    "Rules:",
    "- Email <= 120 words",
    "- LinkedIn message <= 120 words",
    "- No buzzwords or hype",
    "- Focus on student outcomes",
    "- Soft CTA only",
    "",
    `Institution: ${lead.name}`,
    `Geography: ${lead.geography || "unknown"}`,
    `Top alignment signals: ${lead.alignmentSignals.join(", ") || "none"}`,
    `Top urgency signals: ${lead.urgencySignals.join(", ") || "none"}`,
    `Decision maker: ${decisionMaker ? `${decisionMaker.fullName} (${decisionMaker.role})` : "unknown"}`,
  ].join("\n");

  try {
    const [{ generateObject }, { getModel }] = await Promise.all([
      import("ai"),
      import("@/lib/ai/modelRegistry"),
    ]);

    const { object } = await generateObject({
      model: getModel("gpt-5-mini-2025-08-07"),
      schema: outreachSchema,
      prompt,
      temperature: 0.4,
    });
    const parsed = outreachSchema.parse(object);
    return {
      leadId: lead.id,
      subjectA: cleanWhitespace(parsed.subjectA),
      subjectB: cleanWhitespace(parsed.subjectB),
      email: enforceMessageRules(parsed.email),
      linkedinMessage: enforceMessageRules(parsed.linkedinMessage),
      usedAI: true,
    };
  } catch (error) {
    console.warn("[ps-b2b.outreach] AI draft failed, falling back to template", error);
    return null;
  }
}

export async function createOutreachDraft(
  lead: ScoredLead,
  options?: { useAI?: boolean },
): Promise<OutreachDraft> {
  if (options?.useAI) {
    const aiDraft = await buildAIDraft(lead);
    if (aiDraft) return aiDraft;
  }
  return buildTemplateDraft(lead);
}
