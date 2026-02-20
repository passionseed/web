import { createClient } from "@/utils/supabase/server";
import { buildRoleSegmentsFromContactRole, enrichCcLeads } from "@/lib/cc-research/enrichment";
import { createCcOutreachDrafts } from "@/lib/cc-research/outreach";
import { discoverCcLeads, parseCsvLeads } from "@/lib/cc-research/discovery";
import { learnFromFeedback } from "@/lib/cc-research/feedback";
import { defaultCcWeights, rankCcLeadsByScore, scoreCcLeads } from "@/lib/cc-research/scoring";
import {
  campaignIdSchema,
  createCampaignSchema,
  ccSeedLeadsSchema,
  feedbackEventSchema,
  leadStatusTransitionSchema,
  outreachAttemptSchema,
  runCampaignSchema,
  interviewSchema,
  type CreateCampaignInput,
  type FeedbackEventInput,
  type LeadStatusTransitionInput,
  type OutreachAttemptInput,
  type RunCampaignInput,
  type SeedLeadsInput,
} from "@/lib/cc-research/schema";
import type {
  CcCampaign,
  CcCampaignState,
  CcCampaignSummary,
  CcDashboardPayload,
  CcDecisionMaker,
  CcExportPack,
  CcFeedbackEvent,
  CcICPWeights,
  CcInterview,
  CcInterviewStatus,
  CcLeadDiscoveryFilters,
  CcLeadRow,
  CcLeadStatus,
  CcOutreachAttempt,
  CcOutreachChannel,
  CcOutreachDraft,
  CcPersona,
  CcRunResult,
  CcSeedLead,
  CcScoredLead,
} from "@/lib/cc-research/types";
import { z } from "zod";

type DbCampaignRow = {
  id: string;
  slug: string;
  title: string;
  goal: string | null;
  state: string | null;
  filters: CcLeadDiscoveryFilters | Record<string, unknown> | null;
  active_weights: CcICPWeights | Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type DbLeadRow = {
  id: string;
  campaign_id: string;
  institution_name: string;
  institution_website: string;
  geography: string | null;
  student_count: number | string | null;
  tuition: number | string | null;
  program_tags: string[] | null;
  notes: string | null;
  score_total: number | string | null;
  score_breakdown: Record<string, unknown> | null;
  status: string | null;
  decision_makers_json: unknown;
  decision_maker_count: number | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

type DbContactRow = {
  id: string;
  lead_id: string;
  full_name: string;
  role: string | null;
  email: string | null;
  linkedin_url: string | null;
  verified: boolean | null;
};

type DbOutreachRow = {
  id: string;
  lead_id: string;
  channel: string;
  subject_a: string | null;
  subject_b: string | null;
  message: string;
  sent_at: string | null;
  response_at: string | null;
  response_type: string | null;
  next_action: string | null;
};

type DbInterviewRow = {
  id: string;
  lead_id: string;
  persona: string;
  contact_name: string | null;
  contact_role: string | null;
  scheduled_at: string | null;
  status: string;
  outcome: string;
  pain_theme_tags: string[] | null;
  notes: string | null;
  recording_link: string | null;
  raw_transcript_snippet: string | null;
};

type DbFeedbackRow = {
  lead_id: string | null;
  segment_key: string | null;
  outcome: string;
  objection_reason: string | null;
  score_snapshot_json: Record<string, unknown> | null;
  notes: string | null;
};

type ResponseState = "pending" | "replied" | "no_response" | "outreach_sent";

const LEAD_STATUS_ORDER: CcLeadStatus[] = [
  "seeded",
  "enriched",
  "scored",
  "outreach_ready",
  "emailed",
  "linkedIned",
  "replied",
  "no_response",
  "interviewed",
  "blocked",
  "disqualified",
];

const ALLOWED_STATUS_TRANSITIONS: Record<CcLeadStatus, CcLeadStatus[]> = {
  seeded: ["enriched", "scored", "outreach_ready", "disqualified", "blocked"],
  enriched: ["scored", "outreach_ready", "disqualified", "blocked"],
  scored: ["outreach_ready", "emailed", "linkedIned", "disqualified", "blocked"],
  outreach_ready: ["emailed", "linkedIned", "replied", "no_response", "disqualified", "blocked"],
  emailed: ["replied", "no_response", "linkedIned", "disqualified", "blocked"],
  linkedIned: ["replied", "no_response", "emailed", "disqualified", "blocked"],
  replied: ["interviewed", "disqualified", "blocked"],
  no_response: ["emailed", "linkedIned", "replied", "disqualified", "blocked"],
  interviewed: ["disqualified", "blocked"],
  blocked: ["seeded", "scored", "disqualified"],
  disqualified: ["seeded", "scored", "blocked"],
};

const DEFAULT_FILTERS: CcLeadDiscoveryFilters = {
  geographies: [],
  keywords: [],
  minStudentCount: undefined,
  minTuitionUsd: undefined,
  personaSegments: undefined,
};

const updateCampaignSchema = z
  .object({
    campaignId: z.string().uuid(),
    title: z.string().min(3).max(120).optional(),
    goal: z.string().max(200).nullable().optional(),
    state: z
      .enum(["draft", "active", "paused", "completed", "archived"])
      .optional(),
    slug: z.string().trim().min(3).max(80).optional(),
    filters: z.record(z.unknown()).optional(),
    activeWeights: z.record(z.number()).optional(),
  })
  .strict();

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeFilters(input: CcLeadDiscoveryFilters | undefined | null): CcLeadDiscoveryFilters {
  const next = input || DEFAULT_FILTERS;
  return {
    geographies: Array.isArray(next.geographies) ? next.geographies.map((item) => String(item).toLowerCase().trim()).filter(Boolean) : [],
    minStudentCount: next.minStudentCount,
    minTuitionUsd: next.minTuitionUsd,
    keywords: Array.isArray(next.keywords) ? next.keywords.map((item) => String(item).toLowerCase().trim()).filter(Boolean) : [],
    personaSegments: Array.isArray(next.personaSegments) ? next.personaSegments : undefined,
  };
}

function normalizeWeights(input?: Partial<CcICPWeights> | null): CcICPWeights {
  const base = defaultCcWeights();
  return {
    studentScale: input?.studentScale ?? base.studentScale,
    advisorStaffing: input?.advisorStaffing ?? base.advisorStaffing,
    careerTransitionLanguage: input?.careerTransitionLanguage ?? base.careerTransitionLanguage,
    transferSignals: input?.transferSignals ?? base.transferSignals,
    easeOfContact: input?.easeOfContact ?? base.easeOfContact,
  };
}

function toNumber(value: string | number | null | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function normalizeWebsite(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

function parseDecisionMakers(raw: unknown): CcDecisionMaker[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const obj = entry as Record<string, unknown>;
      const fullName =
        typeof obj.fullName === "string"
          ? obj.fullName.trim()
          : typeof obj.full_name === "string"
            ? obj.full_name.trim()
            : "";
      const role = typeof obj.role === "string" ? obj.role.trim() : "";

      if (!fullName || !role) {
        return null;
      }

      const email = typeof obj.email === "string" ? obj.email.trim() : undefined;
      const linkedinUrl =
        typeof obj.linkedinUrl === "string"
          ? obj.linkedinUrl.trim()
          : typeof obj.linkedin_url === "string"
            ? obj.linkedin_url.trim()
            : undefined;

      return {
        fullName,
        role,
        email,
        linkedinUrl,
      };
    })
    .filter((entry): entry is CcDecisionMaker => Boolean(entry));
}

function parseBreakdown(raw: unknown) {
  const base = {
    weightedScoreBand: "0-40" as "0-40" | "41-60" | "61-80" | "81-100",
    urgencyScore: 0,
    icpFitScore: 0,
    studentScale: { score: 0, weight: 0, weightedScore: 0, reasoning: [] as string[] },
    advisorStaffing: { score: 0, weight: 0, weightedScore: 0, reasoning: [] as string[] },
    careerTransitionLanguage: { score: 0, weight: 0, weightedScore: 0, reasoning: [] as string[] },
    transferSignals: { score: 0, weight: 0, weightedScore: 0, reasoning: [] as string[] },
    easeOfContact: { score: 0, weight: 0, weightedScore: 0, reasoning: [] as string[] },
    careerTransitionSignals: [] as string[],
    transferSignalsSignals: [] as string[],
    advisorSignals: [] as string[],
    roleSignals: [] as string[],
    redFlags: [] as string[],
  };

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return base;
  }

  const parsed = raw as Record<string, unknown>;
  const nested = parsed.breakdown as Record<string, unknown> | undefined;

  return {
    weightedScoreBand: (parsed.weightedScoreBand as "0-40" | "41-60" | "61-80" | "81-100") || base.weightedScoreBand,
    urgencyScore: toNumber(parsed.urgencyScore as string | number) ?? 0,
    icpFitScore: toNumber(parsed.icpFitScore as string | number) ?? 0,
    studentScale: {
      score: toNumber((nested as Record<string, unknown> | undefined)?.studentScale?.score as string | number) || 0,
      weight: toNumber((nested as Record<string, unknown> | undefined)?.studentScale?.weight as string | number) || 0,
      weightedScore:
        toNumber((nested as Record<string, unknown> | undefined)?.studentScale?.weightedScore as string | number) || 0,
      reasoning: toStringArray((nested as Record<string, unknown> | undefined)?.studentScale?.reasoning),
    },
    advisorStaffing: {
      score: toNumber((nested as Record<string, unknown> | undefined)?.advisorStaffing?.score as string | number) || 0,
      weight: toNumber((nested as Record<string, unknown> | undefined)?.advisorStaffing?.weight as string | number) || 0,
      weightedScore:
        toNumber((nested as Record<string, unknown> | undefined)?.advisorStaffing?.weightedScore as string | number) || 0,
      reasoning: toStringArray((nested as Record<string, unknown> | undefined)?.advisorStaffing?.reasoning),
    },
    careerTransitionLanguage: {
      score:
        toNumber((nested as Record<string, unknown> | undefined)?.careerTransitionLanguage?.score as string | number) || 0,
      weight:
        toNumber((nested as Record<string, unknown> | undefined)?.careerTransitionLanguage?.weight as string | number) || 0,
      weightedScore:
        toNumber(
          (nested as Record<string, unknown> | undefined)?.careerTransitionLanguage?.weightedScore as string | number,
        ) || 0,
      reasoning: toStringArray((nested as Record<string, unknown> | undefined)?.careerTransitionLanguage?.reasoning),
    },
    transferSignals: {
      score: toNumber((nested as Record<string, unknown> | undefined)?.transferSignals?.score as string | number) || 0,
      weight: toNumber((nested as Record<string, unknown> | undefined)?.transferSignals?.weight as string | number) || 0,
      weightedScore:
        toNumber((nested as Record<string, unknown> | undefined)?.transferSignals?.weightedScore as string | number) || 0,
      reasoning: toStringArray((nested as Record<string, unknown> | undefined)?.transferSignals?.reasoning),
    },
    easeOfContact: {
      score: toNumber((nested as Record<string, unknown> | undefined)?.easeOfContact?.score as string | number) || 0,
      weight: toNumber((nested as Record<string, unknown> | undefined)?.easeOfContact?.weight as string | number) || 0,
      weightedScore:
        toNumber((nested as Record<string, unknown> | undefined)?.easeOfContact?.weightedScore as string | number) || 0,
      reasoning: toStringArray((nested as Record<string, unknown> | undefined)?.easeOfContact?.reasoning),
    },
    careerTransitionSignals: toStringArray(parsed.careerTransitionSignals),
    transferSignalsSignals: toStringArray(parsed.transferSignals),
    advisorSignals: toStringArray(parsed.advisorSignals),
    roleSignals: toStringArray(parsed.roleSignals),
    redFlags: toStringArray(parsed.redFlags),
  };
}

function weightedScoreBand(score: number): "0-40" | "41-60" | "61-80" | "81-100" {
  if (score >= 81) {
    return "81-100";
  }
  if (score >= 61) {
    return "61-80";
  }
  if (score >= 41) {
    return "41-60";
  }
  return "0-40";
}

function detectPersonaSegmentsFromRole(role: string): CcPersona[] {
  const normalized = role.toLowerCase();
  const personas = new Set<CcPersona>();

  if (normalized.includes("advisor")) {
    personas.add("advisor");
  }
  if (normalized.includes("counsel")) {
    personas.add("counselor");
  }
  if (normalized.includes("career") || normalized.includes("career services")) {
    personas.add("career_services");
  }
  if (normalized.includes("transfer")) {
    personas.add("transfer_office");
  }
  if (normalized.includes("student")) {
    personas.add("student");
  }
  if (normalized.includes("employ")) {
    personas.add("employer");
  }

  return Array.from(personas);
}

function inferPersonaSegmentsFromContacts(decisionMakers: CcDecisionMaker[]): CcPersona[] {
  const personas = new Set<CcPersona>();

  for (const dm of decisionMakers) {
    for (const fromRole of [...detectPersonaSegmentsFromRole(dm.role || ""), ...buildRoleSegmentsFromContactRole(dm.role || "")]) {
      if (fromRole && (fromRole as CcPersona)) {
        personas.add(fromRole as CcPersona);
      }
    }
  }

  return Array.from(personas);
}

function mapCampaign(row: DbCampaignRow): Omit<CcCampaign, "leadCount" | "discoveredAt"> {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    goal: row.goal,
    state: (row.state as CcCampaignState) || "draft",
    filters: normalizeFilters(row.filters as CcLeadDiscoveryFilters | null),
    activeWeights: normalizeWeights(row.active_weights as CcICPWeights | null),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLead(row: DbLeadRow, contactsByLead: Map<string, DbContactRow[]>): CcLeadRow {
  const decisionMakers = parseDecisionMakers(row.decision_makers_json);
  const decisionMakerContacts = decisionMakers.length > 0 ? decisionMakers : [];
  const contacts = contactsByLead.get(row.id) || [];
  const breakdown = parseBreakdown(row.score_breakdown);
  const enrichedDecisionMakers =
    decisionMakerContacts.length > 0
      ? decisionMakerContacts
      : contacts.map((contact) => ({
          fullName: contact.full_name,
          role: contact.role || "",
          email: contact.email || undefined,
          linkedinUrl: contact.linkedin_url || undefined,
        }));

  const totalScore = toNumber(row.score_total) || 0;

  return {
    id: row.id,
    campaignId: row.campaign_id,
    institutionName: row.institution_name,
    institutionWebsite: row.institution_website,
    geography: row.geography || undefined,
    studentCount: toNumber(row.student_count),
    tuition: toNumber(row.tuition),
    programTags: Array.isArray(row.program_tags) ? row.program_tags : [],
    notes: row.notes || undefined,
    source: row.source || null,
    decisionMakers: enrichedDecisionMakers,
    inferredEmailPatterns: [],
    careerTransitionSignals: breakdown.careerTransitionSignals,
    transferSignals: breakdown.transferSignalsSignals,
    advisorSignals: breakdown.advisorSignals,
    roleSignals: breakdown.roleSignals,
    redFlags: breakdown.redFlags,
    status: (row.status as CcLeadStatus) || "seeded",
    totalScore: clamp(totalScore, 0, 100),
    urgencyScore: clamp(breakdown.urgencyScore, 0, 100),
    icpFitScore: clamp(breakdown.icpFitScore, 0, 100),
    weightedScoreBand: weightedScoreBand(totalScore),
    decisionMakerCount: Math.max(row.decision_maker_count || 0, enrichedDecisionMakers.length),
    contactCount: Math.max(contacts.length, row.decision_maker_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    nextAction: "Review lead",
    personaSegments: inferPersonaSegmentsFromContacts(enrichedDecisionMakers),
    breakdown: {
      studentScale: {
        score: breakdown.studentScale.score,
        weight: breakdown.studentScale.weight,
        weightedScore: breakdown.studentScale.weightedScore,
        reasoning: breakdown.studentScale.reasoning,
      },
      advisorStaffing: {
        score: breakdown.advisorStaffing.score,
        weight: breakdown.advisorStaffing.weight,
        weightedScore: breakdown.advisorStaffing.weightedScore,
        reasoning: breakdown.advisorStaffing.reasoning,
      },
      careerTransitionLanguage: {
        score: breakdown.careerTransitionLanguage.score,
        weight: breakdown.careerTransitionLanguage.weight,
        weightedScore: breakdown.careerTransitionLanguage.weightedScore,
        reasoning: breakdown.careerTransitionLanguage.reasoning,
      },
      transferSignals: {
        score: breakdown.transferSignals.score,
        weight: breakdown.transferSignals.weight,
        weightedScore: breakdown.transferSignals.weightedScore,
        reasoning: breakdown.transferSignals.reasoning,
      },
      easeOfContact: {
        score: breakdown.easeOfContact.score,
        weight: breakdown.easeOfContact.weight,
        weightedScore: breakdown.easeOfContact.weightedScore,
        reasoning: breakdown.easeOfContact.reasoning,
      },
    },
  };
}

function mapOutreach(row: DbOutreachRow): CcOutreachAttempt {
  return {
    id: row.id,
    leadId: row.lead_id,
    channel: (row.channel as CcOutreachChannel) || "email",
    subjectA: row.subject_a || null,
    subjectB: row.subject_b || null,
    message: row.message,
    sentAt: row.sent_at,
    responseAt: row.response_at,
    responseType: row.response_type || null,
    nextAction: row.next_action || null,
  };
}

function mapInterview(row: DbInterviewRow): CcInterview {
  return {
    id: row.id,
    leadId: row.lead_id,
    persona: (row.persona as CcPersona) || "advisor",
    contactName: row.contact_name || undefined,
    contactRole: row.contact_role || undefined,
    scheduledAt: row.scheduled_at,
    status: (row.status as CcInterviewStatus) || "scheduled",
    outcome: row.outcome as CcInterview["outcome"],
    painThemeTags: row.pain_theme_tags || [],
    notes: row.notes || undefined,
    recordingLink: row.recording_link || undefined,
    rawTranscriptSnippet: row.raw_transcript_snippet || undefined,
  };
}

function statusToNextAction(status: CcLeadStatus): string {
  const map: Record<CcLeadStatus, string> = {
    seeded: "Run discovery + scoring",
    enriched: "Score lead",
    scored: "Generate outreach drafts",
    outreach_ready: "Send outreach",
    emailed: "Follow up if no response",
    linkedIned: "Follow up if no response",
    replied: "Capture interview details",
    no_response: "Retry channel or revise outreach",
    interviewed: "Summarize objections",
    blocked: "Review block reason",
    disqualified: "Review qualification criteria",
  };
  return map[status];
}

function calculateResponseState(leadId: string, attempts: CcOutreachAttempt[], status: CcLeadStatus): ResponseState {
  const related = attempts.filter((attempt) => attempt.leadId === leadId);
  if (related.some((attempt) => Boolean(attempt.responseAt))) {
    return "replied";
  }

  if (related.some((attempt) => Boolean(attempt.sentAt))) {
    return status === "no_response" ? "no_response" : "outreach_sent";
  }

  return "pending";
}

function toCampaignSeedLeads(input: SeedLeadsInput): CcSeedLead[] {
  const parsed = ccSeedLeadsSchema.parse(input);
  if (parsed.format === "csv") {
    if (typeof parsed.payload !== "string") {
      return [];
    }
    return parseCsvLeads(parsed.payload);
  }

  return parsed.payload as CcSeedLead[];
}

function mapLeadStatusToFilter(state: CcLeadStatus): CcLeadStatus[] {
  return [state];
}

function toDbCampaignPayloadInput(input: CreateCampaignInput | { title?: string; goal?: string | null; state?: CcCampaignState; slug?: string; filters?: CcLeadDiscoveryFilters; activeWeights?: Partial<CcICPWeights>; createdBy?: string | null; }): {
  slug: string;
  title: string;
  goal: string | null;
  state: CcCampaignState;
  filters: CcLeadDiscoveryFilters;
  active_weights: CcICPWeights;
  created_by: string | null;
} {
  const parsed = createCampaignSchema.parse(input);
  const normalizedFilters = normalizeFilters(parsed.filters || DEFAULT_FILTERS);

  const slugSeed = (parsed.slug || parsed.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return {
    slug: `${slugSeed}-${Date.now().toString().slice(-8)}`,
    title: parsed.title,
    goal: parsed.goal || null,
    state: parsed.state || "draft",
    filters: normalizedFilters,
    active_weights: normalizeWeights(parsed.activeWeights || undefined),
    created_by: (input as CreateCampaignInput & { createdBy?: string | null }).createdBy || null,
  };
}

async function listCampaignLeadMaps(campaignIds: string[]) {
  if (campaignIds.length === 0) {
    return new Map<string, { count: number; scoreTotal: number; statusBuckets: Record<CcLeadStatus, number> }>();
  }

  const supabase = await createClient();
  const { data: leads, error } = await supabase
    .from("cc_research_leads")
    .select("campaign_id, status, score_total")
    .in("campaign_id", campaignIds);

  if (error) {
    throw new Error(error.message);
  }

  const baseBuckets = LEAD_STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<CcLeadStatus, number>,
  );

  const byCampaign = new Map<string, { count: number; scoreTotal: number; statusBuckets: Record<CcLeadStatus, number> }>();

  for (const lead of leads || []) {
    const key = lead.campaign_id;
    if (!key) {
      continue;
    }
    const existing = byCampaign.get(key) || {
      count: 0,
      scoreTotal: 0,
      statusBuckets: { ...baseBuckets },
    };
    const status = (lead.status as CcLeadStatus) || "seeded";

    existing.count += 1;
    existing.scoreTotal += toNumber(lead.score_total as string | number) || 0;
    existing.statusBuckets[status] = (existing.statusBuckets[status] || 0) + 1;
    byCampaign.set(key, existing);
  }

  return byCampaign;
}

function mapLeadRowsWithContacts(rows: DbLeadRow[], contacts: DbContactRow[]): CcLeadRow[] {
  const byLead = new Map<string, DbContactRow[]>();
  for (const contact of contacts) {
    const list = byLead.get(contact.lead_id) || [];
    list.push(contact);
    byLead.set(contact.lead_id, list);
  }

  return rows.map((row) => mapLead(row, byLead));
}

export async function listCcCampaigns(): Promise<CcCampaignSummary[]> {
  const supabase = await createClient();
  const { data: campaigns, error: campaignError } = await supabase
    .from("cc_research_campaigns")
    .select("id, slug, title, state, filters, active_weights, created_at")
    .order("created_at", { ascending: false });

  if (campaignError) {
    throw new Error(campaignError.message);
  }

  const campaignIds = (campaigns || []).map((campaign) => campaign.id);
  const byCampaign = await listCampaignLeadMaps(campaignIds);

  return (campaigns || []).map((campaign) => {
    const payload = byCampaign.get(campaign.id);
    const total = payload?.count || 0;
    const scoreTotal = payload?.scoreTotal || 0;

    return {
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      campaignSlug: campaign.slug,
      state: (campaign.state as CcCampaignState) || "draft",
      leadCount: total,
      statusBuckets: payload?.statusBuckets || LEAD_STATUS_ORDER.reduce((acc, status) => {
        acc[status] = 0;
        return acc;
      }, {} as Record<CcLeadStatus, number>),
      scoreAvg: total ? round2(scoreTotal / total) : 0,
    };
  });
}

export async function getCcCampaign(campaignId: string): Promise<CcCampaign> {
  const parsed = campaignIdSchema.parse({ campaignId });
  const supabase = await createClient();

  const [{ data: campaign }, { count }] = await Promise.all([
    supabase
      .from("cc_research_campaigns")
      .select("id, slug, title, goal, state, filters, active_weights, created_by, created_at, updated_at")
      .eq("id", parsed.campaignId)
      .single(),
    supabase
      .from("cc_research_leads")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", parsed.campaignId),
  ]);

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const mapped = mapCampaign(campaign as unknown as DbCampaignRow);

  return {
    ...mapped,
    leadCount: count || 0,
    discoveredAt: new Date(mapped.createdAt).getTime(),
  };
}

export async function createCcCampaign(input: CreateCampaignInput, createdBy?: string): Promise<CcCampaign> {
  const supabase = await createClient();
  const payload = toDbCampaignPayloadInput({ ...input, createdBy });

  const { data, error } = await supabase
    .from("cc_research_campaigns")
    .insert(payload)
    .select("id, slug, title, goal, state, filters, active_weights, created_by, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Unable to create campaign");
  }

  const mapped = mapCampaign(data as unknown as DbCampaignRow);
  return {
    ...mapped,
    leadCount: 0,
    discoveredAt: new Date(mapped.createdAt).getTime(),
  };
}

export async function updateCcCampaign(campaignId: string, input: Partial<CreateCampaignInput>): Promise<CcCampaign> {
  const parsed = updateCampaignSchema.parse({ campaignId, ...input });
  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    updated_at: nowIso(),
  };

  if (parsed.title !== undefined) {
    payload.title = parsed.title;
  }
  if (parsed.goal !== undefined) {
    payload.goal = parsed.goal;
  }
  if (parsed.state !== undefined) {
    payload.state = parsed.state;
  }
  if (parsed.slug !== undefined) {
    payload.slug = parsed.slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72);
  }
  if (parsed.filters !== undefined) {
    payload.filters = normalizeFilters(parsed.filters as CcLeadDiscoveryFilters);
  }
  if (parsed.activeWeights !== undefined) {
    payload.active_weights = normalizeWeights(parsed.activeWeights as Partial<CcICPWeights>);
  }

  const { data, error } = await supabase
    .from("cc_research_campaigns")
    .update(payload)
    .eq("id", parsed.campaignId)
    .select("id, slug, title, goal, state, filters, active_weights, created_by, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to update campaign");
  }

  const mapped = mapCampaign(data as unknown as DbCampaignRow);

  const { count } = await supabase
    .from("cc_research_leads")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", parsed.campaignId);

  return {
    ...mapped,
    leadCount: count || 0,
    discoveredAt: new Date(mapped.createdAt).getTime(),
  };
}

export async function seedCcLeads(campaignId: string, input: SeedLeadsInput): Promise<{ imported: number; duplicates: number; leads: CcLeadRow[] }> {
  const parsedCampaign = campaignIdSchema.parse({ campaignId });
  const campaign = await getCcCampaign(parsedCampaign.campaignId);
  const seedRows = toCampaignSeedLeads(input);
  const filtered = discoverCcLeads(seedRows, normalizeFilters(campaign.filters));

  if (!filtered.length) {
    return { imported: 0, duplicates: 0, leads: [] };
  }

  const supabase = await createClient();
  const normalizedSet = new Set(filtered.map((lead) => normalizeWebsite(lead.institutionWebsite)));

  const { data: existing, error: existingError } = await supabase
    .from("cc_research_leads")
    .select("id, institution_website")
    .eq("campaign_id", parsedCampaign.campaignId)
    .in("institution_website", Array.from(normalizedSet));

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingSet = new Set((existing || []).map((entry) => normalizeWebsite(entry.institution_website)));
  const deduped = filtered.filter((lead) => !existingSet.has(normalizeWebsite(lead.institutionWebsite)));

  if (!deduped.length) {
    return {
      imported: 0,
      duplicates: filtered.length,
      leads: [],
    };
  }

  const insertRows = deduped.map((lead) => ({
    campaign_id: parsedCampaign.campaignId,
    institution_name: lead.institutionName,
    institution_website: lead.institutionWebsite,
    geography: lead.geography || null,
    student_count: lead.studentCount,
    tuition: lead.tuition,
    program_tags: lead.programTags || [],
    notes: lead.notes || null,
    score_total: 0,
    score_breakdown: {},
    status: "seeded",
    decision_makers_json: lead.decisionMakers || [],
    decision_maker_count: lead.decisionMakers?.length || 0,
    source: lead.source || "seed",
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("cc_research_leads")
    .insert(insertRows)
    .select("id, institution_website, institution_name, geography, student_count, tuition, program_tags, notes, decision_makers_json, decision_maker_count, status, score_total, created_at, updated_at")
    .returns<DbLeadRow[]>();

  if (insertError) {
    throw new Error(insertError.message);
  }

  const contactsToInsert: Array<{ lead_id: string; full_name: string; role: string; email: string | null; linkedin_url: string | null; verified: boolean; notes: string | null }> = [];
  for (const leadRow of inserted || []) {
    const sourceLead = deduped.find((lead) => lead.institutionWebsite === leadRow.institution_website);
    for (const contact of sourceLead?.decisionMakers || []) {
      contactsToInsert.push({
        lead_id: leadRow.id,
        full_name: contact.fullName,
        role: contact.role,
        email: contact.email || null,
        linkedin_url: contact.linkedinUrl || null,
        verified: false,
        notes: null,
      });
    }
  }

  if (contactsToInsert.length > 0) {
    const { error: contactError } = await supabase
      .from("cc_research_contacts")
      .insert(contactsToInsert);
    if (contactError) {
      console.warn("Failed to save seed contacts", contactError.message);
    }
  }

  const insertedIds = (inserted || []).map((row) => row.id);
  const contactRows = insertedIds.length
    ? await supabase
      .from("cc_research_contacts")
      .select("id, lead_id, full_name, role, email, linkedin_url, verified")
      .in("lead_id", insertedIds)
    : { data: [] as DbContactRow[], error: null };

  if (contactRows.error) {
    throw new Error(contactRows.error.message);
  }

  const leads = mapLeadRowsWithContacts(inserted || [], contactRows.data || []);

  return {
    imported: leads.length,
    duplicates: filtered.length - deduped.length,
    leads,
  };
}

export async function runCcCampaign(input: RunCampaignInput): Promise<CcRunResult> {
  const parsed = runCampaignSchema.parse(input);
  const campaign = await getCcCampaign(parsed.campaignId);
  const filters = normalizeFilters(parsed.filters || campaign.filters);
  const weights = normalizeWeights({ ...campaign.activeWeights, ...(parsed.weights || {}) });
  const includeOutreach = parsed.includeOutreach !== false;

  const supabase = await createClient();

  const { data: leadRows, error } = await supabase
    .from("cc_research_leads")
    .select("id, campaign_id, institution_name, institution_website, geography, student_count, tuition, program_tags, notes, status, decision_makers_json")
    .eq("campaign_id", parsed.campaignId);

  if (error) {
    throw new Error(error.message);
  }

  const seedRows = (leadRows || []).map((lead) => ({
    institutionName: lead.institution_name,
    institutionWebsite: lead.institution_website,
    geography: lead.geography || undefined,
    studentCount: toNumber(lead.student_count),
    tuition: toNumber(lead.tuition),
    programTags: lead.program_tags || [],
    notes: lead.notes || undefined,
    source: "run",
    decisionMakers: parseDecisionMakers(lead.decision_makers_json),
  }));

  const discovered = discoverCcLeads(seedRows, filters);
  const enriched = enrichCcLeads(discovered);
  const scored = rankCcLeadsByScore(scoreCcLeads(enriched, weights));

  const topN = clamp(parsed.topN ?? 10, 1, 100);
  const leadMap = new Map(
    (leadRows || []).map((lead) => [
      normalizeWebsite(lead.institution_website),
      {
        id: lead.id,
        status: (lead.status as CcLeadStatus) || "seeded",
        currentScore: toNumber(lead.student_count) || 0,
      },
    ]),
  );
  const topLeads = scored.slice(0, topN);
  const topLeadMappings = topLeads
    .map((lead) => {
      const leadId = leadMap.get(normalizeWebsite(lead.institutionWebsite))?.id;
      if (!leadId) {
        return null;
      }
      return { leadId, lead };
    })
    .filter((entry): entry is { leadId: string; lead: CcScoredLead } => entry !== null);

  const nextStatus = includeOutreach ? "outreach_ready" : "scored";

  const updateRows = scored
    .map((scoredLead) => {
      const current = leadMap.get(normalizeWebsite(scoredLead.institutionWebsite));
      if (!current) {
        return null;
      }
      if (!parsed.force && (current.status === "blocked" || current.status === "disqualified")) {
        return null;
      }
      return {
        id: current.id,
        status: nextStatus,
        score_total: round2(scoredLead.totalScore),
        score_breakdown: {
          weightedScoreBand: scoredLead.weightedScoreBand,
          urgencyScore: scoredLead.urgencyScore,
          icpFitScore: scoredLead.icpFitScore,
          breakdown: scoredLead.breakdown,
          careerTransitionSignals: scoredLead.careerTransitionSignals,
          transferSignals: scoredLead.transferSignals,
          advisorSignals: scoredLead.advisorSignals,
          roleSignals: scoredLead.roleSignals,
          redFlags: scoredLead.redFlags,
        },
        decision_makers_json: scoredLead.decisionMakers,
        decision_maker_count: scoredLead.decisionMakers.length,
        updated_at: nowIso(),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  for (const row of updateRows) {
    const { error: updateError } = await supabase
      .from("cc_research_leads")
      .update({
        status: row.status,
        score_total: row.score_total,
        score_breakdown: row.score_breakdown,
        decision_makers_json: row.decision_makers_json,
        decision_maker_count: row.decision_maker_count,
        updated_at: row.updated_at,
      })
      .eq("id", row.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  const topLeadIds = topLeadMappings
    .map((entry) => entry.leadId)
    .filter((id): id is string => Boolean(id));

  if (includeOutreach && topLeadIds.length > 0) {
    const drafts = createCcOutreachDrafts(topLeads);

    await supabase
      .from("cc_research_outreach")
      .delete()
      .eq("lead_id", topLeadIds[0])
      .in(
        "channel",
        ["email", "linkedin"],
      );

    if (topLeadIds.length > 1) {
      for (const leadId of topLeadIds.slice(1)) {
        await supabase
          .from("cc_research_outreach")
          .delete()
          .eq("lead_id", leadId)
          .in("channel", ["email", "linkedin"]);
      }
    }

    const draftRows: Array<{
      lead_id: string;
      channel: CcOutreachChannel;
      subject_a: string;
      subject_b: string;
      message: string;
    }> = [];

    for (let i = 0; i < drafts.length; i += 1) {
      const draft = drafts[i];
      const mappedLead = topLeadMappings[i];
      const leadId = mappedLead?.leadId;
      if (!leadId) {
        continue;
      }

      draftRows.push(
        {
          lead_id: leadId,
          channel: "email",
          subject_a: draft.subjectA,
          subject_b: draft.subjectB,
          message: draft.email,
        },
        {
          lead_id: leadId,
          channel: "linkedin",
          subject_a: draft.subjectA,
          subject_b: draft.subjectB,
          message: draft.linkedinMessage,
        },
      );
    }

    if (draftRows.length > 0) {
      const { error: draftError } = await supabase.from("cc_research_outreach").insert(draftRows);
      if (draftError) {
        console.warn("Unable to store CC outreach drafts", draftError.message);
      }
    }
  }

  const leadIds = (leadRows || []).map((lead) => lead.id);
  const [allLeadsRows, outreachRows, interviewRows, contactRows, interviewCountResult] = await Promise.all([
    supabase
      .from("cc_research_leads")
      .select("id, campaign_id, institution_name, institution_website, geography, student_count, tuition, program_tags, notes, status, score_total, score_breakdown, decision_makers_json, decision_maker_count, created_at, updated_at")
      .eq("campaign_id", parsed.campaignId)
      .order("created_at", { ascending: false }),
    leadIds.length > 0
      ? supabase
        .from("cc_research_outreach")
        .select("id, lead_id, channel, subject_a, subject_b, message, sent_at, response_at, response_type, next_action")
        .in("lead_id", leadIds)
      : Promise.resolve({ data: [] as DbOutreachRow[], error: null }),
    leadIds.length > 0
      ? supabase
        .from("cc_research_interviews")
        .select("id, lead_id, persona, contact_name, contact_role, scheduled_at, status, outcome, pain_theme_tags, notes, recording_link, raw_transcript_snippet")
        .in("lead_id", leadIds)
      : Promise.resolve({ data: [] as DbInterviewRow[], error: null }),
    leadIds.length > 0
      ? supabase
        .from("cc_research_contacts")
        .select("id, lead_id, full_name, role, email, linkedin_url, verified")
        .in("lead_id", leadIds)
      : Promise.resolve({ data: [] as DbContactRow[], error: null }),
    leadIds.length > 0
      ? supabase
          .from("cc_research_interviews")
          .select("id", { count: "exact", head: true })
          .in("lead_id", leadIds)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  if (allLeadsRows.error || outreachRows.error || interviewRows.error || contactRows.error || interviewCountResult.error) {
    throw new Error(allLeadsRows.error?.message || outreachRows.error?.message || interviewRows.error?.message || contactRows.error?.message || interviewCountResult.error?.message || "Failed to load campaign data");
  }

  const leads = mapLeadRowsWithContacts((allLeadsRows.data || []) as DbLeadRow[], contactRows.data || []);
  const outreachAttempts = (outreachRows.data || []).map((row) => mapOutreach(row as DbOutreachRow));
  const topLeadSet = new Set(topLeadMappings.map((entry) => entry.leadId));

  const outreachMap = new Map<string, CcOutreachDraft[]>();
  for (const lead of topLeads) {
    const leadId = leadMap.get(normalizeWebsite(lead.institutionWebsite))?.id;
    if (!leadId) {
      continue;
    }

    const related = outreachAttempts.filter((attempt) => attempt.leadId === leadId);
    if (!related.length) {
      continue;
    }

    outreachMap.set(leadId, [
      {
        leadId,
        subjectA: related[0]?.subjectA || "",
        subjectB: related[0]?.subjectB || "",
        email: related.find((attempt) => attempt.channel === "email")?.message || "",
        linkedinMessage: related.find((attempt) => attempt.channel === "linkedin")?.message || "",
      },
    ]);
  }

  const interviews = (interviewRows.data || []).map((row) => mapInterview(row as DbInterviewRow));
  const result: CcRunResult = {
    campaignId: campaign.id,
    pipelineStats: {
      discoveredCount: discovered.length,
      scoredCount: scored.length,
      outreachDraftCount: includeOutreach ? topLeadIds.length * 2 : 0,
      replyCount: outreachAttempts.filter((attempt) => Boolean(attempt.responseAt)).length,
      interviewCount: interviewCountResult.count || 0,
    },
    leads,
    topLeads: leads
      .filter((lead) => topLeadSet.has(lead.id))
      .map((lead) => ({
        ...lead,
        outreach: outreachMap.get(lead.id) || [],
      })),
    weights,
  };

  return result;
}

export async function getCampaignDashboardPayload(campaignId: string): Promise<CcDashboardPayload> {
  const parsed = campaignIdSchema.parse({ campaignId });
  const campaign = await getCcCampaign(parsed.campaignId);
  const supabase = await createClient();

  const { data: leadsRows, error: leadsError } = await supabase
    .from("cc_research_leads")
    .select("id, campaign_id, institution_name, institution_website, geography, student_count, tuition, program_tags, notes, status, score_total, decision_makers_json, decision_maker_count, score_breakdown, created_at, updated_at")
    .eq("campaign_id", parsed.campaignId)
    .order("created_at", { ascending: false });

  if (leadsError) {
    throw new Error(leadsError.message);
  }

  const leadIds = (leadsRows || []).map((lead) => lead.id);
  const [contactsRows, outreachRows, interviewRows, feedbackRows] = await Promise.all([
    leadIds.length
      ? supabase
          .from("cc_research_contacts")
          .select("id, lead_id, full_name, role, email, linkedin_url, verified")
          .in("lead_id", leadIds)
      : Promise.resolve({ data: [] as DbContactRow[], error: null }),
    leadIds.length
      ? supabase
          .from("cc_research_outreach")
          .select("id, lead_id, channel, subject_a, subject_b, message, sent_at, response_at, response_type, next_action")
          .in("lead_id", leadIds)
      : Promise.resolve({ data: [] as DbOutreachRow[], error: null }),
    leadIds.length
      ? supabase
          .from("cc_research_interviews")
          .select("id, lead_id, persona, contact_name, contact_role, scheduled_at, status, outcome, pain_theme_tags, notes, recording_link, raw_transcript_snippet")
          .in("lead_id", leadIds)
      : Promise.resolve({ data: [] as DbInterviewRow[], error: null }),
    leadIds.length
      ? supabase
          .from("cc_research_feedback_events")
          .select("lead_id, segment_key, outcome, objection_reason, score_snapshot_json, notes")
          .eq("campaign_id", parsed.campaignId)
      : Promise.resolve({ data: [] as DbFeedbackRow[], error: null }),
  ]);

  if (contactsRows.error || outreachRows.error || interviewRows.error || feedbackRows.error) {
    throw new Error(
      contactsRows.error?.message || outreachRows.error?.message || interviewRows.error?.message || feedbackRows.error?.message || "Failed to load campaign dashboard payload",
    );
  }

  const leads = mapLeadRowsWithContacts((leadsRows || []) as DbLeadRow[], contactsRows.data || []);
  const outreachAttempts = (outreachRows.data || []).map((row) => mapOutreach(row as DbOutreachRow));
  const interviews = (interviewRows.data || []).map((row) => mapInterview(row as DbInterviewRow));

  const statusBuckets = LEAD_STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<CcLeadStatus, number>,
  );

  const scoreBandDistribution: Record<string, number> = {
    "0-40": 0,
    "41-60": 0,
    "61-80": 0,
    "81-100": 0,
  };

  const responseStateDistribution: Record<ResponseState, number> = {
    pending: 0,
    replied: 0,
    no_response: 0,
    outreach_sent: 0,
  };

  for (const lead of leads) {
    statusBuckets[lead.status] = (statusBuckets[lead.status] || 0) + 1;
    scoreBandDistribution[lead.weightedScoreBand] = (scoreBandDistribution[lead.weightedScoreBand] || 0) + 1;
    const responseState = calculateResponseState(lead.id, outreachAttempts, lead.status);
    responseStateDistribution[responseState] = (responseStateDistribution[responseState] || 0) + 1;
    lead.nextAction = statusToNextAction(lead.status);
  }

  const painThemeMap: Record<string, number> = {};
  for (const interview of interviews) {
    for (const theme of interview.painThemeTags || []) {
      const key = theme.trim().toLowerCase();
      if (!key) {
        continue;
      }
      painThemeMap[key] = (painThemeMap[key] || 0) + 1;
    }
  }

  const topPainThemes = Object.entries(painThemeMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const feedbackEvents: CcFeedbackEvent[] = (feedbackRows.data || []).map((row) => ({
    leadId: String(row.lead_id || ""),
    campaignId: parsed.campaignId,
    segmentKey: row.segment_key || undefined,
    outcome: String(row.outcome || ""),
    objectionReason: row.objection_reason || undefined,
    scoreSnapshot: (row.score_snapshot_json as Record<string, number>) || undefined,
    notes: row.notes || undefined,
  }));

  return {
    campaign,
    leads,
    outreachAttempts,
    interviews,
    funnel: LEAD_STATUS_ORDER.map((status) => ({ status, count: statusBuckets[status] || 0 })),
    scoreBandDistribution,
    responseStateDistribution,
    topPainThemes,
    feedbackEvents,
    pipelineStats: {
      discovered: leads.length,
      scored: leads.filter((lead) =>
        ["scored", "outreach_ready", "emailed", "linkedIned", "replied", "interviewed", "no_response"].includes(lead.status),
      ).length,
      outreachSent: outreachAttempts.filter((attempt) => Boolean(attempt.sentAt)).length,
      replies: outreachAttempts.filter((attempt) => Boolean(attempt.responseAt)).length,
      interviews: interviews.length,
      completed: interviews.filter((interview) => interview.status === "completed").length,
    },
  };
}

export async function updateCcLeadStatus(leadId: string, payload: LeadStatusTransitionInput): Promise<void> {
  const parsed = leadStatusTransitionSchema.parse(payload);
  const parsedLeadId = z.string().uuid().parse(leadId);
  const supabase = await createClient();

  const { data: lead, error } = await supabase
    .from("cc_research_leads")
    .select("id, status")
    .eq("id", parsedLeadId)
    .single();

  if (error || !lead) {
    throw new Error(error?.message || "Lead not found");
  }

  const currentStatus = (lead.status as CcLeadStatus) || "seeded";
  if (!ALLOWED_STATUS_TRANSITIONS[currentStatus]?.includes(parsed.status)) {
    throw new Error(`Invalid status transition from ${currentStatus} to ${parsed.status}`);
  }

  const { error: updateError } = await supabase
    .from("cc_research_leads")
    .update({ status: parsed.status, updated_at: nowIso() })
    .eq("id", parsedLeadId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function upsertCcOutreach(input: OutreachAttemptInput): Promise<CcOutreachAttempt> {
  const parsed = outreachAttemptSchema.parse(input);
  const supabase = await createClient();

  const { data: lead, error: leadError } = await supabase
    .from("cc_research_leads")
    .select("id, status")
    .eq("id", parsed.leadId)
    .single();

  if (leadError || !lead) {
    throw new Error("Lead not found");
  }

  const existing = await supabase
    .from("cc_research_outreach")
    .select("id")
    .eq("lead_id", parsed.leadId)
    .eq("channel", parsed.channel)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let persisted: DbOutreachRow | null = null;

  if (existing.data?.id) {
    const { data, error } = await supabase
      .from("cc_research_outreach")
      .update({
        subject_a: parsed.subjectA || null,
        subject_b: parsed.subjectB || null,
        message: parsed.message,
        sent_at: parsed.sentAt || null,
        response_at: parsed.responseAt || null,
        response_type: parsed.responseType || null,
        next_action: parsed.nextAction || null,
        updated_at: nowIso(),
      })
      .eq("id", existing.data.id)
      .select("id, lead_id, channel, subject_a, subject_b, message, sent_at, response_at, response_type, next_action")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    persisted = data as DbOutreachRow | null;
  } else {
    const { data, error } = await supabase
      .from("cc_research_outreach")
      .insert({
        lead_id: parsed.leadId,
        channel: parsed.channel,
        subject_a: parsed.subjectA || null,
        subject_b: parsed.subjectB || null,
        message: parsed.message,
        sent_at: parsed.sentAt || null,
        response_at: parsed.responseAt || null,
        response_type: parsed.responseType || null,
        next_action: parsed.nextAction || null,
      })
      .select("id, lead_id, channel, subject_a, subject_b, message, sent_at, response_at, response_type, next_action")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    persisted = data as DbOutreachRow | null;
  }

  const targetStatus = parsed.responseAt
    ? "replied"
    : parsed.channel === "email"
      ? "emailed"
      : "linkedIned";

  if (ALLOWED_STATUS_TRANSITIONS[(lead.status as CcLeadStatus) || "seeded"]?.includes(targetStatus)) {
    await supabase
      .from("cc_research_leads")
      .update({ status: targetStatus, updated_at: nowIso() })
      .eq("id", parsed.leadId);
  }

  if (!persisted) {
    throw new Error("Failed to upsert outreach attempt");
  }

  return mapOutreach(persisted);
}

export async function saveCcInterview(input: z.infer<typeof interviewSchema>): Promise<CcInterview> {
  const parsed = interviewSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cc_research_interviews")
    .insert({
      lead_id: parsed.leadId,
      persona: parsed.persona,
      contact_name: parsed.contactName || null,
      contact_role: parsed.contactRole || null,
      scheduled_at: parsed.scheduledAt || null,
      status: parsed.status,
      outcome: parsed.outcome,
      pain_theme_tags: parsed.painThemeTags,
      notes: parsed.notes || null,
      recording_link: parsed.recordingLink || null,
      raw_transcript_snippet: parsed.rawTranscriptSnippet || null,
    })
    .select("id, lead_id, persona, contact_name, contact_role, scheduled_at, status, outcome, pain_theme_tags, notes, recording_link, raw_transcript_snippet")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to save interview");
  }

  if (parsed.outcome === "completed") {
    await supabase
      .from("cc_research_leads")
      .update({ status: "interviewed", updated_at: nowIso() })
      .eq("id", parsed.leadId);
  }

  return mapInterview(data as unknown as DbInterviewRow);
}

export async function saveCcFeedback(input: FeedbackEventInput): Promise<{
  updatedWeights: CcICPWeights;
  weightDelta: Record<keyof CcICPWeights, number>;
  objectionFrequency: Record<string, number>;
  conversion: Record<string, { total: number; positive: number; blocked: number; noResponse: number; rate: number }>;
  notes: string[];
}> {
  const parsed = feedbackEventSchema.parse(input);
  const supabase = await createClient();

  const { error } = await supabase.from("cc_research_feedback_events").insert({
    campaign_id: parsed.campaignId,
    lead_id: parsed.leadId,
    segment_key: parsed.segmentKey || null,
    outcome: parsed.outcome,
    objection_reason: parsed.objectionReason || null,
    score_snapshot_json: parsed.scoreSnapshot || null,
    notes: parsed.notes || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  const [{ data: campaign, error: campaignError }, { data: rows, error: feedbackError }] = await Promise.all([
    supabase
      .from("cc_research_campaigns")
      .select("active_weights")
      .eq("id", parsed.campaignId)
      .single(),
    supabase
      .from("cc_research_feedback_events")
      .select("lead_id, segment_key, outcome, objection_reason, score_snapshot_json, notes")
      .eq("campaign_id", parsed.campaignId),
  ]);

  if (campaignError || !campaign) {
    throw new Error(campaignError?.message || "Campaign not found");
  }
  if (feedbackError) {
    throw new Error(feedbackError.message);
  }

  const events: CcFeedbackEvent[] = (rows || []).map((row) => ({
    leadId: String(row.lead_id || ""),
    campaignId: parsed.campaignId,
    segmentKey: row.segment_key || undefined,
    outcome: String(row.outcome || ""),
    objectionReason: row.objection_reason || undefined,
    scoreSnapshot: (row.score_snapshot_json as Record<string, number>) || undefined,
    notes: row.notes || undefined,
  }));

  const learned = learnFromFeedback(normalizeWeights(campaign.active_weights as CcICPWeights | null), events);

  await supabase
    .from("cc_research_campaigns")
    .update({ active_weights: learned.updatedWeights })
    .eq("id", parsed.campaignId);

  return {
    updatedWeights: learned.updatedWeights,
    weightDelta: learned.weightDelta,
    objectionFrequency: learned.objectionFrequency,
    conversion: learned.conversion,
    notes: learned.notes,
  };
}

export async function buildCcExportPack(campaignId: string): Promise<CcExportPack> {
  const parsed = campaignIdSchema.parse({ campaignId });
  const payload = await getCampaignDashboardPayload(parsed.campaignId);

  return {
    campaign: {
      id: payload.campaign.id,
      title: payload.campaign.title,
      goal: payload.campaign.goal,
      state: payload.campaign.state,
    },
    leads: payload.leads.map((lead) => ({
      id: lead.id,
      campaignId: lead.campaignId,
      institutionName: lead.institutionName,
      geography: lead.geography,
      studentCount: lead.studentCount,
      tuition: lead.tuition,
      status: lead.status,
      totalScore: lead.totalScore,
      decisionMakerCount: lead.decisionMakerCount,
      createdAt: lead.createdAt,
      programTags: lead.programTags,
      notes: lead.notes,
    })),
    interviews: payload.interviews.map((interview) => ({
      id: interview.id,
      leadId: interview.leadId,
      persona: interview.persona,
      contactName: interview.contactName,
      contactRole: interview.contactRole,
      status: interview.status,
      outcome: interview.outcome,
      painThemeTags: interview.painThemeTags,
      notes: interview.notes,
    })),
    feedbackEvents: payload.feedbackEvents || [],
  };
}
