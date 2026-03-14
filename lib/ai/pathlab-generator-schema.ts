import { z } from "zod";

const learningObjectiveSchema = z.object({
  day: z.number().int().min(1).max(30),
  title: z.string().min(2).max(140),
  objective: z.string().min(8).max(500),
  studentDecisionQuestion: z.string().min(8).max(300),
});

const expertContextSchema = z.object({
  identity: z.object({
    name: z.string().min(1).max(120),
    title: z.string().min(1).max(160),
    company: z.string().min(1).max(160),
    field: z.string().min(1).max(120),
    role: z.string().min(1).max(160),
    specialization: z.string().max(200).optional(),
    workContext: z.string().max(300).optional(),
    yearsInField: z.number().int().min(0).max(80).optional(),
    experienceLevel: z.string().max(80).optional(),
    credibilityMarkers: z.array(z.string().min(1).max(200)).max(8).optional(),
  }),
  careerTruths: z.object({
    mostImportant: z.array(z.string().min(1).max(240)).max(8).optional(),
    mundaneButRequired: z.array(z.string().min(1).max(240)).max(8).optional(),
    beginnersUnderestimate: z.array(z.string().min(1).max(240)).max(8).optional(),
    hiddenChallenges: z.array(z.string().min(1).max(240)).max(8).optional(),
    rewardingMoments: z.array(z.string().min(1).max(240)).max(8).optional(),
    noviceToExpertShifts: z.array(z.string().min(1).max(240)).max(8).optional(),
    misconceptions: z.array(z.string().min(1).max(240)).max(8).optional(),
  }),
});

export const pathLabGeneratorRequestSchema = z.object({
  topic: z.string().min(2).max(160),
  audience: z.string().min(2).max(120),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  totalDays: z.coerce.number().int().min(1).max(30),
  tone: z.string().min(2).max(80),
  constraints: z.string().max(1000).optional().or(z.literal("")),
  categoryId: z.string().uuid().nullable().optional(),
  existingMapId: z.string().uuid().optional(), // For editing existing maps
  expertContext: expertContextSchema.optional(),
  learningObjectives: z.array(learningObjectiveSchema).length(5).optional(),
  fitSignals: z.array(z.string().min(1).max(200)).max(8).optional(),
  misfitSignals: z.array(z.string().min(1).max(200)).max(8).optional(),
  mustExperience: z.array(z.string().min(1).max(240)).max(8).optional(),
  mustUnderstand: z.array(z.string().min(1).max(240)).max(8).optional(),
});

const contentItemSchema = z.object({
  type: z.enum(["text", "video", "pdf", "image", "resource_link"]),
  title: z.string().max(140).nullable().optional(),
  body: z.string().max(12000).nullable().optional(),
  url: z.string().max(2000).nullable().optional(),
});

const quizQuestionSchema = z.object({
  question_text: z.string().min(5).max(500),
  options: z
    .array(
      z.object({
        option: z.string().min(1).max(8),
        text: z.string().min(1).max(300),
      }),
    )
    .min(2)
    .max(6),
  correct_option: z.string().min(1).max(8),
});

const assessmentSchema = z.object({
  type: z.enum(["none", "text_answer", "quiz", "file_upload", "checklist"]),
  prompt: z.string().max(2000).nullable().optional(),
  checklist_items: z.array(z.string().min(1).max(200)).max(20).optional(),
  quiz_questions: z.array(quizQuestionSchema).max(10).optional(),
  points_possible: z.number().int().min(0).max(500).nullable().optional(),
});

const nodeSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "key must be slug-like"),
  title: z.string().min(2).max(140),
  instructions: z.string().min(8).max(5000),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  content: z.array(contentItemSchema).min(1).max(8),
  assessment: assessmentSchema,
});

const daySchema = z.object({
  day_number: z.number().int().min(1).max(30),
  title: z.string().max(140).nullable().optional(),
  context_text: z.string().min(12).max(5000),
  reflection_prompts: z.array(z.string().min(4).max(400)).min(1).max(8),
  node_keys: z.array(z.string().min(2).max(64)).min(1).max(20),
});

const edgeSchema = z.object({
  source_key: z.string().min(2).max(64),
  destination_key: z.string().min(2).max(64),
});

export const pathLabGeneratorDraftSchema = z.object({
  seed: z.object({
    title: z.string().min(3).max(140),
    slogan: z.string().max(220),
    description: z.string().min(20).max(6000),
    category_name: z.string().min(2).max(80),
  }),
  path: z.object({
    total_days: z.number().int().min(1).max(30),
  }),
  days: z.array(daySchema).min(1).max(30),
  nodes: z.array(nodeSchema).min(1).max(200),
  edges: z.array(edgeSchema).max(500),
});

export const pathLabDayRegenerateSchema = z.object({
  title: z.string().max(140).nullable().optional(),
  context_text: z.string().min(12).max(5000),
  reflection_prompts: z.array(z.string().min(4).max(400)).min(1).max(8),
});

export const pathLabNodeRegenerateSchema = z.object({
  title: z.string().min(2).max(140),
  instructions: z.string().min(8).max(5000),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  content: z.array(contentItemSchema).min(1).max(8),
  assessment: assessmentSchema,
});

export type PathLabGeneratorRequestInput = z.infer<typeof pathLabGeneratorRequestSchema>;
export type PathLabGeneratorDraftInput = z.infer<typeof pathLabGeneratorDraftSchema>;
export type PathLabDayRegenerateInput = z.infer<typeof pathLabDayRegenerateSchema>;
export type PathLabNodeRegenerateInput = z.infer<typeof pathLabNodeRegenerateSchema>;
