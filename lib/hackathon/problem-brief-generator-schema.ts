import { z } from "zod";
import { problemBriefInputSchema } from "@/lib/hackathon/problem-brief-schema";

export const problemBriefResearchPlanSchema = z.object({
  researchFocus: z.array(z.string().min(8).max(280)).min(3).max(8),
  thaiContextAngles: z.array(z.string().min(8).max(280)).min(2).max(6),
  sourceCoverageChecklist: z.array(z.string().min(8).max(220)).min(3).max(8),
  deepResearchSections: z
    .array(
      z.object({
        title: z.string().min(4).max(120),
        purpose: z.string().min(8).max(260),
        requiredEvidence: z.array(z.string().min(8).max(220)).min(2).max(6),
      }),
    )
    .min(2)
    .max(5),
});

export const generatedProblemBriefSchema = problemBriefInputSchema;

export type ProblemBriefResearchPlan = z.infer<typeof problemBriefResearchPlanSchema>;
export type GeneratedProblemBrief = z.infer<typeof generatedProblemBriefSchema>;
