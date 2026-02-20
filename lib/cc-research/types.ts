export type CcLeadStatus =
  | "seeded"
  | "enriched"
  | "scored"
  | "outreach_ready"
  | "emailed"
  | "linkedIned"
  | "replied"
  | "no_response"
  | "interviewed"
  | "blocked"
  | "disqualified";

export type CcPersona =
  | "student"
  | "advisor"
  | "counselor"
  | "career_services"
  | "transfer_office"
  | "employer";

export type CcOutreachChannel = "email" | "linkedin";

export type CcInterviewOutcome = "completed" | "no_show" | "declined" | "reschedule" | "scheduled";

export type CcCampaignState = "draft" | "active" | "paused" | "completed" | "archived";

export type CcInterviewStatus = "scheduled" | "completed" | "cancelled" | "no_show" | "reschedule";

export type CcScoreDimensionKey =
  | "studentScale"
  | "advisorStaffing"
  | "careerTransitionLanguage"
  | "transferSignals"
  | "easeOfContact";

export interface CcICPWeights {
  studentScale: number;
  advisorStaffing: number;
  careerTransitionLanguage: number;
  transferSignals: number;
  easeOfContact: number;
}

export interface CcLeadDiscoveryFilters {
  geographies: string[];
  minStudentCount?: number;
  minTuitionUsd?: number;
  keywords: string[];
  personaSegments?: CcPersona[];
}

export interface CcCampaignInput {
  title: string;
  goal?: string | null;
  state?: CcCampaignState;
  filters?: CcLeadDiscoveryFilters;
  activeWeights?: Partial<CcICPWeights>;
  slug?: string;
}

export interface CcCampaign {
  id: string;
  slug: string;
  title: string;
  goal: string | null;
  state: CcCampaignState;
  filters: CcLeadDiscoveryFilters;
  activeWeights: CcICPWeights;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  leadCount: number;
  discoveredAt: number;
}

export interface CcDecisionMaker {
  fullName: string;
  role: string;
  email?: string;
  linkedinUrl?: string;
}

export interface CcSeedLead {
  id?: string;
  institutionName: string;
  institutionWebsite: string;
  geography?: string;
  studentCount?: number;
  tuition?: number;
  programTags?: string[];
  notes?: string;
  source?: string | null;
  decisionMakers?: CcDecisionMaker[];
}

export interface CcEnrichedLead {
  id: string;
  institutionName: string;
  institutionWebsite: string;
  geography?: string;
  studentCount?: number;
  tuition?: number;
  programTags: string[];
  notes?: string;
  source?: string | null;
  decisionMakers: CcDecisionMaker[];
  inferredEmailPatterns: string[];
  careerTransitionSignals: string[];
  transferSignals: string[];
  advisorSignals: string[];
  roleSignals: string[];
  redFlags: string[];
}

export interface CcDimensionBreakdown {
  score: number;
  weight: number;
  weightedScore: number;
  reasoning: string[];
}

export interface CcScoreBreakdown {
  studentScale: CcDimensionBreakdown;
  advisorStaffing: CcDimensionBreakdown;
  careerTransitionLanguage: CcDimensionBreakdown;
  transferSignals: CcDimensionBreakdown;
  easeOfContact: CcDimensionBreakdown;
}

export interface CcScoredLead extends CcEnrichedLead {
  totalScore: number;
  urgencyScore: number;
  icpFitScore: number;
  weightedScoreBand: "0-40" | "41-60" | "61-80" | "81-100";
  breakdown: CcScoreBreakdown;
}

export interface CcOutreachDraft {
  leadId: string;
  subjectA: string;
  subjectB: string;
  email: string;
  linkedinMessage: string;
}

export interface CcOutreachAttempt {
  id: string;
  leadId: string;
  channel: CcOutreachChannel;
  subjectA?: string | null;
  subjectB?: string | null;
  message: string;
  sentAt: string | null;
  responseAt: string | null;
  responseType?: string | null;
  nextAction?: string | null;
}

export interface CcInterview {
  id: string;
  leadId: string;
  persona: CcPersona;
  contactName?: string | null;
  contactRole?: string | null;
  scheduledAt: string | null;
  status: CcInterviewStatus;
  outcome: CcInterviewOutcome;
  painThemeTags: string[];
  notes?: string | null;
  recordingLink?: string | null;
  rawTranscriptSnippet?: string | null;
}

export interface CcLeadRow extends CcScoredLead {
  campaignId: string;
  status: CcLeadStatus;
  decisionMakerCount: number;
  contactCount: number;
  createdAt: string;
  updatedAt: string;
  nextAction?: string | null;
  personaSegments: CcPersona[];
}

export interface CcFeedbackEvent {
  leadId: string;
  campaignId: string;
  segmentKey?: string;
  outcome: string;
  objectionReason?: string;
  scoreSnapshot?: Partial<Record<CcScoreDimensionKey, number>>;
  notes?: string;
}

export interface CcFunnelPoint {
  status: CcLeadStatus;
  count: number;
}

export interface CcCampaignSummary {
  campaignId: string;
  campaignTitle: string;
  campaignSlug: string;
  state: CcCampaignState;
  leadCount: number;
  statusBuckets: Record<CcLeadStatus, number>;
  scoreAvg: number;
}

export interface CcRunResult {
  campaignId: string;
  pipelineStats: {
    discoveredCount: number;
    scoredCount: number;
    outreachDraftCount: number;
    replyCount: number;
    interviewCount: number;
  };
  leads: CcLeadRow[];
  topLeads: Array<CcLeadRow & { outreach: CcOutreachDraft[] }>;
  weights: CcICPWeights;
}

export interface CcDashboardPayload {
  campaign: CcCampaign;
  leads: CcLeadRow[];
  outreachAttempts: CcOutreachAttempt[];
  interviews: CcInterview[];
  funnel: CcFunnelPoint[];
  scoreBandDistribution: Record<string, number>;
  responseStateDistribution: Record<string, number>;
  topPainThemes: Array<{ name: string; count: number }>;
  pipelineStats: {
    discovered: number;
    scored: number;
    outreachSent: number;
    replies: number;
    interviews: number;
    completed: number;
  };
}

export interface CcExportPack {
  campaign: {
    id: string;
    title: string;
    goal: string | null;
    state: CcCampaignState;
  };
  leads: Array<
    Pick<
      CcLeadRow,
      | "id"
      | "campaignId"
      | "institutionName"
      | "geography"
      | "studentCount"
      | "tuition"
      | "status"
      | "totalScore"
      | "decisionMakerCount"
      | "createdAt"
      | "programTags"
      | "notes"
    >
  >;
  interviews: Array<
    Pick<
      CcInterview,
      "id" | "leadId" | "persona" | "contactName" | "contactRole" | "status" | "outcome" | "painThemeTags" | "notes"
    >
  >;
  feedbackEvents: CcFeedbackEvent[];
}
