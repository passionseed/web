import type { DecisionMaker, EnrichedInstitutionLead, RawInstitutionLead } from "@/lib/ps-b2b/types";

const INNOVATION_KEYWORDS = [
  "ai",
  "artificial intelligence",
  "innovation",
  "internship",
  "future-ready",
  "career pathway",
  "entrepreneurship",
];

const URGENCY_KEYWORDS = [
  "counseling load",
  "caseload",
  "application season",
  "overwhelmed",
  "stretched",
  "expanding",
  "growing",
];

const ALIGNMENT_KEYWORDS = [
  "college counseling",
  "university advising",
  "university counseling",
  "career readiness",
  "college readiness",
  "matriculation",
];

function normalizedText(lead: RawInstitutionLead): string {
  return [lead.name, lead.notes, lead.geography, ...(lead.tags || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function findKeywordSignals(text: string, keywords: string[]): string[] {
  return keywords.filter((keyword) => text.includes(keyword));
}

function inferDomain(website: string): string {
  try {
    return new URL(website).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function inferEmailPatterns(decisionMakers: DecisionMaker[], domain: string): string[] {
  const patterns = new Set<string>();
  const domainSuffix = domain ? `@${domain}` : "";

  for (const person of decisionMakers) {
    if (!person.email || !domainSuffix || !person.email.toLowerCase().endsWith(domainSuffix)) continue;
    const localPart = person.email.split("@")[0].toLowerCase();
    const nameParts = person.fullName
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    if (nameParts.length < 2) continue;

    const [first, ...rest] = nameParts;
    const last = rest[rest.length - 1];
    if (localPart === `${first}.${last}`) patterns.add("first.last");
    if (localPart === `${first}${last}`) patterns.add("firstlast");
    if (localPart === `${first[0]}${last}`) patterns.add("flast");
    if (localPart === `${first}_${last}`) patterns.add("first_last");
  }

  if (!patterns.size && domain && decisionMakers.length > 0) {
    patterns.add("first.last");
    patterns.add("flast");
  }

  return Array.from(patterns).map((pattern) => `${pattern}@${domain}`);
}

function buildRedFlags(lead: RawInstitutionLead, decisionMakers: DecisionMaker[], alignmentSignals: string[]): string[] {
  const redFlags: string[] = [];
  if (!lead.studentCount) redFlags.push("Missing student count");
  if (!lead.annualTuitionUsd) redFlags.push("Missing tuition data");
  if (!decisionMakers.length) redFlags.push("No named decision maker");
  if (!alignmentSignals.length) redFlags.push("Weak ICP keyword alignment");
  return redFlags;
}

function toLeadId(lead: RawInstitutionLead, domain: string): string {
  if (lead.id?.trim()) return lead.id;
  if (domain) return `lead-${domain.replace(/[^a-z0-9]+/g, "-")}`;
  return `lead-${lead.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function enrichLead(lead: RawInstitutionLead): EnrichedInstitutionLead {
  const domain = inferDomain(lead.website);
  const text = normalizedText(lead);
  const decisionMakers: DecisionMaker[] = (lead.decisionMakers || []).map((dm) => ({
    fullName: dm.fullName.trim(),
    role: dm.role.trim(),
    email: dm.email?.trim(),
    linkedinUrl: dm.linkedinUrl?.trim(),
  }));

  const innovationSignals = findKeywordSignals(text, INNOVATION_KEYWORDS);
  const urgencySignals = findKeywordSignals(text, URGENCY_KEYWORDS);
  const alignmentSignals = findKeywordSignals(text, ALIGNMENT_KEYWORDS);
  const inferredEmailPatterns = inferEmailPatterns(decisionMakers, domain);
  const redFlags = buildRedFlags(lead, decisionMakers, alignmentSignals);

  return {
    id: toLeadId(lead, domain),
    name: lead.name,
    website: lead.website,
    geography: lead.geography,
    studentCount: lead.studentCount,
    annualTuitionUsd: lead.annualTuitionUsd,
    counselingProgramSize: lead.counselingProgramSize,
    notes: lead.notes,
    tags: lead.tags || [],
    decisionMakers,
    inferredEmailPatterns,
    innovationSignals,
    urgencySignals,
    alignmentSignals,
    redFlags,
  };
}

export function enrichLeads(leads: RawInstitutionLead[]): EnrichedInstitutionLead[] {
  return leads.map(enrichLead);
}
