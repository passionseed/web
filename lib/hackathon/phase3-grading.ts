/**
 * Phase 3 grading utilities.
 *
 * Phase 3 uses a different scoring model from linear activities:
 *   - Teams iterate cycles to improve scores (max 100 per category).
 *   - Only the BEST score per category counts toward the team total.
 *   - Phase 3 scores are ADDED to existing linear-activity scores.
 *
 * Categories:
 *   'cycle'         — from hackathon_phase3_cycles (ai_score or mentor_score)
 *   'midphase'      — from hackathon_phase3_midphase_synthesis
 *   'video'         — from hackathon_phase3_video_submissions
 *   'module_quiz'   — from hackathon_phase3_module_progress quiz scores
 *   'daily_checkin' — from hackathon_phase3_daily_checkins (future)
 */

export type Phase3ScoreCategory =
  | "cycle"
  | "midphase"
  | "video"
  | "module_quiz"
  | "daily_checkin";

export type Phase3ScoredBy = "ai" | "mentor" | "judge" | "system";

export type CycleScorecard = {
  hypothesis_quality: number;
  variable_isolation: number;
  behavioral_evidence: number;
  tester_freshness: number;
  synthesis_honesty: number;
  total: number;
};

export type Phase3ScoreEvent = {
  id: string;
  team_id: string;
  source_table: string;
  source_id: string;
  score_category: Phase3ScoreCategory;
  points_awarded: number;
  points_possible: number;
  scored_by: Phase3ScoredBy;
  scored_by_id: string | null;
  scored_at: string;
  raw_score: Record<string, unknown> | null;
  created_at: string;
};

/**
 * Parse a cycle scorecard from the JSONB ai_score or mentor_score.
 * Returns a normalized scorecard with defaults of 0.
 */
export function parseCycleScorecard(raw: Record<string, unknown> | null): CycleScorecard {
  const get = (key: string) => {
    if (!raw) return 0;
    const v = raw[key];
    if (typeof v === "number") return Math.max(0, v);
    const parsed = typeof v === "string" ? Number(v) : NaN;
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };

  const hypothesis_quality = get("hypothesis_quality");
  const variable_isolation = get("variable_isolation");
  const behavioral_evidence = get("behavioral_evidence");
  const tester_freshness = get("tester_freshness");
  const synthesis_honesty = get("synthesis_honesty");

  return {
    hypothesis_quality,
    variable_isolation,
    behavioral_evidence,
    tester_freshness,
    synthesis_honesty,
    total:
      hypothesis_quality +
      variable_isolation +
      behavioral_evidence +
      tester_freshness +
      synthesis_honesty,
  };
}

/**
 * Build a structured scorecard JSONB for a cycle.
 * Used when AI grading or mentor review produces a cycle score.
 */
export function buildCycleScorecard(input: {
  hypothesis_quality?: number;
  variable_isolation?: number;
  behavioral_evidence?: number;
  tester_freshness?: number;
  synthesis_honesty?: number;
}): CycleScorecard & Record<string, number> {
  const card = parseCycleScorecard(input as Record<string, unknown>);
  return {
    ...card,
    ...input,
  };
}

/**
 * Normalize a Phase 3 score into 0..100 range.
 */
export function normalizePhase3Score(
  value: unknown,
  pointsPossible = 100
): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(Math.round(parsed), pointsPossible));
}

/**
 * Format cycle data for an AI grading prompt.
 */
export function formatCycleForPrompt(cycle: {
  cycle_number: number;
  hypothesis_who: string | null;
  hypothesis_will_do: string | null;
  hypothesis_because: string | null;
  hypothesis_measured_by: string | null;
  variable_changed: string | null;
  prior_variable: string | null;
  pretotype_method: string | null;
  pretotype_description: string | null;
  synthesis_result: string | null;
  synthesis_what_changed: string | null;
  synthesis_honest_wrongness: string | null;
}): string {
  const parts: string[] = [];
  parts.push(`Cycle #${cycle.cycle_number}`);

  const hypothesis = [
    cycle.hypothesis_who,
    cycle.hypothesis_will_do,
    cycle.hypothesis_because,
    cycle.hypothesis_measured_by,
  ]
    .filter(Boolean)
    .join(" ");
  if (hypothesis) parts.push(`Hypothesis: ${hypothesis}`);

  if (cycle.variable_changed) {
    parts.push(`Variable changed: ${cycle.variable_changed}`);
  }
  if (cycle.prior_variable) {
    parts.push(`Prior variable: ${cycle.prior_variable}`);
  }
  if (cycle.pretotype_method) {
    parts.push(`Pretotype method: ${cycle.pretotype_method}`);
  }
  if (cycle.pretotype_description) {
    parts.push(`Pretotype description: ${cycle.pretotype_description}`);
  }
  if (cycle.synthesis_result) {
    parts.push(`Synthesis result: ${cycle.synthesis_result}`);
  }
  if (cycle.synthesis_what_changed) {
    parts.push(`What changed: ${cycle.synthesis_what_changed}`);
  }
  if (cycle.synthesis_honest_wrongness) {
    parts.push(`Honest wrongness: ${cycle.synthesis_honest_wrongness}`);
  }

  return parts.join("\n");
}

/**
 * Format test session data for an AI grading prompt.
 */
export function formatTestSessionForPrompt(session: {
  tester_name: string;
  tester_role: string | null;
  tester_channel: string | null;
  fresh_tester: boolean;
  session_result: string | null;
  behavior_log: Record<string, unknown>[] | null;
  painful_detail: string | null;
  unprompted_quotes: string[] | null;
}): string {
  const parts: string[] = [];
  parts.push(`Tester: ${session.tester_name}`);
  if (session.tester_role) parts.push(`Role: ${session.tester_role}`);
  if (session.tester_channel) parts.push(`Channel: ${session.tester_channel}`);
  parts.push(`Fresh tester: ${session.fresh_tester ? "yes" : "no"}`);
  if (session.session_result) parts.push(`Result: ${session.session_result}`);

  const quotes = session.unprompted_quotes ?? [];
  if (quotes.length > 0) {
    parts.push("Quotes:");
    quotes.forEach((q) => parts.push(`  - "${q}"`));
  }

  if (session.painful_detail) {
    parts.push(`Painful detail: ${session.painful_detail}`);
  }

  const logs = session.behavior_log ?? [];
  if (logs.length > 0) {
    parts.push("Behavior log:");
    logs.forEach((entry) => {
      const text = typeof entry.text === "string" ? entry.text : JSON.stringify(entry);
      parts.push(`  - ${text}`);
    });
  }

  return parts.join("\n");
}

/**
 * Format mid-phase synthesis for an AI grading prompt.
 */
export function formatMidphaseForPrompt(synthesis: {
  what_learned: string | null;
  what_changed: string | null;
  what_wrong: string | null;
  next_hypothesis: string | null;
  confidence_score: number | null;
}): string {
  const parts: string[] = [];
  if (synthesis.what_learned) parts.push(`What learned: ${synthesis.what_learned}`);
  if (synthesis.what_changed) parts.push(`What changed: ${synthesis.what_changed}`);
  if (synthesis.what_wrong) parts.push(`What was wrong: ${synthesis.what_wrong}`);
  if (synthesis.next_hypothesis) parts.push(`Next hypothesis: ${synthesis.next_hypothesis}`);
  if (synthesis.confidence_score != null) {
    parts.push(`Confidence: ${synthesis.confidence_score}/10`);
  }
  return parts.join("\n");
}

/**
 * Build a Phase 3 score prompt for the AI grader.
 * This is a specialized prompt that evaluates hypothesis-testing rigor.
 */
export function buildPhase3GradingPrompt(params: {
  entityType: "cycle" | "cycle_step" | "test_session" | "midphase" | "video";
  entityData: Record<string, unknown>;
  priorScores?: Phase3ScoreEvent[] | null;
}): string {
  const { entityType, entityData, priorScores } = params;

  const priorSection =
    priorScores && priorScores.length > 0
      ? `=== PRIOR SCORES (best per category) ===\n${priorScores
          .map(
            (s) =>
              `  ${s.score_category}: ${s.points_awarded}/${s.points_possible} (${s.scored_by})`
          )
          .join("\n")}`
      : "";

  const rubricByType: Record<string, string> = {
    cycle: `Score each dimension 0-20 (total 0-100):
- hypothesis_quality (0-20): Is the hypothesis falsifiable, specific, and non-obvious?
- variable_isolation (0-20): Did they change exactly ONE variable per cycle?
- behavioral_evidence (0-20): Do they have concrete behavioral observations, not just opinions?
- tester_freshness (0-20): Are they testing with fresh testers (not friends/team members)?
- synthesis_honesty (0-20): Did they honestly report what happened, including negative results?`,

    cycle_step: `Evaluate the quality of this cycle step submission:
- hypothesis: Is the hypothesis well-formed and testable?
- pretotype: Is the pretotype method appropriate and clearly described?
- test_session: Are test sessions well-documented with behavioral evidence?
- synthesis: Is the synthesis honest and data-driven?`,

    test_session: `Score this test session 0-100:
- Fresh tester bonus (0-30): Using someone who hasn't been tested before
- Behavioral depth (0-35): Specific behaviors observed, not just opinions
- Result clarity (0-35): Clear confirmed/killed/unclear with evidence`,

    midphase: `Score this mid-phase synthesis 0-100:
- Learning depth (0-40): Did they extract real insights from cycles?
- Pattern recognition (0-30): Can they identify what changed across cycles?
- Forward clarity (0-30): Is the next hypothesis clearly grounded in evidence?`,

    video: `Score this video submission 0-100:
- Story clarity (0-30): Clear problem-insight-solution narrative
- Evidence integration (0-40): Concrete data from test cycles woven in
- Delivery (0-30): Engaging, authentic, not performative`,
  };

  const entitySection = (() => {
    switch (entityType) {
      case "cycle":
        return formatCycleForPrompt(entityData as any);
      case "test_session":
        return formatTestSessionForPrompt(entityData as any);
      case "midphase":
        return formatMidphaseForPrompt(entityData as any);
      default:
        return JSON.stringify(entityData, null, 2);
    }
  })();

  return [
    "You are a hackathon mentor grading Phase 3 (Interactive Sprint Loop) work.",
    "Score rigorously. Partial credit is fine. Be specific about what needs improvement.",
    "",
    "=== ENTITY ===",
    entitySection,
    "",
    priorSection,
    "",
    "=== RUBRIC ===",
    rubricByType[entityType] ?? rubricByType.cycle,
    "",
    "=== OUTPUT FORMAT ===",
    "Return ONLY a JSON object:",
    "```json",
    "{",
    '  "scorecard": {',
    '    "hypothesis_quality": <number>,',
    '    "variable_isolation": <number>,',
    '    "behavioral_evidence": <number>,',
    '    "tester_freshness": <number>,',
    '    "synthesis_honesty": <number>,',
    '    "total": <sum of above>',
    "  },",
    '  "feedback": "<2-3 paragraph student-facing feedback>",',
    '  "reasoning": "<admin-only grading rationale>"',
    "}",
    "```",
  ]
    .filter(Boolean)
    .join("\n");
}
