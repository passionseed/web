/**
 * Dual-model consensus grading logic.
 *
 * Runs Kimi K2.6 (multimodal, primary) and MiniMax M2.7 (text-only, secondary)
 * in parallel, then applies consensus rules to produce a single AiDraft.
 */

import { z } from "zod";

const aiGradeSchema = z.object({
  review_status: z.enum(["pending_review", "passed", "revision_required"]),
  score_awarded: z.number().nullable(),
  feedback: z.string().min(1).max(4000),
  reasoning: z.string().max(2000),
});

export type AiGradeResult = z.infer<typeof aiGradeSchema>;

export type ModelGradeResult = {
  model: string;
  status: "passed" | "revision_required" | "pending_review";
  score_awarded: number | null;
  feedback: string;
  reasoning: string;
  raw: string;
};

export type ConsensusAgreement = "agree" | "disagree" | "single_model";

export type ConsensusModelInfo = {
  model: string;
  status: string;
  score_awarded: number | null;
  feedback: string;
  reasoning: string;
};

export type ConsensusInfo = {
  agreement: ConsensusAgreement;
  models?: ConsensusModelInfo[];
};

export type AiDraft = {
  status: "passed" | "revision_required" | "pending_review";
  score_awarded: number | null;
  points_possible: number | null;
  feedback: string;
  reasoning: string | null;
  raw_output: string;
  error: string | null;
  consensus?: ConsensusInfo;
};

export type DualGradeOutcome = {
  draft: AiDraft | null;
  autoApprove: boolean;
  error: boolean;
  primaryModel: string | null;
};

/**
 * Parse a model's raw text output into a structured grade.
 * Handles markdown-fenced JSON, raw JSON, and malformed input.
 */
export function parseModelGrade(raw: string): ModelGradeResult | null {
  if (!raw) return null;

  // Pull JSON out of possible markdown fences or prose.
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence?.[1] ?? raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  const jsonSlice = candidate.slice(start, end + 1);
  try {
    const parsed = JSON.parse(jsonSlice);
    const result = aiGradeSchema.safeParse(parsed);
    if (!result.success) return null;
    return {
      model: "unknown",
      status: result.data.review_status,
      score_awarded: result.data.score_awarded,
      feedback: result.data.feedback,
      reasoning: result.data.reasoning ?? "",
      raw,
    };
  } catch {
    return null;
  }
}

/**
 * Apply consensus rules to two model grade results.
 *
 * Rules:
 * - Both passed → auto-approve, Kimi feedback, averaged score, agreement="agree"
 * - Both revision_required → draft with min(stricter) score, agreement="agree"
 * - Disagree → pending_review with both opinions, agreement="disagree"
 * - Single model available → use that model's result, agreement="single_model"
 * - Both error → error outcome
 */
export function runDualGrade(
  kimi: ModelGradeResult | null,
  minimax: ModelGradeResult | null,
  opts?: { pointsPossible?: number | null }
): DualGradeOutcome {
  const pointsPossible = opts?.pointsPossible ?? null;

  // Both error
  if (!kimi && !minimax) {
    return { draft: null, autoApprove: false, error: true, primaryModel: null };
  }

  // Single model fallback
  if (!kimi || !minimax) {
    const winner = (kimi ?? minimax)!;
    const autoApprove = winner.status === "passed";
    const draft: AiDraft = {
      status: winner.status,
      score_awarded: winner.score_awarded,
      points_possible: pointsPossible,
      feedback: winner.feedback,
      reasoning: winner.reasoning,
      raw_output: winner.raw,
      error: null,
      consensus: {
        agreement: "single_model",
        models: [
          {
            model: winner.model,
            status: winner.status,
            score_awarded: winner.score_awarded,
            feedback: winner.feedback,
            reasoning: winner.reasoning,
          },
        ],
      },
    };
    return { draft, autoApprove, error: false, primaryModel: winner.model };
  }

  // Both available — apply consensus
  const bothPassed = kimi.status === "passed" && minimax.status === "passed";
  const bothRev =
    kimi.status === "revision_required" && minimax.status === "revision_required";
  const agree = bothPassed || bothRev;

  if (agree) {
    const averagedScore =
      kimi.score_awarded != null && minimax.score_awarded != null
        ? Math.round((kimi.score_awarded + minimax.score_awarded) / 2)
        : kimi.score_awarded ?? minimax.score_awarded ?? null;

    const status = bothPassed ? "passed" : "revision_required";
    const autoApprove = status === "passed";

    const draft: AiDraft = {
      status,
      score_awarded: averagedScore,
      points_possible: pointsPossible,
      feedback: kimi.feedback, // Kimi is primary
      reasoning: kimi.reasoning,
      raw_output: kimi.raw,
      error: null,
      consensus: {
        agreement: "agree",
        models: [
          {
            model: kimi.model,
            status: kimi.status,
            score_awarded: kimi.score_awarded,
            feedback: kimi.feedback,
            reasoning: kimi.reasoning,
          },
          {
            model: minimax.model,
            status: minimax.status,
            score_awarded: minimax.score_awarded,
            feedback: minimax.feedback,
            reasoning: minimax.reasoning,
          },
        ],
      },
    };

    return { draft, autoApprove, error: false, primaryModel: kimi.model };
  }

  // Disagree → pending_review with both opinions
  const draft: AiDraft = {
    status: "pending_review",
    score_awarded: null,
    points_possible: pointsPossible,
    feedback: kimi.feedback, // Primary model feedback shown by default
    reasoning: kimi.reasoning,
    raw_output: kimi.raw,
    error: null,
    consensus: {
      agreement: "disagree",
      models: [
        {
          model: kimi.model,
          status: kimi.status,
          score_awarded: kimi.score_awarded,
          feedback: kimi.feedback,
          reasoning: kimi.reasoning,
        },
        {
          model: minimax.model,
          status: minimax.status,
          score_awarded: minimax.score_awarded,
          feedback: minimax.feedback,
          reasoning: minimax.reasoning,
        },
      ],
    },
  };

  return { draft, autoApprove: false, error: false, primaryModel: kimi.model };
}
