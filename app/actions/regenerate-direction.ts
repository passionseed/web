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
 * Only accessible by admin users
 */
export async function regenerateDirectionProfile(
  answers: AssessmentAnswers,
  chatHistory: { role: "user" | "assistant"; content: string }[],
  modelIds: string[],
  language: "en" | "th" = "en"
): Promise<RegenerateResult[]> {
  const supabase = await createClient();

  // Check if user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "teacher") {
    throw new Error("Only admins and teachers can use model comparison");
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
 */
export async function canAccessModelComparison(): Promise<boolean> {
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

  return profile?.role === "admin" || profile?.role === "teacher";
}
