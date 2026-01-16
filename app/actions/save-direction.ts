"use server";

import { createClient } from "@/utils/supabase/server";
import { AssessmentAnswers, DirectionFinderResult, Message } from "@/types/direction-finder";
import { summarizeConversation } from "@/lib/ai/conversationEngine";

export async function saveDirectionFinderResult(
  answers: AssessmentAnswers,
  result: DirectionFinderResult | null,
  chatHistory?: Message[],
  id?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  let chatContext = "";
  let currentData = null;

  if (id) {
    // Fetch existing record to check for changes
    const { data } = await supabase
      .from("direction_finder_results")
      .select("*")
      .eq("id", id)
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

  if (shouldRegenerateSummary && chatHistory && chatHistory.length > 0) {
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

    if (isAnswersSame && isResultSame && isHistorySame && isContextSame) {
      console.log("No changes detected, skipping save for ID:", id);
      return currentData; // Skip DB update
    }
  }

  let query;

  if (id) {
    // Update existing record
    query = supabase
      .from("direction_finder_results")
      .update({
        answers,
        result,
        chat_history: safeHistory,
        chat_context: chatContext,
      })
      .eq("id", id)
      .eq("user_id", user.id);
  } else {
    // Insert new record
    query = supabase.from("direction_finder_results").insert({
      user_id: user.id,
      answers,
      result,
      chat_history: safeHistory,
      chat_context: chatContext,
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

  return data as { id: string; user_id: string; answers: AssessmentAnswers; result: DirectionFinderResult; chat_history: Message[]; created_at: string };
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

  return data as { id: string; user_id: string; answers: AssessmentAnswers; result: DirectionFinderResult; chat_history: Message[]; created_at: string };
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

  return data as { id: string; user_id: string; answers: AssessmentAnswers; result: DirectionFinderResult; chat_history: Message[]; created_at: string }[];
}
