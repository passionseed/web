import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(
    process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type GradingPrompt = {
  id: string;
  prompt_key: string;
  name: string;
  template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by_user_id: string | null;
};

export type CalibrationExample = {
  ai_status: string;
  ai_score: number | null;
  ai_feedback: string;
  final_status: string;
  final_score: number | null;
  final_feedback: string;
  overridden_at: string;
};

export async function getActiveGradingPrompt(
  promptKey = "default"
): Promise<GradingPrompt | null> {
  const { data } = await getClient()
    .from("hackathon_ai_grading_prompts")
    .select("*")
    .eq("prompt_key", promptKey)
    .eq("is_active", true)
    .single();
  return (data as GradingPrompt) ?? null;
}

export async function updateGradingPrompt(
  promptKey: string,
  template: string,
  userId?: string
): Promise<GradingPrompt> {
  const { data, error } = await getClient()
    .from("hackathon_ai_grading_prompts")
    .update({
      template,
      updated_at: new Date().toISOString(),
      updated_by_user_id: userId ?? null,
    })
    .eq("prompt_key", promptKey)
    .select("*")
    .single();
  if (error) throw error;
  return data as GradingPrompt;
}

/**
 * Fetch recent admin override examples for a given activity.
 * These are used to calibrate the AI grader — showing the model
 * cases where a human disagreed with the AI draft.
 *
 * @param activityId - The hackathon_phase_activities.id
 * @param limit - Max examples to return (default 3)
 * @returns Array of calibration examples, newest first
 */
export async function getCalibrationExamples(
  activityId: string,
  limit = 3
): Promise<CalibrationExample[]> {
  const client = getClient();

  // We need to find reviews whose submission belongs to this activity.
  // Reviews link to either individual or team submissions, each of which
  // has an activity_id. We query both and union the results.
  const [individualSubmissions, teamSubmissions] = await Promise.all([
    client
      .from("hackathon_phase_activity_submissions")
      .select("id")
      .eq("activity_id", activityId)
      .then((r) => (r.data ?? []).map((row) => row.id)),
    client
      .from("hackathon_phase_activity_team_submissions")
      .select("id")
      .eq("activity_id", activityId)
      .then((r) => (r.data ?? []).map((row) => row.id)),
  ]);

  const [individualResult, teamResult] = await Promise.all([
    individualSubmissions.length > 0
      ? client
          .from("hackathon_submission_reviews")
          .select("override_log, reviewed_at")
          .not("override_log", "is", null)
          .eq("submission_scope", "individual")
          .in("individual_submission_id", individualSubmissions)
          .order("reviewed_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    teamSubmissions.length > 0
      ? client
          .from("hackathon_submission_reviews")
          .select("override_log, reviewed_at")
          .not("override_log", "is", null)
          .eq("submission_scope", "team")
          .in("team_submission_id", teamSubmissions)
          .order("reviewed_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const rows = [
    ...(individualResult.data ?? []),
    ...(teamResult.data ?? []),
  ];

  // Flatten all override_log entries, sort by overridden_at desc, take limit
  const examples: CalibrationExample[] = rows
    .flatMap((row) => {
      const log = row.override_log as unknown as Array<Record<string, unknown>> | null;
      if (!Array.isArray(log)) return [];
      return log
        .filter(
          (entry): entry is Record<string, unknown> =>
            entry != null && typeof entry === "object"
        )
        .map((entry) => ({
          ai_status: String(entry.ai_status ?? ""),
          ai_score:
            typeof entry.ai_score === "number" ? entry.ai_score : null,
          ai_feedback: String(entry.ai_feedback ?? ""),
          final_status: String(entry.final_status ?? ""),
          final_score:
            typeof entry.final_score === "number" ? entry.final_score : null,
          final_feedback: String(entry.final_feedback ?? ""),
          overridden_at: String(entry.overridden_at ?? ""),
        }));
    })
    .filter((ex) => ex.overridden_at)
    .sort(
      (a, b) =>
        new Date(b.overridden_at).getTime() -
        new Date(a.overridden_at).getTime()
    )
    .slice(0, limit);

  return examples;
}

/**
 * Format calibration examples for inclusion in a grading prompt.
 */
export function formatCalibrationExamples(examples: CalibrationExample[]): string {
  if (examples.length === 0) return "";

  const lines = examples.map((ex, idx) => {
    const aiScore = ex.ai_score != null ? `${ex.ai_score}` : "null";
    const finalScore = ex.final_score != null ? `${ex.final_score}` : "null";
    return [
      `Example ${idx + 1}:`,
      `  AI said:    ${ex.ai_status} (score=${aiScore})`,
      `  AI feedback: ${ex.ai_feedback.slice(0, 200)}${ex.ai_feedback.length > 200 ? "…" : ""}`,
      `  Admin said: ${ex.final_status} (score=${finalScore})`,
      `  Admin feedback: ${ex.final_feedback.slice(0, 200)}${ex.final_feedback.length > 200 ? "…" : ""}`,
    ].join("\n");
  });

  return [
    "=== CALIBRATION EXAMPLES (admin overrides) ===",
    "The following are real cases where a human admin disagreed with the AI draft.",
    "Use these to align your grading with human judgment:",
    "",
    ...lines,
    "",
  ].join("\n");
}
