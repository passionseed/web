export type ScoreDimensionKey =
  | "budgetStrength"
  | "problemUrgency"
  | "innovationOpenness"
  | "alignment"
  | "easeOfAccess";

export interface ICPWeights {
  budgetStrength: number;
  problemUrgency: number;
  innovationOpenness: number;
  alignment: number;
  easeOfAccess: number;
}

export interface LeadDiscoveryFilters {
  geographies: string[];
  minStudentCount?: number;
  minAnnualTuitionUsd?: number;
  keywords: string[];
}

export interface DecisionMaker {
  fullName: string;
  role: string;
  linkedinUrl?: string;
  email?: string;
}

export interface RawInstitutionLead {
  id?: string;
  name: string;
  website: string;
  geography?: string;
  studentCount?: number;
  annualTuitionUsd?: number;
  counselingProgramSize?: number;
  notes?: string;
  tags?: string[];
  decisionMakers?: DecisionMaker[];
}

export interface EnrichedInstitutionLead {
  id: string;
  name: string;
  website: string;
  geography?: string;
  studentCount?: number;
  annualTuitionUsd?: number;
  counselingProgramSize?: number;
  notes?: string;
  tags: string[];
  decisionMakers: DecisionMaker[];
  inferredEmailPatterns: string[];
  innovationSignals: string[];
  urgencySignals: string[];
  alignmentSignals: string[];
  redFlags: string[];
}

export interface DimensionBreakdown {
  score: number;
  weight: number;
  weightedScore: number;
  reasoning: string[];
}

export interface ScoreBreakdown {
  budgetStrength: DimensionBreakdown;
  problemUrgency: DimensionBreakdown;
  innovationOpenness: DimensionBreakdown;
  alignment: DimensionBreakdown;
  easeOfAccess: DimensionBreakdown;
}

export interface ScoredLead extends EnrichedInstitutionLead {
  totalScore: number;
  breakdown: ScoreBreakdown;
}

export interface OutreachDraft {
  leadId: string;
  subjectA: string;
  subjectB: string;
  email: string;
  linkedinMessage: string;
  usedAI: boolean;
}

export type CRMOutcome =
  | "positive_reply"
  | "meeting_booked"
  | "closed_won"
  | "rejected"
  | "no_response";

export interface CRMFeedbackEvent {
  leadId: string;
  segmentKey?: string;
  outcome: CRMOutcome;
  rejectionReason?: string;
  budgetInfo?: string;
  notes?: string;
  scoreSnapshot?: Partial<Record<ScoreDimensionKey, number>>;
}

export interface SegmentConversionMetrics {
  total: number;
  replies: number;
  meetingsBooked: number;
  won: number;
  rejected: number;
  noResponse: number;
  replyRate: number;
  meetingRate: number;
  winRate: number;
}

export interface FeedbackLearningResult {
  updatedWeights: ICPWeights;
  weightDelta: Record<ScoreDimensionKey, number>;
  objectionFrequency: Record<string, number>;
  segmentConversion: Record<string, SegmentConversionMetrics>;
  messagingInsights: string[];
}

export interface Phase1WorkflowInput {
  filters: LeadDiscoveryFilters;
  seedLeads: RawInstitutionLead[];
  topN?: number;
  includeOutreach?: boolean;
  useAIOutreach?: boolean;
  currentWeights?: ICPWeights;
  feedbackEvents?: CRMFeedbackEvent[];
}

export interface Phase1WorkflowOutput {
  modelWeights: ICPWeights;
  pipelineStats: {
    discoveredCount: number;
    scoredCount: number;
    topCount: number;
    averageScore: number;
  };
  leads: ScoredLead[];
  topLeads: Array<
    ScoredLead & {
      outreach?: OutreachDraft;
    }
  >;
  feedbackLearning?: FeedbackLearningResult;
}
