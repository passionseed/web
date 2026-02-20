import { z } from "zod";

const decisionMakerSchema = z.object({
  fullName: z.string().min(1),
  role: z.string().min(1),
  linkedinUrl: z.string().url().optional(),
  email: z.string().email().optional(),
});

const rawLeadSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  website: z.string().url(),
  geography: z.string().optional(),
  studentCount: z.number().int().positive().optional(),
  annualTuitionUsd: z.number().nonnegative().optional(),
  counselingProgramSize: z.number().int().positive().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  decisionMakers: z.array(decisionMakerSchema).optional(),
});

const weightsSchema = z.object({
  budgetStrength: z.number().positive(),
  problemUrgency: z.number().positive(),
  innovationOpenness: z.number().positive(),
  alignment: z.number().positive(),
  easeOfAccess: z.number().positive(),
});

const scoreSnapshotSchema = z.object({
  budgetStrength: z.number().min(0).max(100).optional(),
  problemUrgency: z.number().min(0).max(100).optional(),
  innovationOpenness: z.number().min(0).max(100).optional(),
  alignment: z.number().min(0).max(100).optional(),
  easeOfAccess: z.number().min(0).max(100).optional(),
});

const feedbackEventSchema = z.object({
  leadId: z.string().min(1),
  segmentKey: z.string().optional(),
  outcome: z.enum(["positive_reply", "meeting_booked", "closed_won", "rejected", "no_response"]),
  rejectionReason: z.string().optional(),
  budgetInfo: z.string().optional(),
  notes: z.string().optional(),
  scoreSnapshot: scoreSnapshotSchema.optional(),
});

export const phase1WorkflowInputSchema = z.object({
  filters: z.object({
    geographies: z.array(z.string()).default([]),
    minStudentCount: z.number().int().positive().optional(),
    minAnnualTuitionUsd: z.number().nonnegative().optional(),
    keywords: z.array(z.string()).default([]),
  }),
  seedLeads: z.array(rawLeadSchema).min(1),
  topN: z.number().int().min(1).max(100).default(10).optional(),
  includeOutreach: z.boolean().default(true).optional(),
  useAIOutreach: z.boolean().default(false).optional(),
  currentWeights: weightsSchema.optional(),
  feedbackEvents: z.array(feedbackEventSchema).optional(),
});

export type Phase1WorkflowInputSchema = z.infer<typeof phase1WorkflowInputSchema>;
