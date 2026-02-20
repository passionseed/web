import type {
  CcEnrichedLead,
  CcLeadDiscoveryFilters,
  CcScoredLead,
  CcSeedLead,
} from "@/lib/cc-research/types";

function normalizeText(value: string | undefined): string {
  return (value || "").toLowerCase().trim();
}

function slug(value: string): string {
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

function hasKeywordMatch(seed: CcSeedLead, keywords: string[]): boolean {
  if (!keywords.length) return true;

  const searchable = [
    seed.institutionName,
    seed.geography,
    seed.notes,
    ...(seed.programTags || []),
  ]
    .join(" ")
    .toLowerCase();

  return keywords.some((keyword) => searchable.includes(keyword));
}

function hasGeographyMatch(seed: CcSeedLead, geographies: string[]): boolean {
  if (!geographies.length) return true;
  const searchable = [seed.geography, seed.institutionName, seed.notes]
    .join(" ")
    .toLowerCase();
  return geographies.some((geo) => searchable.includes(geo));
}

function meetsThresholds(seed: CcSeedLead, filters: CcLeadDiscoveryFilters): boolean {
  if (filters.minStudentCount !== undefined) {
    if (seed.studentCount === undefined || seed.studentCount < filters.minStudentCount) {
      return false;
    }
  }

  if (filters.minTuitionUsd !== undefined) {
    if (seed.tuition === undefined || seed.tuition < filters.minTuitionUsd) {
      return false;
    }
  }

  return true;
}

function buildLeadId(seed: CcSeedLead): string {
  if (seed.id?.trim()) return seed.id;
  const domain = getDomain(seed.institutionWebsite);
  if (domain) return `cc-${domain}`;
  return `cc-${slug(seed.institutionName)}`;
}

export function discoverCcLeads(
  seedLeads: CcSeedLead[],
  filters: CcLeadDiscoveryFilters,
): CcSeedLead[] {
  const normalizedGeographies = (filters.geographies || []).map(normalizeText).filter(Boolean);
  const normalizedKeywords = (filters.keywords || []).map(normalizeText).filter(Boolean);

  const dedupe = new Map<string, CcSeedLead>();

  for (const rawLead of seedLeads) {
    if (!rawLead.institutionName || !rawLead.institutionWebsite) {
      continue;
    }

    if (!hasGeographyMatch(rawLead, normalizedGeographies)) {
      continue;
    }

    if (!hasKeywordMatch(rawLead, normalizedKeywords)) {
      continue;
    }

    if (!meetsThresholds(rawLead, filters)) {
      continue;
    }

    const decisionMakers = (rawLead.decisionMakers || []).map((dm) => ({
      fullName: dm.fullName.trim(),
      role: dm.role.trim(),
      email: dm.email?.trim(),
      linkedinUrl: dm.linkedinUrl?.trim(),
    }));

    const normalizedLead: CcSeedLead = {
      id: buildLeadId(rawLead),
      institutionName: rawLead.institutionName.trim(),
      institutionWebsite: rawLead.institutionWebsite.trim(),
      geography: rawLead.geography?.trim(),
      studentCount: rawLead.studentCount,
      tuition: rawLead.tuition,
      programTags: (rawLead.programTags || []).map((tag) => tag.trim()).filter(Boolean),
      notes: rawLead.notes?.trim(),
      source: rawLead.source?.trim(),
      decisionMakers,
    };

    const dedupeKey = `${getDomain(normalizedLead.institutionWebsite)}::${normalizeText(
      normalizedLead.institutionName,
    )}`;
    dedupe.set(dedupeKey, normalizedLead);
  }

  return Array.from(dedupe.values());
}

export function toCcEnrichedSeeds(leads: CcSeedLead[]): CcEnrichedLead[] {
  return leads.map((seed) => ({
    id: seed.id || slug(seed.institutionWebsite),
    institutionName: seed.institutionName,
    institutionWebsite: seed.institutionWebsite,
    geography: seed.geography,
    studentCount: seed.studentCount,
    tuition: seed.tuition,
    programTags: seed.programTags || [],
    notes: seed.notes,
    source: seed.source || null,
    decisionMakers: seed.decisionMakers || [],
    inferredEmailPatterns: [],
    careerTransitionSignals: [],
    transferSignals: [],
    advisorSignals: [],
    roleSignals: [],
    redFlags: [],
  }));
}

export function parseCsvLeads(csvText: string): CcSeedLead[] {
  const rows = csvText
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length <= 1) {
    return [];
  }

  const header = rows[0].split(",").map((value) => value.trim().toLowerCase());

  const getIndex = (value: string): number =>
    header.indexOf(value.toLowerCase());

  const idxInstitution = getIndex("institutionName");
  const idxWebsite = getIndex("institutionWebsite");
  const idxGeography = getIndex("geography");
  const idxStudentCount = getIndex("studentCount");
  const idxTuition = getIndex("tuition");
  const idxTags = getIndex("programTags");
  const idxNotes = getIndex("notes");
  const idxSource = getIndex("source");

  if (idxInstitution < 0 || idxWebsite < 0) {
    return [];
  }

  const parseContact = (value?: string) => {
    if (!value) return [];
    return value
      .split(";")
      .map((piece) => piece.trim())
      .filter(Boolean)
      .map((piece) => {
        const [fullName, role = "Advisor", email, linkedinUrl] = piece
          .split("|")
          .map((part) => part.trim());
        return {
          fullName,
          role,
          email: email || undefined,
          linkedinUrl: linkedinUrl || undefined,
        };
      });
  };

  return rows
    .slice(1)
    .map((row) => {
      const cols = row.split(",").map((value) => value.trim());
      return {
        institutionName: cols[idxInstitution] || "",
        institutionWebsite: cols[idxWebsite] || "",
        geography: cols[idxGeography] || undefined,
        studentCount: idxStudentCount >= 0 ? Number(cols[idxStudentCount]) || undefined : undefined,
        tuition: idxTuition >= 0 ? Number(cols[idxTuition]) || undefined : undefined,
        programTags:
          idxTags >= 0 && cols[idxTags]
            ? cols[idxTags]
                .split("|")
                .map((tag) => tag.trim())
                .filter(Boolean)
            : [],
        notes: idxNotes >= 0 ? cols[idxNotes] : undefined,
        source: idxSource >= 0 ? cols[idxSource] || undefined : undefined,
        decisionMakers: parseContact(
          header.includes("decisionMakers") ? cols[header.indexOf("decisionMakers")] : "",
        ),
      };
    })
    .filter((lead) => lead.institutionName && lead.institutionWebsite);
}

export function rankCcLeadsByScore(leads: CcScoredLead[]): CcScoredLead[] {
  return [...leads].sort((a, b) => b.totalScore - a.totalScore);
}
