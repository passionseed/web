"use server";

import { createClient } from "@/utils/supabase/server";
import { generateDirectionProfileCore } from "@/lib/ai/directionProfileEngine";
import { AssessmentAnswers, DirectionFinderResult } from "@/types/direction-finder";

export interface RegenerateResult {
  modelId: string;
  result: Partial<DirectionFinderResult>;
  generationTime: number;
  prompt?: string;
  error?: string;
}

/**
 * Regenerate direction profile with specific model(s) for comparison
 * Only accessible by admin users (or in development mode)
 */
export async function regenerateDirectionProfile(
  answers: AssessmentAnswers,
  chatHistory: { role: "user" | "assistant"; content: string }[],
  modelIds: string[],
  language: "en" | "th" = "en"
): Promise<RegenerateResult[]> {
  const supabase = await createClient();

  // Allow in development mode (NODE_ENV === 'development')
  const isDevelopment =
    process.env.NODE_ENV === 'development' ||
    process.env.VERCEL_ENV === 'preview';

  // Allow everyone in dev/preview to compare models
  const isAllowedEnv = isDevelopment;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If in dev/preview, we can be more lenient, but still track the user if logged in
  // Check admin role (skip check in dev/preview mode)
  if (!isAllowedEnv) {
    if (!user) {
      throw new Error("Unauthorized");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      throw new Error("Only admins can use model comparison");
    }
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
 * Always returns true in development mode
 */
export async function canAccessModelComparison(): Promise<boolean> {
  // Allow in development mode
  // Allow in development and preview modes
  const isDevelopment =
    process.env.NODE_ENV === 'development' ||
    process.env.VERCEL_ENV === 'preview';

  if (isDevelopment) return true;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Only admins, not teachers
  return profile?.role === "admin";
}
