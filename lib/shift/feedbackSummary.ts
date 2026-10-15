import type { ShiftFeedbackRow } from "@/lib/supabase/shift-feedback";

/**
 * Totals for /admin/shift/feedback. Counts keep every value that appears,
 * including ones no longer in the form (e.g. next step "project_club"), so
 * old rows never vanish from the totals.
 */

export type Counts = Record<string, number>;

export interface FeedbackSummary {
  responses: number;
  /** Mean per score, or null with no responses. */
  averages: Record<"satisfaction" | "confidence" | "ownership" | "recommend", number | null>;
  /** Each 0 to 10 recommend score as given, for small rounds where a mean hides too much. */
  recommendScores: number[];
  motivation: Counts;
  priceFit: Counts;
  payer: Counts;
  nextSteps: Counts;
  continueProject: Counts;
  availableDays: Counts;
  /** Responses that answered the alumni ask (rows after 2026-10-14). */
  alumniAnswered: number;
}

function count(values: (string | null | undefined)[]): Counts {
  const counts: Counts = {};
  for (const value of values) {
    if (value) counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function summarizeFeedback(rows: ShiftFeedbackRow[]): FeedbackSummary {
  const scores = (key: "satisfaction" | "confidence" | "ownership" | "recommend") => rows.map((r) => r[key]);
  return {
    responses: rows.length,
    averages: {
      satisfaction: mean(scores("satisfaction")),
      confidence: mean(scores("confidence")),
      ownership: mean(scores("ownership")),
      recommend: mean(scores("recommend")),
    },
    recommendScores: scores("recommend").sort((a, b) => a - b),
    motivation: count(rows.map((r) => r.motivation)),
    priceFit: count(rows.map((r) => r.price_fit)),
    payer: count(rows.map((r) => r.payer)),
    nextSteps: count(rows.flatMap((r) => r.next_steps)),
    continueProject: count(rows.map((r) => r.continue_project)),
    availableDays: count(rows.flatMap((r) => r.available_days ?? [])),
    alumniAnswered: rows.filter((r) => r.continue_project !== null).length,
  };
}
