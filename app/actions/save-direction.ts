"use server";

import { createClient } from "@/utils/supabase/server";
import { AssessmentAnswers, DirectionFinderResult } from "@/types/direction-finder";

export async function saveDirectionFinderResult(
  answers: AssessmentAnswers,
  result: DirectionFinderResult
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("direction_finder_results")
    .insert({
      user_id: user.id,
      answers,
      result,
    })
    .select()
    .single();

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

  return data as { id: string; user_id: string; answers: AssessmentAnswers; result: DirectionFinderResult; created_at: string };
}
