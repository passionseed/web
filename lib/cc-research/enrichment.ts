import type { CcDecisionMaker, CcEnrichedLead, CcSeedLead } from "@/lib/cc-research/types";

const CAREER_TRANSITION_KEYWORDS = [
  "career",
  "career-transition",
  "transitional",
  "industry",
  "workforce",
  "employment",
  "internship",
  "job",
  "earn while",
  "earning",
  "work-based",
];

const TRANSFER_KEYWORDS = [
  "transfer",
  "articulation",
  "2+2",
  "dual",
  "community college",
  "pathway",
  "associate",
  "bachelor",
];

const ADVISOR_KEYWORDS = [
  "advisor",
  "counselor",
  "counseling",
  "coordinator",
  "director",
  "head of",
  "career services",
  "student success",
];

function normalizeText(value: string): string {
  return (value || "").toLowerCase();
}

function inferEmailPatternsFromContacts(domain: string, contacts: CcDecisionMaker[]): string[] {
  if (!domain) return [];

  const patterns = new Set<string>();
  const normalizedDomain = domain.toLowerCase();

  for (const contact of contacts) {
    if (contact.email && contact.email.toLowerCase().endsWith(`@${normalizedDomain}`)) {
      const local = contact.email.split("@")[0].toLowerCase();
      const parts = contact.fullName
        .toLowerCase()
        .replace(/[^a-z\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean);

      if (parts.length >= 2) {
        const first = parts[0];
        const last = parts[parts.length - 1];
        if (local === `${first}.${last}`) patterns.add("first.last");
        if (local === `${first}${last}`) patterns.add("firstlast");
        if (local === `${first[0]}.${last}`) patterns.add("flast");
        if (local === `${first}_${last}`) patterns.add("first_last");
      }
    }
  }

  if (!patterns.size && normalizedDomain) {
    patterns.add("first.last");
    patterns.add("flast");
  }

  return Array.from(patterns).map((pattern) => `${pattern}@${normalizedDomain}`);
}

function findSignal(text: string, terms: string[]): string[] {
  const lowered = normalizeText(text);
  return terms.filter((term) => lowered.includes(term));
}

function detectRoleSegments(text: string, contacts: CcDecisionMaker[]): string[] {
  const lowered = normalizeText(text);
  const signals: string[] = [];

  for (const contact of contacts) {
    const role = normalizeText(contact.role || "");
    const roleParts = role.split(/[\s,/]+/);

    if (roleParts.some((part) => part.includes("advisor") || part.includes("counsel"))) {
      signals.push("advisory_staff" );
    }

    if (roleParts.some((part) => part.includes("transfer"))) {
      signals.push("transfer_office");
    }

    if (roleParts.some((part) => part.includes("career") || part.includes("services"))) {
      signals.push("career_services");
    }

    if (roleParts.some((part) => part.includes("employ"))) {
      signals.push("employer");
    }
  }

  const deduped = new Set(signals);
  return Array.from(deduped);
}

export function enrichCcLead(seedLead: CcSeedLead): CcEnrichedLead {
  const contacts = seedLead.decisionMakers || [];
  const tags = seedLead.programTags || [];
  const domain = (() => {
    try {
      return new URL(seedLead.institutionWebsite).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  const searchable = [
    seedLead.institutionName,
    seedLead.geography,
    seedLead.notes,
    ...tags,
    ...contacts.map((c) => `${c.role} ${c.fullName}`),
  ]
    .filter(Boolean)
    .join(" ");

  const careerTransitionSignals = findSignal(searchable, CAREER_TRANSITION_KEYWORDS);
  const transferSignals = findSignal(searchable, TRANSFER_KEYWORDS);
  const advisorSignals = findSignal(searchable, ADVISOR_KEYWORDS);
  const roleSignals = detectRoleSegments(searchable, contacts);
  const inferredEmailPatterns = inferEmailPatternsFromContacts(domain, contacts);

  const redFlags: string[] = [];
  if (!seedLead.studentCount) redFlags.push("Missing student count");
  if (!seedLead.tuition) redFlags.push("Missing tuition");
  if (!contacts.length) redFlags.push("No identified contacts");
  if (!careerTransitionSignals.length && !transferSignals.length) {
    redFlags.push("Limited transition or transfer signals");
  }

  return {
    id: seedLead.id || `cc-${domain}`,
    institutionName: seedLead.institutionName,
    institutionWebsite: seedLead.institutionWebsite,
    geography: seedLead.geography,
    studentCount: seedLead.studentCount,
    tuition: seedLead.tuition,
    programTags: tags,
    notes: seedLead.notes,
    source: seedLead.source || null,
    decisionMakers: contacts,
    inferredEmailPatterns,
    careerTransitionSignals,
    transferSignals,
    advisorSignals,
    roleSignals,
    redFlags,
  };
}

export function enrichCcLeads(seedLeads: CcSeedLead[]): CcEnrichedLead[] {
  return seedLeads.map((lead) => enrichCcLead(lead));
}

export function buildRoleSegmentsFromContactRole(role: string): string[] {
  return detectRoleSegments(role, [{ fullName: "", role, email: undefined, linkedinUrl: undefined }]);
}
