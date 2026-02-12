"use server";

import { createHash } from "crypto";
import { createClient } from "@/utils/supabase/server";
import {
  AssessmentAnswers,
  DirectionFinderResult,
  DirectionSaveOptions,
  Message,
} from "@/types/direction-finder";
import { summarizeConversation } from "@/lib/ai/conversationEngine";

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeJson(item));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return entries.reduce<Record<string, unknown>>((acc, [key, nestedValue]) => {
      acc[key] = canonicalizeJson(nestedValue);
      return acc;
    }, {});
  }
  return value;
}

export function buildDirectionFinderCacheKey(
  answers: AssessmentAnswers,
  modelName: string,
): string {
  const normalizedAnswers = canonicalizeJson(answers);
  return `${createHash("md5").update(JSON.stringify(normalizedAnswers)).digest("hex")}_${modelName}`;
}

export function buildDirectionSavePayload(params: {
  answers: AssessmentAnswers;
  result: DirectionFinderResult | null;
  safeHistory: Message[];
  chatContext: string;
  options?: DirectionSaveOptions;
}): Record<string, unknown> {
  const { answers, result, safeHistory, chatContext, options } = params;
  const payload: Record<string, unknown> = {
    answers,
    result,
    chat_history: safeHistory,
    chat_context: chatContext,
  };

  if (options?.modelName) {
    payload.model_name = options.modelName;
    payload.cache_key = buildDirectionFinderCacheKey(answers, options.modelName);
  }
  if (options?.isCached !== undefined) payload.is_cached = options.isCached;
  if (options?.originalResultId) payload.original_result_id = options.originalResultId;
  if (options?.generationSessionId) {
    payload.generation_session_id = options.generationSessionId;
  }

  return payload;
}

export async function saveDirectionFinderResult(
  answers: AssessmentAnswers,
  result: DirectionFinderResult | null,
  chatHistory?: Message[],
  id?: string,
  options?: DirectionSaveOptions,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  let chatContext = "";
  let currentData: any = null;
  let effectiveId = id;

  if (!effectiveId && options?.generationSessionId) {
    const { data: existingBySession } = await supabase
      .from("direction_finder_results")
      .select("*")
      .eq("user_id", user.id)
      .eq("generation_session_id", options.generationSessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingBySession) {
      currentData = existingBySession;
      effectiveId = existingBySession.id;
    }
  }

  if (effectiveId && !currentData) {
    // Fetch existing record to check for changes
    const { data } = await supabase
      .from("direction_finder_results")
      .select("*")
      .eq("id", effectiveId)
      .single();

    currentData = data;
  }

  // Convert Message[] to jsonb-friendly format
  const safeHistory = chatHistory ? chatHistory : [];

  // Determine if we need to regenerate summary
  let shouldRegenerateSummary = true;

  if (currentData && currentData.chat_history) {
    // Simple check: if lengths and content match, don't regenerate
    const prevHistory = currentData.chat_history as Message[];
    if (prevHistory.length === safeHistory.length) {
      // Deep compare could be expensive, but generally safe for chat history size
      // For now, let's assume if length matches and last message ID matches, it's the same
      // (User edits change ID or content, triggering regeneration)
      const lastPrev = prevHistory[prevHistory.length - 1];
      const lastNew = safeHistory[safeHistory.length - 1];

      if (lastPrev?.id === lastNew?.id && lastPrev?.content === lastNew?.content) {
        shouldRegenerateSummary = false;
        chatContext = currentData.chat_context || ""; // Reuse existing
      }
    }
  }

  const shouldSkipSummary =
    options?.skipSummary || process.env.DIRECTION_FINDER_SKIP_SUMMARY === "true";

  if (!shouldSkipSummary && shouldRegenerateSummary && chatHistory && chatHistory.length > 0) {
    try {
      chatContext = await summarizeConversation(chatHistory, answers);
    } catch (e) {
      console.warn("Failed to summarize conversation:", e);
    }
  }

  // Final check: Did ANYTHING meaningful change?
  if (currentData) {
    const prevHistory = currentData.chat_history as Message[];
    // Compare essential fields
    // Note: We use JSON.stringify for simple deep comparison of objects
    const isAnswersSame = JSON.stringify(currentData.answers) === JSON.stringify(answers);
    const isResultSame = JSON.stringify(currentData.result) === JSON.stringify(result);
    // History comparison (we might have already done partial check, but let's be sure)
    const isHistorySame = JSON.stringify(prevHistory) === JSON.stringify(safeHistory);
    const isContextSame = currentData.chat_context === chatContext;
    const isModelSame = !options?.modelName || currentData.model_name === options.modelName;
    const isSessionSame =
      !options?.generationSessionId ||
      currentData.generation_session_id === options.generationSessionId;

    if (
      isAnswersSame &&
      isResultSame &&
      isHistorySame &&
      isContextSame &&
      isModelSame &&
      isSessionSame
    ) {
      return currentData; // Skip DB update
    }
  }

  let query;
  const payload = buildDirectionSavePayload({
    answers,
    result,
    safeHistory,
    chatContext,
    options,
  });

  if (effectiveId) {
    // Update existing record
    query = supabase
      .from("direction_finder_results")
      .update(payload)
      .eq("id", effectiveId)
      .eq("user_id", user.id);
  } else {
    // Insert new record
    query = supabase.from("direction_finder_results").insert({
      user_id: user.id,
      ...payload,
    });
  }

  const { data, error } = await query.select().single();

  if (error) {
    console.error("Error saving direction finder result:", error);
    throw new Error("Failed to save result");
  }

  return data;
}

// DEV ONLY: Get all saved direction finder results (for loading previous sessions)
export async function getDirectionFinderResults(limit = 10) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("direction_finder_results")
    .select("id, user_id, result, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching direction finder results:", error);
    throw new Error("Failed to fetch results");
  }

  return data;
}

// DEV ONLY: Get a specific direction finder result by ID
export async function getDirectionFinderResultById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("direction_finder_results")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching direction finder result:", error);
    throw new Error("Failed to fetch result");
  }

  return data as { id: string; user_id: string; answers: AssessmentAnswers; result: DirectionFinderResult; chat_history: Message[]; created_at: string; updated_at: string };
}

/**
 * Get the current authenticated user's ID
 * Used for model selection and metrics tracking
 *
 * @returns User ID or null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id || null;
}

export async function getUserDirectionFinderResult() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("direction_finder_results")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error("Error fetching user direction finder result:", error);
    return null;
  }

  return data as { id: string; user_id: string; answers: AssessmentAnswers; result: DirectionFinderResult; chat_history: Message[]; created_at: string; updated_at: string };
}

export async function getAllUserDirectionFinderResults() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("direction_finder_results")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all user direction finder results:", error);
    return [];
  }

  return data as { id: string; user_id: string; answers: AssessmentAnswers; result: DirectionFinderResult; chat_history: Message[]; created_at: string; updated_at: string }[];
}

/**
 * Find a cached Direction Finder result based on answers and model name
 * Returns the most recent matching result within a 7-day cache window
 * This significantly reduces AI generation load during high-concurrency scenarios
 *
 * @param answers - The assessment answers to look up
 * @param modelName - The AI model name used for generation (default: gemini-2.5-flash)
 * @returns Cached result if found, null otherwise
 */
export async function findCachedResult(
  answers: AssessmentAnswers,
  modelName: string = 'gemini-2.5-flash'
): Promise<{
  id: string;
  user_id: string;
  answers: AssessmentAnswers;
  result: DirectionFinderResult;
  created_at: string;
  updated_at: string;
  model_name: string;
  is_cached: boolean;
  cache_hit_count: number;
  original_result_id: string | null;
} | null> {
  const supabase = await createClient();

  // Call the PostgreSQL function to find cached result
  const { data, error } = await supabase.rpc('find_cached_direction_result', {
    p_answers: answers,
    p_model_name: modelName
  });

  if (error) {
    console.error("Error finding cached result:", error);
    return null;
  }

  // If no cached result found, return null
  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as {
    id: string;
    user_id: string;
    answers: AssessmentAnswers;
    result: DirectionFinderResult;
    created_at: string;
    updated_at: string;
    model_name: string;
    is_cached: boolean;
    cache_hit_count: number;
    original_result_id: string | null;
  };
}

/**
 * Increment the cache hit count for a result when it's served from cache
 * This helps track cache effectiveness and popular assessment patterns
 *
 * @param resultId - The ID of the cached result being reused
 */
export async function incrementCacheHitCount(resultId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('increment_cache_hit_count', {
    p_result_id: resultId
  });

  if (error) {
    console.error("Error incrementing cache hit count:", error);
  }
}
