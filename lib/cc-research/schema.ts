import { z } from "zod";
import type {
  CcCampaignState,
  CcInterviewOutcome,
  CcInterviewStatus,
  CcLeadStatus,
  CcPersona,
  CcOutreachChannel,
  CcScoreDimensionKey,
  CcICPWeights,
  CcLeadDiscoveryFilters,
} from "@/lib/cc-research/types";

const personaSchema = z.enum([
  "student",
  "advisor",
  "counselor",
  "career_services",
  "transfer_office",
  "employer",
]);

export const leadStatusSchema = z.enum([
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
]);

export const outreachChannelSchema: z.ZodType<CcOutreachChannel> = z.enum(["email", "linkedin"]);

export const campaignStateSchema: z.ZodType<CcCampaignState> = z.enum([
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
]);

const filtersSchema: z.ZodType<CcLeadDiscoveryFilters> = z.object({
  geographies: z.array(z.string().trim().toLowerCase()).default([]).transform((values) =>
    values.filter((value) => value.length > 0)
  ),
  minStudentCount: z.number().int().positive().optional(),
  minTuitionUsd: z.number().nonnegative().optional(),
  keywords: z.array(z.string().trim()).default([]).transform((values) =>
    values.map((value) => value.toLowerCase()).filter((value) => value.length > 0)
  ),
  personaSegments: z.array(personaSchema).optional(),
});

const scoreDimensionSchema: z.ZodType<Record<CcScoreDimensionKey, number>> = z.object({
  studentScale: z.number().positive(),
  advisorStaffing: z.number().positive(),
  careerTransitionLanguage: z.number().positive(),
  transferSignals: z.number().positive(),
  easeOfContact: z.number().positive(),
});

const normalizedWeightsSchema: z.ZodType<CcICPWeights> = z.object({
  studentScale: z.number().min(0).max(100),
  advisorStaffing: z.number().min(0).max(100),
  careerTransitionLanguage: z.number().min(0).max(100),
  transferSignals: z.number().min(0).max(100),
  easeOfContact: z.number().min(0).max(100),
});

const decisionMakerSchema = z.object({
  fullName: z.string().min(1),
  role: z.string().min(1),
  email: z.string().email().optional(),
  linkedinUrl: z.string().url().optional(),
});

const seedLeadSchema = z.object({
  id: z.string().optional(),
  institutionName: z.string().min(2),
  institutionWebsite: z.string().url(),
  geography: z.string().optional(),
  studentCount: z.number().int().nonnegative().optional(),
  tuition: z.number().nonnegative().optional(),
  programTags: z.array(z.string().min(1)).optional(),
  notes: z.string().optional(),
  source: z.string().optional().nullable(),
  decisionMakers: z.array(decisionMakerSchema).optional(),
});

export const createCampaignSchema = z.object({
  title: z.string().min(3).max(120),
  goal: z.string().max(200).optional(),
  state: campaignStateSchema.optional(),
  slug: z.string().trim().min(3).max(80).optional(),
  filters: filtersSchema.optional(),
  activeWeights: normalizedWeightsSchema.partial().optional(),
});

export const campaignIdSchema = z.object({
  campaignId: z.string().uuid(),
});

export const ccSeedLeadsSchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  source: z.string().optional(),
  payload: z.union([
    z.array(seedLeadSchema).min(1),
    z.string().min(1),
  ]),
});

export const runCampaignSchema = z.object({
  campaignId: z.string().uuid(),
  topN: z.number().int().min(1).max(100).optional(),
  includeOutreach: z.boolean().default(true).optional(),
  useAIOutreach: z.boolean().default(false).optional(),
  force: z.boolean().default(false).optional(),
  filters: filtersSchema.optional(),
  weights: scoreDimensionSchema.partial().optional(),
});

export const leadStatusTransitionSchema = z.object({
  status: leadStatusSchema,
  notes: z.string().optional(),
  responseType: z.string().optional(),
});

export const outreachAttemptSchema = z.object({
  leadId: z.string().uuid(),
  channel: outreachChannelSchema,
  subjectA: z.string().optional(),
  subjectB: z.string().optional(),
  message: z.string().min(20),
  sentAt: z.string().datetime().optional(),
  responseAt: z.string().datetime().optional(),
  responseType: z.string().optional(),
  nextAction: z.string().optional(),
});

export const interviewSchema = z.object({
  leadId: z.string().uuid(),
  persona: personaSchema,
  contactName: z.string().optional(),
  contactRole: z.string().optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show", "reschedule"])
    .transform((value) => value as CcInterviewStatus),
  outcome: z
    .enum(["completed", "no_show", "declined", "reschedule", "scheduled"])
    .transform((value) => value as CcInterviewOutcome),
  painThemeTags: z.array(z.string()).default([]).transform((value) => value.map((item) => item.trim()).filter(Boolean)),
  notes: z.string().optional(),
  recordingLink: z.string().url().optional(),
  rawTranscriptSnippet: z.string().optional(),
});

export const feedbackEventSchema = z.object({
  leadId: z.string().uuid(),
  campaignId: z.string().uuid(),
  segmentKey: z.string().optional(),
  outcome: z.string().min(1),
  objectionReason: z.string().optional(),
  scoreSnapshot: z
    .object({
      studentScale: z.number().min(0).max(100).optional(),
      advisorStaffing: z.number().min(0).max(100).optional(),
      careerTransitionLanguage: z.number().min(0).max(100).optional(),
      transferSignals: z.number().min(0).max(100).optional(),
      easeOfContact: z.number().min(0).max(100).optional(),
    })
    .partial(),
  notes: z.string().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type RunCampaignInput = z.infer<typeof runCampaignSchema>;
export type SeedLeadsInput = z.infer<typeof ccSeedLeadsSchema>;
export type LeadStatusTransitionInput = z.infer<typeof leadStatusTransitionSchema>;
export type OutreachAttemptInput = z.infer<typeof outreachAttemptSchema>;
export type InterviewInput = z.infer<typeof interviewSchema>;
export type FeedbackEventInput = z.infer<typeof feedbackEventSchema>;
export type CcSeedLeadSchema = z.infer<typeof seedLeadSchema>;
