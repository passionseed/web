"use server";

import { requireAdmin } from "@/lib/security/route-guards";
import { generateDirectionProfileCore } from "@/lib/ai/directionProfileEngine";
import { AssessmentAnswers, DirectionFinderResult } from "@/types/direction-finder";

export interface RegenerateResult {
  modelId: string;
  result: Partial<DirectionFinderResult>;
  generationTime: number;
  prompt?: string;
  error?: string;
}

// Each model id is a paid LLM call, so cap how many one request can fan out to.
const MAX_MODELS = 5;

function isValidModelSelection(modelIds: unknown): modelIds is string[] {
  if (!Array.isArray(modelIds)) return false;
  if (modelIds.length < 1 || modelIds.length > MAX_MODELS) return false;
  return modelIds.every((id) => typeof id === "string" && id.length > 0 && id.length <= 200);
}

/**
 * Regenerate direction profile with specific model(s) for comparison
 * Only accessible by admin users
 */
export async function regenerateDirectionProfile(
  answers: AssessmentAnswers,
  chatHistory: { role: "user" | "assistant"; content: string }[],
  modelIds: string[],
  language: "en" | "th" = "en"
): Promise<RegenerateResult[]> {
  const admin = await requireAdmin();
  if (!admin.ok) throw new Error("Only admins can use model comparison");
  if (!isValidModelSelection(modelIds)) {
    throw new Error(`Select between 1 and ${MAX_MODELS} valid models`);
  }

  // Generate profiles for each model
  const results: RegenerateResult[] = [];

  for (const modelId of modelIds) {
    const startTime = Date.now();

    try {
      const result = await generateDirectionProfileCore(
        chatHistory,
        answers,
        modelId,
        language
      );

      const generationTime = Date.now() - startTime;

      results.push({
        modelId,
        result,
        generationTime,
        prompt: result.debugMetadata?.prompt,
      });

      console.log(
        `[Model Comparison] ${modelId} completed in ${generationTime}ms`
      );
    } catch (error) {
      console.error(`[Model Comparison] ${modelId} failed:`, error);
      results.push({
        modelId,
        result: { profile: undefined, vectors: [] } as any,
        generationTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * Check if current user can access model comparison feature
 * Returns true for admins only (not teachers)
 */
export async function canAccessModelComparison(): Promise<boolean> {
  return (await requireAdmin()).ok;
}
