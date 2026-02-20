import type { EnrichedInstitutionLead, LeadDiscoveryFilters, RawInstitutionLead } from "@/lib/ps-b2b/types";

function normalizeText(value: string | undefined): string {
  return (value || "").toLowerCase().trim();
}

function safeNumber(value: number | undefined): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return value;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function getDomain(website: string): string {
  try {
    return new URL(website).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function hasKeywordMatch(lead: RawInstitutionLead, keywords: string[]): boolean {
  if (!keywords.length) return true;
  const searchable = [
    lead.name,
    lead.geography,
    lead.notes,
    ...(lead.tags || []),
  ]
    .join(" ")
    .toLowerCase();
  return keywords.some((keyword) => searchable.includes(keyword));
}

function hasGeographyMatch(lead: RawInstitutionLead, geographies: string[]): boolean {
  if (!geographies.length) return true;
  const searchable = [lead.geography, lead.name, lead.notes].join(" ").toLowerCase();
  return geographies.some((geo) => searchable.includes(geo));
}

function toLeadId(lead: RawInstitutionLead): string {
  if (lead.id && lead.id.trim()) return lead.id;
  const domain = getDomain(lead.website);
  if (domain) return `lead-${slugify(domain)}`;
  return `lead-${slugify(lead.name)}`;
}

export function discoverLeads(
  seedLeads: RawInstitutionLead[],
  filters: LeadDiscoveryFilters,
): RawInstitutionLead[] {
  const geographies = (filters.geographies || []).map(normalizeText).filter(Boolean);
  const keywords = (filters.keywords || []).map(normalizeText).filter(Boolean);

  const dedupeMap = new Map<string, RawInstitutionLead>();

  for (const seedLead of seedLeads) {
    if (!seedLead?.name || !seedLead?.website) continue;

    if (!hasGeographyMatch(seedLead, geographies)) continue;
    if (!hasKeywordMatch(seedLead, keywords)) continue;

    const studentCount = safeNumber(seedLead.studentCount);
    const annualTuitionUsd = safeNumber(seedLead.annualTuitionUsd);

    if (filters.minStudentCount !== undefined && (studentCount === undefined || studentCount < filters.minStudentCount)) {
      continue;
    }

    if (
      filters.minAnnualTuitionUsd !== undefined &&
      (annualTuitionUsd === undefined || annualTuitionUsd < filters.minAnnualTuitionUsd)
    ) {
      continue;
    }

    const dedupeKey = `${getDomain(seedLead.website)}::${normalizeText(seedLead.name)}`;
    const normalized: RawInstitutionLead = {
      ...seedLead,
      id: toLeadId(seedLead),
      tags: (seedLead.tags || []).map((tag) => tag.trim()).filter(Boolean),
      decisionMakers: (seedLead.decisionMakers || []).map((dm) => ({
        fullName: dm.fullName.trim(),
        role: dm.role.trim(),
        email: dm.email?.trim(),
        linkedinUrl: dm.linkedinUrl?.trim(),
      })),
    };
    dedupeMap.set(dedupeKey, normalized);
  }

  return Array.from(dedupeMap.values());
}

export function toSeedFromEnriched(lead: EnrichedInstitutionLead): RawInstitutionLead {
  return {
    id: lead.id,
    name: lead.name,
    website: lead.website,
    geography: lead.geography,
    studentCount: lead.studentCount,
    annualTuitionUsd: lead.annualTuitionUsd,
    counselingProgramSize: lead.counselingProgramSize,
    notes: lead.notes,
    tags: lead.tags,
    decisionMakers: lead.decisionMakers,
  };
}
