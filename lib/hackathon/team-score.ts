/**
 * Recalculates a team's total score from all passed reviews and upserts hackathon_team_scores.
 *
 * Scoring rules:
 *   - Only count PASSED reviews
 *   - Only count the BEST score per activity (max score_awarded)
 *   - Team-scoped activities: full score_awarded
 *   - Individual-scoped activities: score_awarded / member_count (each member's best)
 *
 * This is the single source of truth — both the leaderboard and team submissions
 * views read from hackathon_team_scores.
 */
export async function recalculateAndUpsertTeamScore(
  serviceClient: any,
  teamId: string
): Promise<void> {
  // Fetch member count
  const { data: members } = await serviceClient
    .from("hackathon_team_members")
    .select("participant_id")
    .eq("team_id", teamId);

  const memberCount = (members ?? []).length;
  if (memberCount === 0) return;

  const memberIds: string[] = (members ?? []).map((m: any) => m.participant_id);

  // Fetch all activity scopes
  const { data: activities } = await serviceClient
    .from("hackathon_phase_activities")
    .select("id, submission_scope");

  const scopeByActivityId = new Map<string, string>();
  for (const act of activities ?? []) {
    scopeByActivityId.set(act.id, act.submission_scope);
  }

  // Fetch passed team reviews for this team (best per activity)
  const { data: teamReviews } = await serviceClient
    .from("hackathon_submission_reviews")
    .select(`
      score_awarded,
      hackathon_phase_activity_team_submissions!team_submission_id(team_id, activity_id)
    `)
    .eq("review_status", "passed")
    .not("team_submission_id", "is", null);

  const bestTeamScoreByActivity = new Map<string, number>();
  for (const rev of teamReviews ?? []) {
    const sub = rev.hackathon_phase_activity_team_submissions;
    if (!sub || sub.team_id !== teamId) continue;
    const actId = sub.activity_id;
    const score = rev.score_awarded ?? 0;
    const current = bestTeamScoreByActivity.get(actId) ?? 0;
    if (score > current) bestTeamScoreByActivity.set(actId, score);
  }

  // Fetch passed individual reviews for members of this team (best per participant per activity)
  const { data: individualReviews } = memberIds.length > 0
    ? await serviceClient
        .from("hackathon_submission_reviews")
        .select(`
          score_awarded,
          hackathon_phase_activity_submissions!individual_submission_id(participant_id, activity_id)
        `)
        .eq("review_status", "passed")
        .not("individual_submission_id", "is", null)
    : { data: [] };

  // participantId -> activityId -> best score
  const bestIndividualScore = new Map<string, Map<string, number>>();
  for (const rev of individualReviews ?? []) {
    const sub = rev.hackathon_phase_activity_submissions;
    if (!sub || !memberIds.includes(sub.participant_id)) continue;
    const pid = sub.participant_id;
    const actId = sub.activity_id;
    const score = rev.score_awarded ?? 0;
    const byActivity = bestIndividualScore.get(pid) ?? new Map();
    const current = byActivity.get(actId) ?? 0;
    if (score > current) byActivity.set(actId, score);
    bestIndividualScore.set(pid, byActivity);
  }

  // Calculate total score
  let total = 0;

  // Team-scoped: full score per activity
  for (const [actId, score] of bestTeamScoreByActivity) {
    if (scopeByActivityId.get(actId) === "team") {
      total += score;
    }
  }

  // Individual-scoped: each member's best score / member_count
  for (const pid of memberIds) {
    const byActivity = bestIndividualScore.get(pid) ?? new Map();
    for (const [actId, score] of byActivity) {
      if (scopeByActivityId.get(actId) === "individual") {
        total += Math.floor(score / memberCount);
      }
    }
  }

  await serviceClient
    .from("hackathon_team_scores")
    .upsert({ team_id: teamId, total_score: total }, { onConflict: "team_id" });
}
