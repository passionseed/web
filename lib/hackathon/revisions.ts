export type RevisionReview = {
  status: "pending_review" | "passed" | "revision_required";
  score_awarded: number | null;
  points_possible: number | null;
  feedback: string;
  reasoning: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

export type RevisionEntry = {
  n: number;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[] | null;
  submitted_at: string | null;
  review: RevisionReview | null;
};

type CurrentRow = {
  id: string;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[] | null;
  submitted_at: string | null;
  revisions: RevisionEntry[] | null;
  status: string | null;
} | null;

/**
 * Build a revision snapshot from the current submission row + its latest review (if any).
 * Returns null if the row has no meaningful content yet (first-time submission).
 */
export function buildRevisionSnapshot(
  current: CurrentRow,
  currentReview: {
    review_status: string;
    score_awarded: number | null;
    points_possible: number | null;
    feedback: string | null;
    reviewed_by_user_id: string | null;
    reviewed_at: string | null;
  } | null
): RevisionEntry | null {
  if (!current) return null;
  const hasContent =
    (current.text_answer && current.text_answer.trim().length > 0) ||
    !!current.image_url ||
    (current.file_urls && current.file_urls.length > 0);
  if (!hasContent) return null;

  const n = (current.revisions?.length ?? 0) + 1;

  return {
    n,
    text_answer: current.text_answer ?? null,
    image_url: current.image_url ?? null,
    file_urls: current.file_urls ?? null,
    submitted_at: current.submitted_at ?? null,
    review: currentReview
      ? {
          status: currentReview.review_status as RevisionReview["status"],
          score_awarded: currentReview.score_awarded,
          points_possible: currentReview.points_possible,
          feedback: currentReview.feedback ?? "",
          reasoning: null,
          reviewed_by: currentReview.reviewed_by_user_id,
          reviewed_at: currentReview.reviewed_at,
        }
      : null,
  };
}

/**
 * Fetch the current row + its latest review, and return the next `revisions`
 * array that should be written on resubmit.
 */
export async function computeNextRevisions(
  supabase: any,
  opts:
    | { scope: "individual"; participantId: string; activityId: string }
    | { scope: "team"; teamId: string; activityId: string }
): Promise<RevisionEntry[]> {
  const table =
    opts.scope === "individual"
      ? "hackathon_phase_activity_submissions"
      : "hackathon_phase_activity_team_submissions";

  const query = supabase
    .from(table)
    .select("id, text_answer, image_url, file_urls, submitted_at, revisions, status")
    .eq("activity_id", opts.activityId);

  const filtered =
    opts.scope === "individual"
      ? query.eq("participant_id", opts.participantId)
      : query.eq("team_id", opts.teamId);

  const { data: current } = await filtered.maybeSingle();

  if (!current) return [];

  const scopeFilter =
    opts.scope === "individual"
      ? { column: "individual_submission_id", value: current.id }
      : { column: "team_submission_id", value: current.id };

  const { data: review } = await supabase
    .from("hackathon_submission_reviews")
    .select("review_status, score_awarded, points_possible, feedback, reviewed_by_user_id, reviewed_at")
    .eq(scopeFilter.column, scopeFilter.value)
    .maybeSingle();

  const snapshot = buildRevisionSnapshot(current as any, (review as any) ?? null);
  const prior = Array.isArray(current.revisions) ? (current.revisions as RevisionEntry[]) : [];
  return snapshot ? [...prior, snapshot] : prior;
}
