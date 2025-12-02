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
